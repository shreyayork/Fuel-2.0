import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface DatabaseProps {
  vpc: ec2.IVpc;
  stage: "stage" | "prod" | "dev";
}

export class Database extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly proxy: rds.DatabaseProxy;
  readonly secret: secretsmanager.ISecret;
  readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);
    const { vpc, stage } = props;

    this.securityGroup = new ec2.SecurityGroup(this, "Sg", {
      vpc,
      description: `Fuel 2.0 ${stage} Aurora security group`,
      allowAllOutbound: false,
    });

    // No explicit secretName — avoids collisions on stack-level Database replacement.
    const credentials = rds.Credentials.fromGeneratedSecret("fuel_app");

    this.cluster = new rds.DatabaseCluster(this, "Cluster", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // 16.4 no longer creatable in us-east-2; live dev/stage already on 16.11.
        version: rds.AuroraPostgresEngineVersion.VER_16_11,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      credentials,
      defaultDatabaseName: "fuel",
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: stage === "prod" ? 8 : 2,
      writer: rds.ClusterInstance.serverlessV2("writer"),
      readers: stage === "prod" ? [rds.ClusterInstance.serverlessV2("reader", { scaleWithWriter: true })] : [],
      removalPolicy: stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.SNAPSHOT,
      storageEncrypted: true,
      backup: {
        retention: cdk.Duration.days(stage === "prod" ? 14 : 3),
      },
    });

    this.secret = this.cluster.secret!;

    this.proxy = new rds.DatabaseProxy(this, "Proxy", {
      proxyTarget: rds.ProxyTarget.fromCluster(this.cluster),
      secrets: [this.secret],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(30),
    });
  }
}
