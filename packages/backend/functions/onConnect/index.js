const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.TABLE_NAME;

  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: {
      connectionId,
      connectedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 3600
    }
  }));

  return { statusCode: 200, body: 'Connected' };
};
