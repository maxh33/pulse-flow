import axios from 'axios';
import { z } from 'zod';
import snappy from 'snappy';
import { loadEnv } from './load-env';
import * as protobuf from 'protobufjs';
import { createTweetData } from '../factories/tweet.factory';
import { TweetData } from '../models/tweet';


// Load environment variables before validation
loadEnv();

const envSchema = z.object({
  GRAFANA_PUSH_URL: z.string().url(),
  GRAFANA_USERNAME: z.string(),
  GRAFANA_API_KEY: z.string()
});

async function createProtobufPayload(tweets?: TweetData[]) {
  // If no tweets provided, generate sample tweets
  const sampleTweets = tweets || Array.from({ length: 5 }, () => createTweetData());

  // Create a simple Protobuf message structure
  const root = protobuf.Root.fromJSON({
    nested: {
      prometheus: {
        nested: {
          WriteRequest: {
            fields: {
              timeseries: {
                rule: 'repeated',
                type: 'TimeSeries',
                id: 1
              }
            }
          },
          TimeSeries: {
            fields: {
              labels: {
                rule: 'repeated',
                type: 'Label',
                id: 1
              },
              samples: {
                rule: 'repeated',
                type: 'Sample',
                id: 2
              }
            }
          },
          Label: {
            fields: {
              name: {
                type: 'string',
                id: 1
              },
              value: {
                type: 'string',
                id: 2
              }
            }
          },
          Sample: {
            fields: {
              value: {
                type: 'double',
                id: 1
              },
              timestamp: {
                type: 'int64',
                id: 2
              }
            }
          }
        }
      }
    }
  });

  // Parse metrics data into Protobuf structure
  const WriteRequest = root.lookupType('prometheus.WriteRequest');
  
  // Convert metrics data to Protobuf
  const timeseries = sampleTweets.map(tweet => {
    return {
      labels: [
        { name: '__name__', value: 'pulse_flow_tweet_likes' },
        { name: 'tweet_id', value: tweet.tweetId },
        { name: 'tweet_author', value: tweet.user },
        { name: 'tweet_platform', value: tweet.platform },
        { name: 'tweet_sentiment', value: tweet.sentiment }
      ],
      samples: [{
        value: tweet.metrics.likes,
        timestamp: tweet.timestamp.getTime()
      }]
    };
  });

  // Create Protobuf message
  const message = WriteRequest.create({ timeseries });
  
  // Verify the message
  const errMsg = WriteRequest.verify(message);
  if (errMsg) throw new Error(`Invalid message: ${errMsg}`);

  // Encode the message
  return WriteRequest.encode(message).finish();
}

async function verifyGrafanaConnection() {
  try {
    const env = envSchema.parse(process.env);
    
    console.log('🔄 Verifying Grafana Cloud connection...');
    
    // Try multiple authentication and endpoint variations
    const endpoints = [
      {
        url: env.GRAFANA_PUSH_URL,
        method: 'POST',
        payload: async () => {
          try {
            // Create Protobuf payload with sample tweets
            const protobufPayload = await createProtobufPayload();
            
            // Convert Uint8Array to Buffer
            const bufferPayload = Buffer.from(protobufPayload);
            
            // Compress the Protobuf payload
            const compressedPayload = await snappy.compress(bufferPayload);
            console.log('Compressed payload length:', compressedPayload.length);
            return compressedPayload;
          } catch (error) {
            console.error('Payload creation error:', error);
            throw error;
          }
        },
        headers: {
          'Content-Type': 'application/x-protobuf',
          'Content-Encoding': 'snappy',
          'X-Prometheus-Remote-Write-Version': '0.1.0',
          'Authorization': `Bearer ${env.GRAFANA_API_KEY}`
        },
        auth: {
          username: env.GRAFANA_USERNAME,
          password: env.GRAFANA_API_KEY
        }
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to connect to: ${endpoint.url} (${endpoint.method})`);
        
        const compressedPayload = await endpoint.payload();

        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          data: compressedPayload,
          auth: endpoint.auth,
          headers: endpoint.headers,
          timeout: 10000 // 10-second timeout
        });

        if (response.status === 200) {
          console.log(`✅ Grafana Cloud connection verified via ${endpoint.url}`);
          process.exit(0);
        }
      } catch (error) {
        console.error(`❌ Connection failed to ${endpoint.url}:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          ...(axios.isAxiosError(error) && {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
          })
        });
      }
    }

    throw new Error('Could not establish connection to any Grafana Cloud endpoint');
  } catch (error) {
    console.error('❌ Grafana Cloud verification ultimately failed:', error);
    process.exit(1);
  }
}

export default verifyGrafanaConnection; 