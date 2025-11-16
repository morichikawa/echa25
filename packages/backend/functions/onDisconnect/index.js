const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const tableName = process.env.TABLE_NAME;
  const roomsTableName = process.env.ROOMS_TABLE_NAME;

  const conn = await ddb.send(new GetCommand({
    TableName: tableName,
    Key: { connectionId },
  }));

  const { roomId, userId } = conn.Item || {};

  await ddb.send(new DeleteCommand({
    TableName: tableName,
    Key: { connectionId },
  }));

  if (roomId) {
    await ddb.send(new DeleteCommand({
      TableName: roomsTableName,
      Key: { roomId, connectionId },
    }));

    const remaining = await ddb.send(new QueryCommand({
      TableName: roomsTableName,
      KeyConditionExpression: 'roomId = :roomId',
      ExpressionAttributeValues: { ':roomId': roomId },
    }));

    if (remaining.Items && remaining.Items.length > 0) {
      const sorted = remaining.Items.sort((a, b) => a.joinedAt - b.joinedAt);
      const newHost = sorted[0];

      if (!newHost.isHost) {
        await ddb.send(new UpdateCommand({
          TableName: roomsTableName,
          Key: { roomId, connectionId: newHost.connectionId },
          UpdateExpression: 'SET isHost = :true',
          ExpressionAttributeValues: { ':true': true },
        }));
      }

      const members = remaining.Items.map(m => ({
        userId: m.userId,
        nickname: m.nickname,
        color: m.color,
        isHost: m.connectionId === newHost.connectionId || m.isHost
      }));

      const apigw = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });
      const notify = remaining.Items.map(async (m) => {
        try {
          await apigw.send(new PostToConnectionCommand({
            ConnectionId: m.connectionId,
            Data: JSON.stringify({ type: 'user-left', userId, members }),
          }));
        } catch (e) {}
      });
      await Promise.all(notify);
    }
  }

  return { statusCode: 200, body: 'Disconnected' };
};
