import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import * as path from "path";

export interface OnboardEnrichmentQueueProps {
  webFunction: lambda.IFunction;
  appUrl: string;
  sharedSecret: secretsmanager.ISecret;
}

export class OnboardEnrichmentQueue extends Construct {
  readonly queue: sqs.Queue;
  readonly deadLetterQueue: sqs.Queue;
  readonly worker: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: OnboardEnrichmentQueueProps,
  ) {
    super(scope, id);

    this.deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue", {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    this.queue = new sqs.Queue(this, "Queue", {
      visibilityTimeout: cdk.Duration.minutes(16),
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    this.worker = new nodejs.NodejsFunction(this, "Worker", {
      entry: path.resolve(
        __dirname,
        "..",
        "lambda",
        "onboard-enrichment-worker",
        "index.ts",
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(15),
      memorySize: 256,
      environment: {
        WEB_FUNCTION_NAME: props.webFunction.functionName,
        APP_URL: props.appUrl,
        INTERNAL_CRON_TOKEN_SECRET_ARN: props.sharedSecret.secretArn,
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
    });
    this.worker.addEventSource(
      new eventSources.SqsEventSource(this.queue, {
        batchSize: 1,
        reportBatchItemFailures: true,
      }),
    );
    props.webFunction.grantInvoke(this.worker);
    props.sharedSecret.grantRead(this.worker);
  }
}
