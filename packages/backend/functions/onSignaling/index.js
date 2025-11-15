const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.TABLE_NAME;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  const apigw = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`
  });

  const data = await ddb.send(new ScanCommand({ TableName: tableName }));
  const connections = data.Items || [];

  const message = JSON.parse(event.body);

  const postCalls = connections
    .filter(c => c.connectionId !== connectionId)
    .map(async (c) => {
      try {
        await apigw.send(new PostToConnectionCommand({
          ConnectionId: c.connectionId,
          Data: JSON.stringify(message)
        }));
      } catch (e) {
        if (e.statusCode === 410) {
          await ddb.send(new DeleteCommand({
            TableName: tableName,
            Key: { connectionId: c.connectionId }
          }));
        }
      }
    });

  await Promise.all(postCalls);

  return { statusCode: 200, body: 'Message sent' };
};
