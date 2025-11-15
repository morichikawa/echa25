const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const tableName = process.env.TABLE_NAME;
  const roomsTableName = process.env.ROOMS_TABLE_NAME;

  const body = JSON.parse(event.body);
  const { roomId, nickname } = body;

  if (!roomId || !nickname || roomId.length > 100 || nickname.length > 50) {
    return { statusCode: 400, body: 'Invalid input' };
  }

  const userId = randomUUID();
  const joinedAt = Date.now();
  const ttl = Math.floor(joinedAt / 1000) + 3600;

  await ddb.send(new UpdateCommand({
    TableName: tableName,
    Key: { connectionId },
    UpdateExpression: 'SET roomId = :roomId, userId = :userId, nickname = :nickname, joinedAt = :joinedAt',
    ExpressionAttributeValues: {
      ':roomId': roomId,
      ':userId': userId,
      ':nickname': nickname,
      ':joinedAt': joinedAt,
    },
  }));

  const existingMembers = await ddb.send(new QueryCommand({
    TableName: roomsTableName,
    KeyConditionExpression: 'roomId = :roomId',
    ExpressionAttributeValues: { ':roomId': roomId },
  }));

  const isHost = !existingMembers.Items || existingMembers.Items.length === 0;

  await ddb.send(new PutCommand({
    TableName: roomsTableName,
    Item: { roomId, connectionId, userId, nickname, joinedAt, isHost, ttl },
  }));

  const members = [
    ...(existingMembers.Items || []).map(m => ({ userId: m.userId, nickname: m.nickname, isHost: m.isHost })),
    { userId, nickname, isHost },
  ];

  const apigw = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

  const notifyExisting = (existingMembers.Items || []).map(async (m) => {
    try {
      await apigw.send(new PostToConnectionCommand({
        ConnectionId: m.connectionId,
        Data: JSON.stringify({ type: 'user-joined', userId, nickname, isHost, members }),
      }));
    } catch (e) {}
  });

  await Promise.all(notifyExisting);

  await apigw.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({ type: 'joined', userId, isHost, members }),
  }));

  return { statusCode: 200, body: 'Joined' };
};
