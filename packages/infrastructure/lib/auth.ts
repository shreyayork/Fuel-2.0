import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import {
  buildInvitationEmailHtml,
  buildVerificationEmailHtml,
  INVITATION_EMAIL_SUBJECT,
  VERIFICATION_EMAIL_SUBJECT,
} from "./cognito-email-templates";
import { emailAssetBaseUrlFromAppUrl } from "./email-asset-urls";

export interface AuthProps {
  stage: "stage" | "prod" | "dev";
  googleClientId: string;
  googleClientSecret: string;
  appUrl: string;
  hostedUiPrefix: string;
}

export class Auth extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly userPoolDomain: cognito.UserPoolDomain;
  readonly preSignUpFn: nodejs.NodejsFunction;
  readonly postConfirmFn: nodejs.NodejsFunction;
  readonly customMessageFn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    const { stage, googleClientId, googleClientSecret, appUrl, hostedUiPrefix } = props;

    this.preSignUpFn = new nodejs.NodejsFunction(this, "PreSignUpFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "pre-signup", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(5),
      bundling: { minify: true, target: "node20" },
    });

    this.postConfirmFn = new nodejs.NodejsFunction(this, "PostConfirmFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "post-confirm", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
      bundling: { minify: true, target: "node20" },
    });

    const assetBaseUrl = emailAssetBaseUrlFromAppUrl(appUrl);

    this.customMessageFn = new nodejs.NodejsFunction(this, "CustomMessageFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "custom-message", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(5),
      bundling: { minify: true, target: "node20" },
      environment: {
        STAGE: stage,
        FUEL_EMAIL_ASSET_BASE_URL: assetBaseUrl,
      },
    });

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `fuel2-${stage}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      // Route Cognito-sent emails (verification codes, admin-invite temp
      // passwords) through SES with `york.ie` as the source identity.
      // Without this, Cognito sends from its default `verificationemail.com`
      // domain — unsigned by our DKIM keys, which lands in spam. SES is
      // production-enabled in us-east-2 and `york.ie` has DKIM verified.
      email: cognito.UserPoolEmail.withSES({
        sesRegion: cdk.Stack.of(this).region,
        fromEmail: "no-reply@york.ie",
        fromName: "Fuel",
        replyTo: "support@york.ie",
        sesVerifiedDomain: "york.ie",
      }),
      userVerification: {
        emailSubject: VERIFICATION_EMAIL_SUBJECT,
        emailBody: buildVerificationEmailHtml("there", assetBaseUrl),
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      userInvitation: {
        emailSubject: INVITATION_EMAIL_SUBJECT,
        emailBody: buildInvitationEmailHtml(assetBaseUrl),
        // Cognito mandates both {username} and {####} placeholders in the
        // admin-create-user SMS template even when SMS delivery isn't used.
        smsMessage: "Fuel temp password for {username}: {####}",
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
      },
      // `custom:org` and `custom:role` are Fuel 1.0 baggage that we can't
      // drop from Cognito without destroying the pool. They're no longer
      // read or written by anything in Fuel 2.0 — account / role lives in
      // `account_members` in Postgres. Leaving them here as no-ops so CFN
      // updates don't try to remove them (which would fail on existing pools).
      customAttributes: {
        org: new cognito.StringAttribute({ mutable: true }),
        role: new cognito.StringAttribute({ mutable: true }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Strong-ish baseline; Cognito's default is 8 chars with no complexity.
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      lambdaTriggers: {
        preSignUp: this.preSignUpFn,
        postConfirmation: this.postConfirmFn,
        customMessage: this.customMessageFn,
      },
      removalPolicy: stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const google = new cognito.UserPoolIdentityProviderGoogle(this, "Google", {
      userPool: this.userPool,
      clientId: googleClientId,
      clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
      scopes: ["openid", "email", "profile"],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
      },
    });

    this.userPoolDomain = this.userPool.addDomain("HostedUi", {
      cognitoDomain: { domainPrefix: hostedUiPrefix },
    });

    this.userPoolClient = this.userPool.addClient("Web", {
      // userSrp powers the legacy hosted-UI flow; userPassword lets the
      // app run its own polished sign-in/sign-up form via InitiateAuth
      // (USER_PASSWORD_AUTH) — credentials still travel over TLS to
      // Cognito, never touch our DB.
      authFlows: { userSrp: true, userPassword: true },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [`${appUrl}/api/auth/callback`],
        logoutUrls: [`${appUrl}/sign-in`],
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
    });
    this.userPoolClient.node.addDependency(google);

    // Platform-level groups. Membership is managed out-of-band with
    // `aws cognito-idp admin-add-user-to-group`; Fuel reads the
    // `cognito:groups` claim on the ID token to authorize super-admin-only
    // routes. Mirror of Fuel 1.0's `super-admin` group on the legacy pool.
    new cognito.CfnUserPoolGroup(this, "SuperAdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "super-admin",
      description: "Platform super administrators. Can curate Service Providers and other shared entities.",
      precedence: 1,
    });
  }
}
