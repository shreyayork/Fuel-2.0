import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Tech-stack detection Lambda. Fetches a URL and runs a curated list of
 * Wappalyzer-style fingerprints against the response. Fast, cheap, no
 * browser. The web app invokes this via Lambda SDK; not exposed publicly.
 */
export class TechStack extends Construct {
  readonly fn: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.fn = new nodejs.NodejsFunction(this, "Fn", {
      entry: path.resolve(__dirname, "..", "lambda", "tech-stack", "index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: { minify: true, target: "node20" },
    });
  }
}
