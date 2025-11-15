import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const roomsTable = new dynamodb.Table(this, 'RoomsTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda 関数
    const onConnectFn = new lambda.Function(this, 'OnConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('functions/onConnect'),
      environment: { TABLE_NAME: connectionsTable.tableName },
    });

    const onDisconnectFn = new lambda.Function(this, 'OnDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('functions/onDisconnect'),
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        ROOMS_TABLE_NAME: roomsTable.tableName,
      },
    });

    const onSignalingFn = new lambda.Function(this, 'OnSignalingFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('functions/onSignaling'),
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        ROOMS_TABLE_NAME: roomsTable.tableName,
      },
    });

    const onJoinFn = new lambda.Function(this, 'OnJoinFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('functions/onJoin'),
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        ROOMS_TABLE_NAME: roomsTable.tableName,
      },
    });

    connectionsTable.grantReadWriteData(onConnectFn);
    connectionsTable.grantReadWriteData(onDisconnectFn);
    connectionsTable.grantReadWriteData(onSignalingFn);
    connectionsTable.grantReadWriteData(onJoinFn);
    roomsTable.grantReadWriteData(onDisconnectFn);
    roomsTable.grantReadWriteData(onSignalingFn);
    roomsTable.grantReadWriteData(onJoinFn);

    // WebSocket API
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: { integration: new WebSocketLambdaIntegration('ConnectIntegration', onConnectFn) },
      disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('DisconnectIntegration', onDisconnectFn) },
      defaultRouteOptions: { integration: new WebSocketLambdaIntegration('DefaultIntegration', onSignalingFn) },
    });

    webSocketApi.addRoute('join', {
      integration: new WebSocketLambdaIntegration('JoinIntegration', onJoinFn),
    });

    const stage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    onSignalingFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));

    onJoinFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));

    onDisconnectFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));

    // S3 バケット
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // タグ付け
    cdk.Tags.of(this).add('Project', 'echa25');
    cdk.Tags.of(this).add('Environment', 'dev');
    cdk.Tags.of(this).add('ManagedBy', 'cdk');

    // 出力
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: stage.url,
      description: 'WebSocket API URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketURL', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'Frontend S3 Website URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    // フロントエンドデプロイ（WebSocket URLを自動設定）
    const canvasJsContent = fs.readFileSync(path.join(__dirname, '../../frontend/canvas.js'), 'utf8')
      .replace('WEBSOCKET_URL_PLACEHOLDER', stage.url);

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../frontend'), {
          exclude: ['node_modules', 'package*.json', 'README.md', '*.test.js', '__tests__', 'app.js', 'canvas.js', 'index.html']
        }),
        s3deploy.Source.data('index.html', fs.readFileSync(path.join(__dirname, '../../frontend/menu.html'), 'utf8')),
        s3deploy.Source.data('canvas.js', canvasJsContent)
      ],
      destinationBucket: frontendBucket,
    });
  }
}
