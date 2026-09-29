import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import type { Fuel2Stack } from "./fuel2-stack";

/**
 * Peers fuel2-{stage}'s VPC with the existing fuel-data VPC and grants the
 * Web Lambda IAM access to Neptune + OpenSearch. All added resources
 * reference fuel-data IDs by value — the fuel-data CloudFormation stack
 * is not modified.
 *
 * Lives in its own stack so we can deploy/destroy the peering independently
 * of the main fuel2 application stack.
 */
export interface FuelDataPeeringStackProps extends cdk.StackProps {
  fuel2Stack: Fuel2Stack;
  fuelDataVpcId: string;
  fuelDataVpcCidr: string;
  fuelDataRouteTableIds: string[];
  fuelDataNeptuneSgId: string;
  fuelDataOpenSearchSgId: string;
  fuelDataNeptuneClusterResourceId: string; // the cluster-XXXX id from DbClusterResourceId
  fuelDataOpenSearchDomainArn: string;
}

export class FuelDataPeeringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FuelDataPeeringStackProps) {
    super(scope, id, props);

    const {
      fuel2Stack,
      fuelDataVpcId,
      fuelDataVpcCidr,
      fuelDataRouteTableIds,
      fuelDataNeptuneSgId,
      fuelDataOpenSearchSgId,
      fuelDataNeptuneClusterResourceId,
      fuelDataOpenSearchDomainArn,
    } = props;

    const peering = new ec2.CfnVPCPeeringConnection(this, "Peering", {
      vpcId: fuel2Stack.vpc.vpcId,
      peerVpcId: fuelDataVpcId,
      tags: [{ key: "Name", value: `${fuel2Stack.stackName}-to-fuel-data` }],
    });

    // Routes on fuel2 side: send fuel-data CIDR through the peering.
    // We add to every private route table (egress + isolated) so Web Lambda
    // and future VPC-resident services can both reach fuel-data.
    const fuel2Rts = [
      ...fuel2Stack.vpc.privateSubnets.map((s) => s.routeTable.routeTableId),
      ...fuel2Stack.vpc.isolatedSubnets.map((s) => s.routeTable.routeTableId),
    ];
    fuel2Rts.forEach((rtId, i) => {
      new ec2.CfnRoute(this, `Fuel2ToFuelDataRoute${i}`, {
        routeTableId: rtId,
        destinationCidrBlock: fuelDataVpcCidr,
        vpcPeeringConnectionId: peering.ref,
      });
    });

    // Routes on fuel-data side: return path back to fuel2 CIDR.
    fuelDataRouteTableIds.forEach((rtId, i) => {
      new ec2.CfnRoute(this, `FuelDataToFuel2Route${i}`, {
        routeTableId: rtId,
        destinationCidrBlock: fuel2Stack.vpc.vpcCidrBlock,
        vpcPeeringConnectionId: peering.ref,
      });
    });

    // SG ingress on fuel-data side, sourced from the fuel2 Web Lambda SG.
    new ec2.CfnSecurityGroupIngress(this, "NeptuneIngress", {
      groupId: fuelDataNeptuneSgId,
      sourceSecurityGroupId: fuel2Stack.webApp.webSg.securityGroupId,
      ipProtocol: "tcp",
      fromPort: 8182,
      toPort: 8182,
      description: `${fuel2Stack.stackName} web lambda to Neptune`,
    });
    new ec2.CfnSecurityGroupIngress(this, "OpenSearchIngress", {
      groupId: fuelDataOpenSearchSgId,
      sourceSecurityGroupId: fuel2Stack.webApp.webSg.securityGroupId,
      ipProtocol: "tcp",
      fromPort: 443,
      toPort: 443,
      description: `${fuel2Stack.stackName} web lambda to OpenSearch`,
    });

    // IAM: allow Web Lambda to query Neptune + OpenSearch directly.
    const role = fuel2Stack.webApp.webFn.role;
    if (role) {
      role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: [
            "neptune-db:connect",
            "neptune-db:ReadDataViaQuery",
            "neptune-db:GetQueryStatus",
          ],
          resources: [
            `arn:aws:neptune-db:${this.region}:${this.account}:${fuelDataNeptuneClusterResourceId}/*`,
          ],
        }),
      );
      role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["es:ESHttpGet", "es:ESHttpPost"],
          resources: [fuelDataOpenSearchDomainArn, `${fuelDataOpenSearchDomainArn}/*`],
        }),
      );
    }

    new cdk.CfnOutput(this, "PeeringConnectionId", { value: peering.ref });
  }
}
