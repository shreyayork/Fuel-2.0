import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

/** Behavior for a static public file served from the OpenNext assets bucket. */
function s3StaticBehavior(s3Origin: cloudfront.IOrigin): cloudfront.BehaviorOptions {
  return {
    origin: s3Origin,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  };
}

export interface WebAppProps {
  vpc: ec2.IVpc;
  stage: "stage" | "prod" | "dev";
  domainName: string;
  hostname: string;
  certificate: acm.ICertificate;
  dbProxyEndpoint: string;
  dbSecret: secretsmanager.ISecret;
  dbSecurityGroup: ec2.SecurityGroup;
  userPoolId: string;
  userPoolClientId: string;
  hostedUiDomain: string;
  appUrl: string;
  internalCronTokenSecret: secretsmanager.ISecret;
  techStackFn: lambda.IFunction;
}

const OPEN_NEXT_ROOT = path.resolve(__dirname, "..", "..", "..", "apps", "web", ".open-next");

export class WebApp extends Construct {
  readonly distribution: cloudfront.Distribution;
  readonly webFn: lambda.Function;
  readonly webSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: WebAppProps) {
    super(scope, id);
    const {
      vpc,
      stage,
      domainName,
      hostname,
      certificate,
      dbProxyEndpoint,
      dbSecret,
      dbSecurityGroup,
      userPoolId,
      userPoolClientId,
      hostedUiDomain,
      appUrl,
      internalCronTokenSecret,
      techStackFn,
    } = props;

    const fqdn = `${hostname}.${domainName}`;
    const serverFnDir = path.join(OPEN_NEXT_ROOT, "server-functions", "default");
    const assetsDir = path.join(OPEN_NEXT_ROOT, "assets");
    const haveOpenNextBuild = fs.existsSync(serverFnDir) && fs.existsSync(assetsDir);

    const zone = route53.HostedZone.fromLookup(this, "Zone", { domainName });

    const webSg = new ec2.SecurityGroup(this, "WebSg", {
      vpc,
      description: `Fuel 2.0 ${stage} web lambda security group`,
      allowAllOutbound: true,
    });
    this.webSg = webSg;
    dbSecurityGroup.addIngressRule(webSg, ec2.Port.tcp(5432), "Allow web lambda to reach RDS proxy");

    const assetsBucket = new s3.Bucket(this, "Assets", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== "prod",
    });

    if (haveOpenNextBuild) {
      new s3deploy.BucketDeployment(this, "AssetsDeployment", {
        sources: [s3deploy.Source.asset(assetsDir)],
        destinationBucket: assetsBucket,
        prune: true,
      });
    }

    // User-content uploads (currently founder pitch decks; later: financial
    // models, board decks, etc.). Lifecycle separate from the OpenNext
    // assets bucket: private, server-side encrypted, no CloudFront origin.
    // Failed uploads (unbound parts) clean up after 7 days; finished objects
    // are retained until manually deleted.
    const uploadsBucket = new s3.Bucket(this, "Uploads", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== "prod",
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // OAuth secrets, one per integration provider. Each holds a JSON
    // {clientId, clientSecret} under the convention
    // `fuel2-<stage>-<provider>-oauth`. Provisioned out-of-band so values
    // never land in CloudFormation templates. Keep this list in sync with
    // the app-side registry at apps/web/src/lib/integrations/registry.ts.
    const OAUTH_PROVIDERS = ["hubspot", "slack"] as const;
    const oauthSecrets = OAUTH_PROVIDERS.map((id) => ({
      id,
      secret: secretsmanager.Secret.fromSecretNameV2(
        this,
        `${id[0].toUpperCase()}${id.slice(1)}OauthSecret`,
        `fuel2-${stage}-${id}-oauth`,
      ),
    }));

    const oauthEnv: Record<string, string> = {};
    for (const { id, secret } of oauthSecrets) {
      oauthEnv[`${id.toUpperCase()}_SECRET_ARN`] = secret.secretArn;
    }

    // Out-of-band Secrets Manager entries under `fuel2-<stage>-<provider>-api`.
    // Bright Data: {apiKey}. Stripe: {secretKey, webhookSecret}. Values never
    // land in CloudFormation — only the ARN is injected as <PROVIDER>_SECRET_ARN.
    const API_KEY_PROVIDERS = ["brightdata", "stripe"] as const;
    const apiKeySecrets = API_KEY_PROVIDERS.map((id) => ({
      id,
      secret: secretsmanager.Secret.fromSecretNameV2(
        this,
        `${id[0].toUpperCase()}${id.slice(1)}ApiSecret`,
        `fuel2-${stage}-${id}-api`,
      ),
    }));
    for (const { id, secret } of apiKeySecrets) {
      oauthEnv[`${id.toUpperCase()}_SECRET_ARN`] = secret.secretArn;
    }

    // Public API client credentials for /api/public/v1/* (Basic / X-Client-*).
    // Out-of-band Secrets Manager JSON: { "clientId", "clientSecret" } under
    // `fuel2-<stage>-public-api`. Values are resolved into Lambda env at deploy
    // (same pattern as INTERNAL_CRON_TOKEN) so the app can read
    // PUBLIC_API_CLIENT_ID / PUBLIC_API_CLIENT_SECRET without a runtime SM fetch.
    const publicApiSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "PublicApiSecret",
      `fuel2-${stage}-public-api`,
    );

    this.webFn = new lambda.Function(this, "WebFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: haveOpenNextBuild ? "index.handler" : "index.handler",
      code: haveOpenNextBuild
        ? lambda.Code.fromAsset(serverFnDir)
        : lambda.Code.fromInline(
            "exports.handler=async()=>({statusCode:503,headers:{'content-type':'text/plain'},body:'fuel2 web: run `npm run build:opennext --workspace=apps/web` before synthesizing'});",
          ),
      // 3008 MB lifts vCPU allocation to ~1.75 — Next.js render is CPU-bound,
      // so this cuts warm-render time by ~30% over 1536. Cost increase is
      // marginal because invocations are short.
      memorySize: 3008,
      // Queue worker may run Crunchbase followed by LinkedIn. Keep below the
      // 15-minute dispatcher limit while leaving room for both provider budgets.
      timeout: cdk.Duration.minutes(14),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [webSg],
      environment: {
        STAGE: stage,
        DB_PROXY_ENDPOINT: dbProxyEndpoint,
        DB_SECRET_ARN: dbSecret.secretArn,
        COGNITO_USER_POOL_ID: userPoolId,
        COGNITO_USER_POOL_CLIENT_ID: userPoolClientId,
        COGNITO_REGION: cdk.Stack.of(this).region,
        COGNITO_HOSTED_UI: `https://${hostedUiDomain}.auth.us-east-2.amazoncognito.com`,
        APP_URL: appUrl,
        FUEL_DATA_OPENSEARCH_ENDPOINT:
          "https://vpc-fuel-search-s5rkumdphtmsr3ydjit3kheyim.us-east-2.es.amazonaws.com",
        FUEL_DATA_NEPTUNE_ENDPOINT:
          "https://fuel-neptune-cluster.cluster-cefvgec5t8lr.us-east-2.neptune.amazonaws.com:8182",
        CACHE_BUCKET_NAME: assetsBucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: cdk.Stack.of(this).region,
        FUEL_UPLOADS_BUCKET: uploadsBucket.bucketName,
        // CloudFormation resolves this to the literal token at deploy time.
        INTERNAL_CRON_TOKEN: internalCronTokenSecret
          .secretValueFromJson("token")
          .unsafeUnwrap(),
        // CloudFormation resolves Secrets Manager JSON keys into Lambda env.
        PUBLIC_API_CLIENT_ID: publicApiSecret
          .secretValueFromJson("clientId")
          .unsafeUnwrap(),
        PUBLIC_API_CLIENT_SECRET: publicApiSecret
          .secretValueFromJson("clientSecret")
          .unsafeUnwrap(),
        TECH_STACK_FN_NAME: techStackFn.functionName,
        SENTRY_DSN: process.env.FUEL2_SENTRY_DSN ?? "",
        SENTRY_ENVIRONMENT: stage,
        SENTRY_RELEASE: process.env.FUEL2_SENTRY_RELEASE ?? "",
        // Public Marker.io project key (not a secret). Empty → widget off.
        MARKER_IO_PROJECT_ID: process.env.FUEL2_MARKER_IO_PROJECT_ID ?? "",
        ...oauthEnv,
      },
    });
    techStackFn.grantInvoke(this.webFn);
    // Allow the web Lambda to invoke itself asynchronously. Used for
    // fire-and-forget jobs (HubSpot sync, future bulk enrichment) — the
    // server action pushes a synthetic Function URL event with
    // InvocationType=Event and returns immediately, while a fresh Lambda
    // invocation runs the job with its own 5-minute timeout. A wildcard
    // ARN avoids the circular dependency that arises from referencing
    // `this.webFn.functionArn` in its own role policy.
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [
          `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:function:${cdk.Stack.of(this).stackName}-WebWebFn*`,
        ],
      }),
    );
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminGetUser", "cognito-idp:ListUsers"],
        resources: [
          `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/${userPoolId}`,
        ],
      }),
    );
    dbSecret.grantRead(this.webFn);
    for (const { secret } of oauthSecrets) secret.grantRead(this.webFn);
    for (const { secret } of apiKeySecrets) secret.grantRead(this.webFn);
    assetsBucket.grantReadWrite(this.webFn);
    uploadsBucket.grantReadWrite(this.webFn);
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: ["*"],
      }),
    );
    // Bedrock access for the agent runtime (Claude Sonnet 4.6 reasoning +
    // Titan v2 embeddings). Inference profiles require permission on both
    // the profile ARN *and* every underlying foundation model ARN.
    const bedrockRegion = cdk.Stack.of(this).region;
    const bedrockAccount = cdk.Stack.of(this).account;
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"],
        resources: [
          `arn:aws:bedrock:${bedrockRegion}:${bedrockAccount}:inference-profile/us.anthropic.claude-sonnet-4-6`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6*`,
          // Haiku 4.5 — used by the signal extraction hook (cheap per-message
          // structured extraction against the global signal catalog). Wildcard
          // on the profile ARN covers future date/version bumps.
          `arn:aws:bedrock:${bedrockRegion}:${bedrockAccount}:inference-profile/us.anthropic.claude-haiku-4-5*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5*`,
          `arn:aws:bedrock:${bedrockRegion}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    );

    // SES v2 for transactional email (invites + invoice PDF attachments).
    // Simple body uses ses:SendEmail. Raw MIME (PDF attachments) is authorized
    // as ses:SendRawEmail — Lambda with only SendEmail gets AccessDenied on
    // invoice mail while local IAM users with broader SES still succeed.
    // Scoped to the york.ie domain identity so we can't send from unrelated
    // verified senders in the account.
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          `arn:aws:ses:${bedrockRegion}:${bedrockAccount}:identity/york.ie`,
        ],
      }),
    );

    // Neptune data-plane access to the fuel-data cluster. Read-only Gremlin
    // queries (funding rounds, investor graph, company people/articles). The
    // cluster resource id is baked in — it lives in the fuel-data AWS account
    // and doesn't change on redeploy of this stack.
    this.webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["neptune-db:connect", "neptune-db:ReadDataViaQuery", "neptune-db:GetQueryStatus"],
        resources: [
          `arn:aws:neptune-db:${bedrockRegion}:${bedrockAccount}:cluster-63HHOESKS2YN3JMITHUOMIJHSU/*`,
        ],
      }),
    );

    const webFnUrl = this.webFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(assetsBucket);
    const fnOrigin = new origins.FunctionUrlOrigin(webFnUrl);

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      domainNames: [fqdn],
      certificate,
      defaultBehavior: {
        origin: fnOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        "/_next/static/*": {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/_next/image*": {
          origin: fnOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        // Files shipped from apps/web/public/ — OpenNext copies them to the
        // assets bucket, but CloudFront still sends anything not listed here
        // to the Lambda, where Next.js 404s the raw filename. Add new
        // root-level public files to this list when we ship them.
        "/favicon.ico": s3StaticBehavior(s3Origin),
        "/favicon-16x16.png": s3StaticBehavior(s3Origin),
        "/favicon-32x32.png": s3StaticBehavior(s3Origin),
        "/apple-touch-icon.png": s3StaticBehavior(s3Origin),
        "/manifest.json": s3StaticBehavior(s3Origin),
        "/york-mark.svg": s3StaticBehavior(s3Origin),
        // F20A-167 welcome email PNGs under public/email/ — Gmail loads these
        // via absolute HTTPS; must hit S3, not the Lambda origin.
        "/email/*": s3StaticBehavior(s3Origin),
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: hostname,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });
  }
}
