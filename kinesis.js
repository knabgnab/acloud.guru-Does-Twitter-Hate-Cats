var { ETwitterStreamEvent, TwitterApi } = require('twitter-api-v2');
const AWS = require('aws-sdk');

const client = new TwitterApi('<Bearer Token>'); // (create a client)

(async () => {
  // Add rules
  const addedRules = await client.v2.updateStreamRules({
    add: [
      {
        value: 'cat',
      },
    ],
  });

  const stream = await client.v2.searchStream({
    'tweet.fields': ['referenced_tweets', 'author_id', 'created_at'],
    expansions: ['referenced_tweets.id'],
  });

  AWS.config.loadFromPath('./config.json');

  var kinesis = new AWS.Kinesis();

  // Assign yor event handlers
  // Emitted on Tweet
  stream.on(ETwitterStreamEvent.Data, (context) => {
    const event = context.data;
    // console.log(event.id);
    if (event.text) {
      // console.log(`text: ${event.text}`);
      var record = JSON.stringify({
        id: event.id,
        timestamp: event['created_at'],
        tweet: event.text.replace(/["'}{|]/g, '') //either strip out problem characters or base64 encode for safety 
      }) + '|'; // record delimiter

      kinesis.putRecord({
        Data: record,
        StreamName: 'twitterStream',
        PartitionKey: 'key'
      }, function (err, data) {
        if (err) {
          console.error(err);
        }
        console.log('sending: ', record);
      });
    }
  });
  // Emitted only on initial connection success
  stream.on(ETwitterStreamEvent.Connected, () => console.log('Stream is started.'));

  // Start stream!
  await stream.connect({ autoReconnect: true, autoReconnectRetries: Infinity });
})().catch(console.error)