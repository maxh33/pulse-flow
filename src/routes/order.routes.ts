import { Router } from 'express';
import { TweetService } from '../services/tweet.service';
import { TweetModel } from '../models/tweet';

const router = Router();
const tweetService = new TweetService();

router.post('/', async (req, res, next) => {
  try {
    const tweet = await tweetService.createTweet(req.body);
    res.status(201).json(tweet);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tweets = await TweetModel.find();
    res.json(tweets);
  } catch (error) {
    next(error);
  }
});

export { router as orderRoutes };
