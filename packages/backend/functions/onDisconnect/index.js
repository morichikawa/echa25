const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.TABLE_NAME;

  await ddb.send(new DeleteCommand({
    TableName: tableName,
    Key: { connectionId }
  }));

  return { statusCode: 200, body: 'Disconnected' };
};
