import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

export interface ReconcileCronProps {
  appUrl: string;
  stage: "stage" | "prod" | "dev";
  /** Secret holding { "token": "…" } used to auth the cron → web call. */
  sharedSecret: secretsmanager.ISecret;
  /** cron(…) schedule — defaults to 06:00 UTC daily. */
  scheduleExpression?: string;
  /** Path on the web app to POST. Defaults to /api/cron/reconcile-hubspot. */
  endpointPath?: string;
}

/**
 * EventBridge rule → tiny Lambda → HTTPS POST to the web app's reconcile
 * endpoint. The reconcile logic itself lives in the web app (Next) so the
 * Lambda is a thin trigger, not a duplicate of the sync code.
 */
export class ReconcileCron extends Construct {
  readonly fn: lambda.Function;
  readonly rule: events.Rule;

  constructor(scope: Construct, id: string, props: ReconcileCronProps) {
    super(scope, id);

    this.fn = new nodejs.NodejsFunction(this, "Fn", {
      entry: path.resolve(__dirname, "..", "lambda", "reconcile-cron", "index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        APP_URL: props.appUrl,
        STAGE: props.stage,
        INTERNAL_CRON_TOKEN_SECRET_ARN: props.sharedSecret.secretArn,
        ENDPOINT_PATH: props.endpointPath ?? "/api/cron/reconcile-hubspot",
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
    });
    props.sharedSecret.grantRead(this.fn);

    this.rule = new events.Rule(this, "Schedule", {
      schedule: events.Schedule.expression(
        props.scheduleExpression ?? "cron(0 6 * * ? *)",
      ),
    });
    this.rule.addTarget(new targets.LambdaFunction(this.fn));
  }
}
