import { connectDB } from '../config/mongodb.config';
import { ObjectId } from 'mongodb';
import { TweetService } from '../services/tweet.service';
import * as metrics from '../monitoring/metrics';
import { continuousInsert } from '../scripts/continuous-insert';
import { createTweetData } from '../factories/tweet.factory';

jest.mock('../config/mongodb.config');
jest.mock('../services/tweet.service');
jest.mock('../factories/tweet.factory');
jest.mock('../monitoring/metrics');

describe('continuousInsert', () => {
  let tweetServiceMock: jest.Mocked<TweetService>;
  let processExitSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;
  
  const mockTweet = {
    tweetId: new ObjectId().toHexString(),
    user: 'test-user',
    content: 'test-content',
    timestamp: new Date(),
    metrics: {
      retweets: 0,
      likes: 0,
      comments: 0
    },
    sentiment: 'neutral',
    location: {
      country: 'test-country',
      city: 'test-city'
    },
    platform: 'web',
    tags: ['test'],
    _id: new ObjectId()
  };

  beforeEach(() => {
    // Setup timer mocks
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    
    // Setup console mocks
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Setup process.exit mock
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock metrics
    (metrics.tweetCounter.inc as jest.Mock).mockImplementation(() => {});
    (metrics.errorCounter.inc as jest.Mock).mockImplementation(() => {});

    // Setup tweet service mock
    tweetServiceMock = {
      createTweet: jest.fn().mockResolvedValue(mockTweet),
      disconnect: jest.fn().mockResolvedValue(undefined)
    } as any;
    (TweetService as jest.Mock).mockImplementation(() => tweetServiceMock);

    // Setup DB connection mock
    (connectDB as jest.Mock).mockResolvedValue(undefined);

    // Setup createTweetData mock
    (createTweetData as jest.Mock).mockReturnValue(mockTweet);
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    processExitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should create a tweet and increment metrics', async () => {
    // Start continuous insert with 1 iteration
    const promise = continuousInsert({ maxIterations: 1 });
    
    // Allow the DB connection promise to resolve
    await Promise.resolve();
    
    // Advance timers by the minimum delay
    await jest.advanceTimersByTimeAsync(1000);
    
    // Allow any pending promises to resolve
    await Promise.resolve();
    
    // Wait for the continuous insert to complete
    await promise;

    // Verify the tweet was created and metrics were incremented
    expect(createTweetData).toHaveBeenCalled();
    expect(tweetServiceMock.createTweet).toHaveBeenCalled();
    expect(metrics.tweetCounter.inc).toHaveBeenCalledWith({ status: 'created' });
  });

  it('should handle database connection errors', async () => {
    const error = new Error('DB connection failed');
    (connectDB as jest.Mock).mockRejectedValueOnce(error);

    await continuousInsert({ maxIterations: 1 });
    
    expect(console.error).toHaveBeenCalledWith('Failed to start continuous insert:', error);
    expect(metrics.errorCounter.inc).toHaveBeenCalledWith({ type: 'continuous_insert_startup' });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
  it('should handle graceful shutdown', async () => {
    // Start continuous insert
    const promise = continuousInsert({ maxIterations: 1 });
    
    // Allow the DB connection promise to resolve
    await Promise.resolve();
    
    // Advance timers a bit to ensure setup is complete
    await jest.advanceTimersByTimeAsync(100);
    
    // Allow any pending promises to resolve
    await Promise.resolve();
    
    // Trigger shutdown
    process.emit('SIGINT');
    
    // Allow shutdown handlers to execute
    await Promise.resolve();
    
    // Wait for the continuous insert to complete
    await promise;
    
    expect(tweetServiceMock.disconnect).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});