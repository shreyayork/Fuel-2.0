#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FuelDataPeeringStack } from "../lib/fuel-data-peering";
import { Fuel2Stack } from "../lib/fuel2-stack";

const app = new cdk.App();

const account = "292355514327";
const primaryRegion = "us-east-2";

// ACM cert in us-east-1; SANs already cover v2.fuel.york.ie, stage.v2.fuel.york.ie,
// and dev.v2.fuel.york.ie. Lives outside CDK so stack teardowns don't race
// CloudFront's cert detach.
const CERT_ARN = "arn:aws:acm:us-east-1:292355514327:certificate/e4f4a587-453f-4596-8606-bf9857f1236a";

type EnvConfig = {
  stage: "stage" | "prod" | "dev";
  hostname: string;
  legacyCognitoUserPoolId: string;
  /** Fuel 1.0 AppSync API id for this env (the DDB suffix is `<id>-<env>`). */
  legacyAppSyncId: string;
  /** Fuel 1.0 env name embedded in the DDB suffix (matches Amplify env). */
  legacyAppSyncEnv: string;
};

const envs: EnvConfig[] = [
  {
    stage: "dev",
    hostname: "dev.v2",
    legacyCognitoUserPoolId: "us-east-2_dUNyuIcyI",
    legacyAppSyncId: "nefpqb4pzffbdofmn7s54gqfzm",
    legacyAppSyncEnv: "stage",
  },
  {
    stage: "stage",
    hostname: "stage.v2",
    legacyCognitoUserPoolId: "us-east-2_dUNyuIcyI",
    legacyAppSyncId: "nefpqb4pzffbdofmn7s54gqfzm",
    legacyAppSyncEnv: "stage",
  },
  {
    stage: "prod",
    hostname: "v2",
    legacyCognitoUserPoolId: "us-east-2_KzRH5iGRO",
    legacyAppSyncId: "rht7ttva25efbpq65ggzd4tfwi",
    legacyAppSyncEnv: "prod",
  },
];

// Shared Google OAuth client already registered on the legacy pools.
// Add the new hosted-UI redirect URIs (fuel2-{stage}.auth.us-east-2.amazoncognito.com/oauth2/idpresponse) to the project in Google Console.
const GOOGLE_CLIENT_ID =
  process.env.FUEL2_GOOGLE_CLIENT_ID ??
  "423250138677-v56ra5t62j9lgisgdftp44dde8g499i1.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.FUEL2_GOOGLE_CLIENT_SECRET;
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "FUEL2_GOOGLE_CLIENT_SECRET env var must be set before synth (copy from legacy pool Google IDP).",
  );
}

const domainName = "fuel.york.ie";

// The CDKToolkit stack in us-east-2 was bootstrapped with the `crawl4ai`
// qualifier, so our stacks must use the same synthesizer qualifier to find
// the existing staging bucket, deploy role, and /cdk-bootstrap SSM param.
const synthesizer = () => new cdk.DefaultStackSynthesizer({ qualifier: "crawl4ai" });

// fuel-data VPC + Neptune + OpenSearch live in a separate CloudFormation stack
// we don't modify. These IDs come from `describe-vpcs` / `describe-db-clusters`
// / `describe-domain` on the fuel-data resources.
const FUEL_DATA = {
  vpcId: "vpc-01f7215cb4613ac8e",
  vpcCidr: "10.0.0.0/16",
  routeTableIds: [
    "rtb-08f12ed828f0b1f03",
    "rtb-06e899b132d39a9f2",
    "rtb-0859b36362c3de36f",
    "rtb-06f9d119700f5a0e2",
  ],
  neptuneSgId: "sg-05d609ad35a17a021",
  openSearchSgId: "sg-05d609ad35a17a021",
  neptuneClusterResourceId: "cluster-63HHOESKS2YN3JMITHUOMIJHSU",
  openSearchDomainArn: "arn:aws:es:us-east-2:292355514327:domain/fuel-search",
};

for (const cfg of envs) {
  const mainStack = new Fuel2Stack(app, `fuel2-${cfg.stage}`, {
    env: { account, region: primaryRegion },
    synthesizer: synthesizer(),
    stage: cfg.stage,
    domainName,
    hostname: cfg.hostname,
    legacyCognitoUserPoolId: cfg.legacyCognitoUserPoolId,
    legacyAppSyncId: cfg.legacyAppSyncId,
    legacyAppSyncEnv: cfg.legacyAppSyncEnv,
    googleClientId: GOOGLE_CLIENT_ID,
    googleClientSecret: GOOGLE_CLIENT_SECRET,
    certificateArn: CERT_ARN,
  });

  new FuelDataPeeringStack(app, `fuel2-${cfg.stage}-peering`, {
    env: { account, region: primaryRegion },
    synthesizer: synthesizer(),
    fuel2Stack: mainStack,
    fuelDataVpcId: FUEL_DATA.vpcId,
    fuelDataVpcCidr: FUEL_DATA.vpcCidr,
    fuelDataRouteTableIds: FUEL_DATA.routeTableIds,
    fuelDataNeptuneSgId: FUEL_DATA.neptuneSgId,
    fuelDataOpenSearchSgId: FUEL_DATA.openSearchSgId,
    fuelDataNeptuneClusterResourceId: FUEL_DATA.neptuneClusterResourceId,
    fuelDataOpenSearchDomainArn: FUEL_DATA.openSearchDomainArn,
  });
}
