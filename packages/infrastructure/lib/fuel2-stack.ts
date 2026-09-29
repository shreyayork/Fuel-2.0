import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { AccountMigration } from "./account-migration";
import { Auth } from "./auth";
import { Database } from "./database";
import { Migrations } from "./migrations";
import { OnboardEnrichmentQueue } from "./onboard-enrichment-queue";
import { ReconcileCron } from "./reconcile-cron";
import { TechStack } from "./tech-stack";
import { WatchlistMigration } from "./watchlist-migration";
import { WebApp } from "./web-app";

export interface Fuel2StackProps extends cdk.StackProps {
  stage: "stage" | "prod" | "dev";
  domainName: string;
  hostname: string;
  legacyCognitoUserPoolId: string;
  /** Fuel 1.0 AppSync API id; combined with legacyAppSyncEnv to form the
   *  DDB table suffix `<id>-<env>` so stage and prod migrate from their
   *  own data, not someone else's. */
  legacyAppSyncId: string;
  legacyAppSyncEnv: string;
  googleClientId: string;
  googleClientSecret: string;
  certificateArn: string;
}

export class Fuel2Stack extends cdk.Stack {
  readonly vpc: ec2.IVpc;
  readonly webApp: WebApp;

  constructor(scope: Construct, id: string, props: Fuel2StackProps) {
    super(scope, id, props);

    const {
      stage,
      domainName,
      hostname,
      legacyCognitoUserPoolId,
      legacyAppSyncId,
      legacyAppSyncEnv,
      googleClientId,
      googleClientSecret,
      certificateArn,
    } = props;
    const legacySuffix = `${legacyAppSyncId}-${legacyAppSyncEnv}`;
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn,
    );
    const fqdn = `${hostname}.${domainName}`;
    const appUrl = `https://${fqdn}`;

    // CIDR chosen to not overlap fuel-data VPC (10.0.0.0/16) so we can peer.
    const vpcCidr =
      stage === "prod"
        ? "10.30.0.0/16"
        : stage === "stage"
          ? "10.20.0.0/16"
          : "10.10.0.0/16";
    this.vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      maxAzs: 2,
      // VPC Lambdas (migrations, web, crons) call Secrets Manager, DynamoDB,
      // and Bedrock over the public AWS API — they need NAT or VPC endpoints.
      // dev matches stage here; skipping NAT caused ETIMEDOUT on MigrationFn.
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        {
          name: "egress",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const database = new Database(this, "Database", {
      vpc: this.vpc,
      stage,
    });

    const auth = new Auth(this, "Auth", {
      stage,
      googleClientId,
      googleClientSecret,
      appUrl,
      hostedUiPrefix: `fuel2-${stage}`,
    });

    const migrations = new Migrations(this, "Migrations", {
      vpc: this.vpc,
      dbProxyEndpoint: database.proxy.endpoint,
      dbSecret: database.secret,
      dbSecurityGroup: database.securityGroup,
    });

    const watchlistMigration = new WatchlistMigration(
      this,
      "WatchlistMigration",
      {
        vpc: this.vpc,
        dbProxyEndpoint: database.proxy.endpoint,
        dbSecret: database.secret,
        dbSecurityGroup: database.securityGroup,
        legacyAccountId: this.account,
      },
    );

    const accountMigration = new AccountMigration(this, "AccountMigration", {
      vpc: this.vpc,
      dbProxyEndpoint: database.proxy.endpoint,
      dbSecret: database.secret,
      dbSecurityGroup: database.securityGroup,
      legacyAccountId: this.account,
      legacySuffix,
    });

    // Shared secret that lets the cron Lambda call the web app's internal
    // reconcile endpoint. CDK generates + rotates only on recreate.
    const cronTokenSecret = new secretsmanager.Secret(
      this,
      "InternalCronToken",
      {
        description:
          "Shared bearer token for Fuel 2.0 internal cron → web calls",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "token",
          excludePunctuation: true,
          passwordLength: 48,
        },
      },
    );

    const techStack = new TechStack(this, "TechStack");

    this.webApp = new WebApp(this, "Web", {
      vpc: this.vpc,
      stage,
      domainName,
      hostname,
      certificate,
      dbProxyEndpoint: database.proxy.endpoint,
      dbSecret: database.secret,
      dbSecurityGroup: database.securityGroup,
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.userPoolClient.userPoolClientId,
      hostedUiDomain: auth.userPoolDomain.domainName,
      appUrl,
      internalCronTokenSecret: cronTokenSecret,
      techStackFn: techStack.fn,
    });

