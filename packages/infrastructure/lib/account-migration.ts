import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

export interface AccountMigrationProps {
  vpc: ec2.IVpc;
  dbProxyEndpoint: string;
  dbSecret: secretsmanager.ISecret;
  dbSecurityGroup: ec2.SecurityGroup;
  legacyAccountId: string;
  /** Fuel 1.0 DDB table suffix `<appSyncId>-<env>`. Stage and prod each
   *  pull from their own legacy data — never the other's. */
  legacySuffix: string;
}

export class AccountMigration extends Construct {
  readonly fn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: AccountMigrationProps) {
    super(scope, id);
    const { vpc, dbProxyEndpoint, dbSecret, dbSecurityGroup, legacyAccountId, legacySuffix } = props;

    const sg = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      description: "Fuel 2.0 account migration lambda",
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(sg, ec2.Port.tcp(5432), "account migration to RDS proxy");

    this.fn = new nodejs.NodejsFunction(this, "Fn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "account-migration", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [sg],
      environment: {
        DB_SECRET_ARN: dbSecret.secretArn,
        DB_PROXY_ENDPOINT: dbProxyEndpoint,
        LEGACY_SUFFIX: legacySuffix,
      },
      bundling: { externalModules: ["@aws-sdk/*"], minify: true, target: "node20" },
    });

    dbSecret.grantRead(this.fn);

    const tableNames = [
      `Account-${legacySuffix}`,
      `AccountMember-${legacySuffix}`,
      `Team-${legacySuffix}`,
      `TeamMember-${legacySuffix}`,
      // Mirrors Fuel 1.0's `active_account` per-user preference.
      `UserPreferences-${legacySuffix}`,
    ];
    const arns = tableNames.flatMap((t) => [
      `arn:aws:dynamodb:us-east-2:${legacyAccountId}:table/${t}`,
      `arn:aws:dynamodb:us-east-2:${legacyAccountId}:table/${t}/index/*`,
    ]);
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:Query", "dynamodb:GetItem", "dynamodb:BatchGetItem"],
        resources: arns,
      }),
    );
  }
}
