import { Router } from 'express';
import * as tweet from '../controllers/tweet.controller.js';
import { verifyJWT, optionalJWT } from '../middlewares/auth.middleware.js';
const router = Router();
router.get('/', optionalJWT, tweet.getTweets);
router.get('/user/:userId', optionalJWT, tweet.getUserTweets);
router.use(verifyJWT);
router.post('/', tweet.createTweet);
router.route('/:tweetId').patch(tweet.updateTweet).delete(tweet.deleteTweet);
export default router;

