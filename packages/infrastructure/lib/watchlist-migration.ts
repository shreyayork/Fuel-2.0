import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";
import { LEGACY_TABLES } from "./legacy-watchlist-tables";

export interface WatchlistMigrationProps {
  vpc: ec2.IVpc;
  dbProxyEndpoint: string;
  dbSecret: secretsmanager.ISecret;
  dbSecurityGroup: ec2.SecurityGroup;
  legacyAccountId: string; // for IAM scoping on DynamoDB
}

export class WatchlistMigration extends Construct {
  readonly fn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: WatchlistMigrationProps) {
    super(scope, id);
    const { vpc, dbProxyEndpoint, dbSecret, dbSecurityGroup, legacyAccountId } = props;

    const sg = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      description: "Fuel 2.0 watchlist migration lambda security group",
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(sg, ec2.Port.tcp(5432), "watchlist migration to RDS proxy");

    this.fn = new nodejs.NodejsFunction(this, "Fn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "watchlist-migration", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [sg],
      environment: {
        DB_SECRET_ARN: dbSecret.secretArn,
        DB_PROXY_ENDPOINT: dbProxyEndpoint,
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
        minify: true,
        target: "node20",
      },
    });

    dbSecret.grantRead(this.fn);
    // Account table is required for onboarding path (creator → accountID → watchlists).
    const tableArns = Object.values(LEGACY_TABLES).flatMap((t) => [
      `arn:aws:dynamodb:us-east-2:${legacyAccountId}:table/${t}`,
      `arn:aws:dynamodb:us-east-2:${legacyAccountId}:table/${t}/index/*`,
    ]);
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:Query", "dynamodb:BatchGetItem", "dynamodb:GetItem"],
        resources: tableArns,
      }),
    );
  }
}
