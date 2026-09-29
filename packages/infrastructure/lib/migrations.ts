import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

export interface MigrationsProps {
  vpc: ec2.IVpc;
  dbProxyEndpoint: string;
  dbSecret: secretsmanager.ISecret;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class Migrations extends Construct {
  readonly fn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: MigrationsProps) {
    super(scope, id);
    const { vpc, dbProxyEndpoint, dbSecret, dbSecurityGroup } = props;

    const sg = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      description: "Fuel 2.0 migration lambda security group",
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(sg, ec2.Port.tcp(5432), "Allow migration lambda to reach RDS proxy");

    this.fn = new nodejs.NodejsFunction(this, "Fn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "migration", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [sg],
      environment: {
        DB_SECRET_ARN: dbSecret.secretArn,
        DB_PROXY_ENDPOINT: dbProxyEndpoint,
        // Same endpoints as the web Lambda — needed so the migration Lambda
        // can reuse lib/pipelines.ts (which calls fuel-data for Tier 1/2/3
        // resolution during sync).
        FUEL_DATA_OPENSEARCH_ENDPOINT:
          "https://vpc-fuel-search-s5rkumdphtmsr3ydjit3kheyim.us-east-2.es.amazonaws.com",
        FUEL_DATA_NEPTUNE_ENDPOINT:
          "https://fuel-neptune-cluster.cluster-cefvgec5t8lr.us-east-2.neptune.amazonaws.com:8182",
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
        // `server-only` is a Next.js build-time tag that has no runtime
        // implementation. Alias it to a 1-line stub so the code that
        // imports it (lib/pipelines.ts, lib/fuel-data.ts, etc.) bundles
        // cleanly into the Node Lambda.
        esbuildArgs: {
          "--alias:server-only": path.join(__dirname, "..", "lambda", "migration", "server-only-stub.js"),
        },
        minify: true,
        target: "node20",
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (inputDir, outputDir) => [
            `cp -R "${inputDir}/apps/web/src/db/migrations" "${outputDir}/migrations"`,
          ],
        },
      },
    });
    dbSecret.grantRead(this.fn);

    // Neptune data-plane access so reconcile / ad-hoc pipeline sync can do
    // the same Tier 1/2/3 fuel-data lookups the web Lambda does. Same
    // cluster resource + read-only actions.
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["neptune-db:connect", "neptune-db:ReadDataViaQuery", "neptune-db:GetQueryStatus"],
        resources: [
          `arn:aws:neptune-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster-63HHOESKS2YN3JMITHUOMIJHSU/*`,
        ],
      }),
    );

    // Bedrock — Haiku for signal extraction (retroExtract event) and Titan
    // v2 for re-embedding context items. Mirror of the web Lambda grant.
    const bedrockRegion = cdk.Stack.of(this).region;
    const bedrockAccount = cdk.Stack.of(this).account;
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Converse",
          "bedrock:ConverseStream",
        ],
        resources: [
          `arn:aws:bedrock:${bedrockRegion}:${bedrockAccount}:inference-profile/us.anthropic.claude-haiku-4-5*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5*`,
          `arn:aws:bedrock:${bedrockRegion}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    );
  }
}
