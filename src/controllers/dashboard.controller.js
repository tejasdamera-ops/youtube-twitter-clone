import { Video } from '../models/video.model.js';
import { Like } from '../models/like.model.js';
import { Subscription } from '../models/subscription.model.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/validation.js';
export const getChannelStats = asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user._id }).select('_id views');
  const [totalSubscribers, totalLikes] = await Promise.all([Subscription.countDocuments({ channel: req.user._id }), Like.countDocuments({ video: { $in: videos.map(v => v._id) } })]);
  res.json(new ApiResponse(200, { totalVideos: videos.length, totalViews: videos.reduce((sum, v) => sum + v.views, 0), totalSubscribers, totalLikes }));
});
export const getChannelVideos = asyncHandler(async (req, res) => res.json(new ApiResponse(200, await Video.find({ owner: req.user._id }).sort({ createdAt: -1 }).populate('owner', publicUser))));


