import { Like } from '../models/like.model.js';
import { Video } from '../models/video.model.js';
import { Comment } from '../models/comment.model.js';
import { Tweet } from '../models/tweet.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { id, publicUser } from '../utils/validation.js';
const toggle = (field, Model, param) => asyncHandler(async (req, res) => {
  const target = await Model.findById(id(req.params[param]));
  if (!target || (field === 'video' && !target.isPublished)) throw new ApiError(404, 'Resource not found');
  const filter = { [field]: target._id, likedBy: req.user._id };
  const removed = await Like.findOneAndDelete(filter);
  if (!removed) await Like.create(filter);
  res.json(new ApiResponse(200, { isLiked: !removed, likesCount: await Like.countDocuments({ [field]: target._id }) }));
});
export const toggleVideoLike = toggle('video', Video, 'videoId');
export const toggleCommentLike = toggle('comment', Comment, 'commentId');
export const toggleTweetLike = toggle('tweet', Tweet, 'tweetId');
export const getLikedVideos = asyncHandler(async (req, res) => {
  const likes = await Like.find({ likedBy: req.user._id, video: { $exists: true } }).sort({ createdAt: -1 }).populate({ path: 'video', match: { isPublished: true }, populate: { path: 'owner', select: publicUser } });
  res.json(new ApiResponse(200, likes.map(l => l.video).filter(Boolean)));
});


