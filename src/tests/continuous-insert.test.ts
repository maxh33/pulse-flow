// import { connectDB } from '../config/mongodb.config';
// import { ObjectId } from 'mongodb';
// import Chance from 'chance';
// import { TweetService } from '../services/tweet.service';
// import { createTweetData } from '../factories/tweet.factory';
// import * as metrics from '../monitoring/metrics';
// import { continuousInsert } from '../scripts/continuous-insert';
// import { TweetDocument } from '../models/tweet';

// const chance = new Chance();

// jest.mock('../config/mongodb.config');
// jest.mock('chance');
// jest.mock('../services/tweet.service');
// jest.mock('../factories/tweet.factory');
// jest.mock('../monitoring/metrics');

// jest.setTimeout(10000);

// describe('continuousInsert', () => {
//   let tweetServiceMock: jest.Mocked<TweetService>;
//   let consoleSpy: jest.SpyInstance;
//   let processExitSpy: jest.SpyInstance;
  
//   const mockTweet: TweetDocument = {
//     tweetId: 'testTweetId',
//     user: 'testUser',
//     content: 'testContent',
//     timestamp: new Date(),
//     metrics: {
//       retweets: 0,
//       likes: 0,
//       comments: 0,
//     },
//     sentiment: 'neutral',
//     location: {
//       country: 'testCountry',
//       city: 'testCity',
//     },
//     platform: 'web',
//     tags: [],
//     _id: new ObjectId(),
//     __v: 0,
//     $assertPopulated: jest.fn(),
//     $clearModifiedPaths: jest.fn(),
//     $clone: jest.fn(),
//     $createModifiedPathsSnapshot: jest.fn(),
//   };

//   beforeAll(() => {
//     // Mock console methods
//     consoleSpy = jest.spyOn(console, 'log').mockImplementation();
//     jest.spyOn(console, 'error').mockImplementation();
    
//     // Mock process.exit
//     processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
//     // Mock chance
//     (chance.integer as jest.Mock).mockReturnValue(1000);
    
//     // Mock DB connection
//     (connectDB as jest.Mock).mockResolvedValue(undefined);
    
//     // Mock TweetService
//     tweetServiceMock = {
//       createTweet: jest.fn(),
//       disconnect: jest.fn().mockResolvedValue(undefined),
//     } as unknown as jest.Mocked<TweetService>;
//     (TweetService as unknown as jest.Mock).mockImplementation(() => tweetServiceMock);
    
//     // Mock tweet factory
//     (createTweetData as jest.Mock).mockReturnValue(mockTweet);
//   });

//   beforeEach(() => {
//     jest.useFakeTimers();
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//     jest.useRealTimers();
//   });

//   afterAll(() => {
//     consoleSpy.mockRestore();
//     processExitSpy.mockRestore();
//   });

//   it('should insert tweets with dynamic delays based on hour', async () => {
//     tweetServiceMock.createTweet.mockResolvedValue(mockTweet as any);
    
//     const peakHour = new Date();
//     peakHour.setHours(12);
    
//     jest.spyOn(Date.prototype, 'getHours')
//       .mockReturnValue(peakHour.getHours());
    
//     await continuousInsert({ maxIterations: 1 });
    
//     expect(chance.integer).toHaveBeenCalledWith({ min: 1000, max: 3000 });
//   }, 10000);

//   it('should handle tweet creation errors and retry', async () => {
//     const error = new Error('Tweet creation failed');
//     tweetServiceMock.createTweet.mockRejectedValue(error);

//     await continuousInsert({ maxIterations: 1 });
    
//     expect(console.error).toHaveBeenCalledWith('Insert failed:', error);
//     expect(metrics.errorCounter.inc).toHaveBeenCalledWith({ type: 'continuous_insert' });
//   }, 10000);

//   it('should handle graceful shutdown on SIGTERM', async () => {
//     tweetServiceMock.createTweet.mockResolvedValue(mockTweet as any);

//     const promise = continuousInsert({ maxIterations: 1 });
//     process.emit('SIGTERM');
//     await promise;
    
//     expect(tweetServiceMock.disconnect).toHaveBeenCalled();
//   }, 10000);

//   it('should handle graceful shutdown on SIGINT', async () => {
//     tweetServiceMock.createTweet.mockResolvedValue(mockTweet as any);

//     const promise = continuousInsert({ maxIterations: 1 });
//     process.emit('SIGINT');
//     await promise;
    
//     expect(tweetServiceMock.disconnect).toHaveBeenCalled();
//   }, 10000);

//   it('should handle database connection errors', async () => {
//     const dbError = new Error('DB connection failed');
//     (connectDB as jest.Mock).mockRejectedValue(dbError);

//     await continuousInsert({ maxIterations: 1 });
    
//     expect(console.error).toHaveBeenCalledWith('Insert failed:', dbError);
//   }, 10000);

//   it('should log tweet information correctly', async () => {
//     tweetServiceMock.createTweet.mockResolvedValue(mockTweet as any);

//     await continuousInsert({ maxIterations: 1 });
    
//     expect(console.log).toHaveBeenCalledWith(expect.objectContaining({
//       tweetId: mockTweet.tweetId,
//       user: mockTweet.user
//     }));
//   }, 10000);
// });