import { Tweet } from '../models/tweet.model.js';
import { Like } from '../models/like.model.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { id, text, own, pagination, pageResult, publicUser } from '../utils/validation.js';

async function list(req, res, filter) {
  const { page, limit, skip } = pagination(req.query);
  const [tweets, total] = await Promise.all([Tweet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', publicUser).lean(), Tweet.countDocuments(filter)]);
  const docs = await Promise.all(tweets.map(async t => ({ ...t, likesCount: await Like.countDocuments({ tweet: t._id }), isLiked: Boolean(req.user && await Like.exists({ tweet: t._id, likedBy: req.user._id })) })));
  res.json(new ApiResponse(200, pageResult(docs, total, page, limit)));
}
export const getTweets = asyncHandler(async (req, res) => list(req, res, {}));
export const getUserTweets = asyncHandler(async (req, res) => list(req, res, { owner: id(req.params.userId) }));
export const createTweet = asyncHandler(async (req, res) => {
  const tweet = await Tweet.create({ content: text(req.body.content, 'Post', 1000), owner: req.user._id });
  await tweet.populate('owner', publicUser);
  res.status(201).json(new ApiResponse(201, tweet, 'Post shared'));
});
export const updateTweet = asyncHandler(async (req, res) => {
  const tweet = own(await Tweet.findById(id(req.params.tweetId)), req.user);
  tweet.content = text(req.body.content ?? req.body.newContent, 'Post', 1000); await tweet.save();
  res.json(new ApiResponse(200, tweet, 'Post updated'));
});
export const deleteTweet = asyncHandler(async (req, res) => {
  const tweet = own(await Tweet.findById(id(req.params.tweetId)), req.user);
  await Like.deleteMany({ tweet: tweet._id }); await tweet.deleteOne();
  res.json(new ApiResponse(200, {}, 'Post deleted'));
});


