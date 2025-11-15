const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.TABLE_NAME;
  const roomsTableName = process.env.ROOMS_TABLE_NAME;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  const conn = await ddb.send(new GetCommand({
    TableName: tableName,
    Key: { connectionId },
  }));

  const roomId = conn.Item?.roomId;
  if (!roomId) {
    return { statusCode: 400, body: 'Not in a room' };
  }

  const message = JSON.parse(event.body);
  const { targetUserId, data } = message;

  const members = await ddb.send(new QueryCommand({
    TableName: roomsTableName,
    KeyConditionExpression: 'roomId = :roomId',
    ExpressionAttributeValues: { ':roomId': roomId },
  }));

  const apigw = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

  const targets = targetUserId
    ? members.Items.filter(m => m.userId === targetUserId)
    : members.Items.filter(m => m.connectionId !== connectionId);

  const postCalls = targets.map(async (m) => {
    try {
      await apigw.send(new PostToConnectionCommand({
        ConnectionId: m.connectionId,
        Data: JSON.stringify({ type: 'signal', fromUserId: conn.Item.userId, data }),
      }));
    } catch (e) {
      if (e.statusCode === 410) {
        await ddb.send(new DeleteCommand({
          TableName: tableName,
          Key: { connectionId: m.connectionId },
        }));
      }
    }
  });

  await Promise.all(postCalls);

  return { statusCode: 200, body: 'Message sent' };
};
