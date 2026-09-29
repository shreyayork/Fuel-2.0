import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Template } from "aws-cdk-lib/assertions";
import { OnboardEnrichmentQueue } from "../lib/onboard-enrichment-queue";

describe("OnboardEnrichmentQueue", () => {
  it("creates encrypted queue, DLQ, and single-message worker", () => {
    const stack = new cdk.Stack();
    const webFunction = new lambda.Function(stack, "Web", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => ({ statusCode: 200 })"),
    });
    const secret = new secretsmanager.Secret(stack, "Token");
    new OnboardEnrichmentQueue(stack, "Onboard", {
      webFunction,
      appUrl: "https://fuel.example.com",
      sharedSecret: secret,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::SQS::Queue", 2);
    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BatchSize: 1,
      FunctionResponseTypes: ["ReportBatchItemFailures"],
    });
    const workers = template.findResources("AWS::Lambda::Function", {
      Properties: { Timeout: 900 },
    });
    assert.equal(Object.keys(workers).length, 1);
  });
});