    // Onboarding: fire-and-forget Fuel 1.0 → 2.0 watchlist migration.
    this.webApp.webFn.addEnvironment(
      "WATCHLIST_MIGRATION_FN_NAME",
      watchlistMigration.fn.functionName,
    );
    watchlistMigration.fn.grantInvoke(this.webApp.webFn);

    const onboardEnrichment = new OnboardEnrichmentQueue(
      this,
      "OnboardEnrichment",
      {
        webFunction: this.webApp.webFn,
        appUrl,
        sharedSecret: cronTokenSecret,
      },
    );
    this.webApp.webFn.addEnvironment(
      "ONBOARD_ENRICHMENT_QUEUE_URL",
      onboardEnrichment.queue.queueUrl,
    );
    onboardEnrichment.queue.grantSendMessages(this.webApp.webFn);

    // HubSpot deal/pipeline reconcile — hourly (UTC). Activity/Intelligence
    // sync is a separate daily cron below.
    new ReconcileCron(this, "ReconcileCron", {
      appUrl,
      stage,
      sharedSecret: cronTokenSecret,
      scheduleExpression: "cron(0 * * * ? *)",
    });

    // HubSpot note/email activity sync → Intelligence/Initiatives.
    // Daily 06:30 UTC ≈ 12:00 IST. Self-chains on backlog (see web handler).
    const hubspotActivitySyncCron = new ReconcileCron(
      this,
      "HubspotActivitySyncCron",
      {
        appUrl,
        stage,
        sharedSecret: cronTokenSecret,
        endpointPath: "/api/cron/sync-hubspot-activities",
        scheduleExpression: "cron(30 6 * * ? *)",
      },
    );
    this.webApp.webFn.addEnvironment(
      "HUBSPOT_ACTIVITY_SYNC_CRON_FN_NAME",
      hubspotActivitySyncCron.fn.functionName,
    );
    hubspotActivitySyncCron.fn.grantInvoke(this.webApp.webFn);

    // Granola meeting sync — daily 06:25 UTC ≈ 11:55 IST.
    new ReconcileCron(this, "GranolaSyncCron", {
      appUrl,
      stage,
      sharedSecret: cronTokenSecret,
      endpointPath: "/api/cron/sync-granola",
      scheduleExpression: "cron(25 6 * * ? *)",
    });

    // Credits daily: clear expired daily blocks + downgrade canceled Pro
    // subscriptions whose Stripe period has ended (webhook safety net).
    new ReconcileCron(this, "CreditsResetCron", {
      appUrl,
      stage,
      sharedSecret: cronTokenSecret,
      endpointPath: "/api/cron/credits-reset",
      scheduleExpression: "cron(15 * * * ? *)",
    });

    // Weekly founder digest — Friday 20:00 UTC ≈ 3PM EST (F20A-167).
    new ReconcileCron(this, "WeeklyDigestCron", {
      appUrl,
      stage,
      sharedSecret: cronTokenSecret,
      endpointPath: "/api/cron/weekly-digest",
      scheduleExpression: "cron(0 20 ? * FRI *)",
    });

    // Quarterly founder profile nudge — 1st of Jan/Apr/Jul/Oct 20:00 UTC.
    // Handler also gates on America/New_York quarter-start day.
    new ReconcileCron(this, "QuarterlyUpdateCron", {
      appUrl,
      stage,
      sharedSecret: cronTokenSecret,
      endpointPath: "/api/cron/quarterly-update",
      scheduleExpression: "cron(0 20 1 1,4,7,10 ? *)",
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "HostedUiDomain", {
      value: `https://${auth.userPoolDomain.domainName}.auth.us-east-2.amazoncognito.com`,
    });
    new cdk.CfnOutput(this, "GoogleRedirectUri", {
      value: `https://${auth.userPoolDomain.domainName}.auth.us-east-2.amazoncognito.com/oauth2/idpresponse`,
    });
    new cdk.CfnOutput(this, "DbProxyEndpoint", {
      value: database.proxy.endpoint,
    });
    new cdk.CfnOutput(this, "WebUrl", { value: appUrl });
    new cdk.CfnOutput(this, "MigrationFnName", {
      value: migrations.fn.functionName,
    });
    new cdk.CfnOutput(this, "WatchlistMigrationFnName", {
      value: watchlistMigration.fn.functionName,
    });
    new cdk.CfnOutput(this, "AccountMigrationFnName", {
      value: accountMigration.fn.functionName,
    });
  }
}
