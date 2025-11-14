import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler'
    });
  }
}
