import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import { Comment } from '../models/comment.model.js';
import { Like } from '../models/like.model.js';
import { Playlist } from '../models/playlist.model.js';
import { Subscription } from '../models/subscription.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { id, text, own, pagination, pageResult, publicUser } from '../utils/validation.js';

export const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { isPublished: true };
  if (req.query.userId) filter.owner = id(req.query.userId);
  if (req.query.query) filter.title = { $regex: text(req.query.query, 'Search', 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const sortBy = ['createdAt', 'views', 'title', 'duration'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const [docs, total] = await Promise.all([Video.find(filter).sort({ [sortBy]: req.query.sortType === 'asc' ? 1 : -1, _id: -1 }).skip(skip).limit(limit).populate('owner', publicUser), Video.countDocuments(filter)]);
  res.json(new ApiResponse(200, pageResult(docs, total, page, limit)));
});
export const publishAVideo = asyncHandler(async (req, res) => {
  const title = text(req.body.title, 'Title', 150), description = text(req.body.description, 'Description');
  if (!req.files?.videoFile?.[0] || !req.files?.thumbnail?.[0]) throw new ApiError(400, 'Video and thumbnail are required');
  const media = await uploadOnCloudinary(req.files.videoFile[0].path);
  const thumbnail = await uploadOnCloudinary(req.files.thumbnail[0].path);
  const video = await Video.create({ title, description, videoFile: media.secure_url, thumbnail: thumbnail.secure_url, duration: media.duration || 0, owner: req.user._id });
  res.status(201).json(new ApiResponse(201, video, 'Video published'));
});
export const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(id(req.params.videoId)).populate('owner', publicUser);
  if (!video || (!video.isPublished && String(video.owner._id) !== String(req.user?._id))) throw new ApiError(404, 'Video not found');
  if (video.isPublished) {
    await Video.updateOne({ _id: video._id }, { $inc: { views: 1 } }); video.views += 1;
    if (req.user) {
      await User.updateOne({ _id: req.user._id }, { $pull: { watchHistory: video._id } });
      await User.updateOne({ _id: req.user._id }, { $push: { watchHistory: { $each: [video._id], $position: 0, $slice: 200 } } });
    }
  }
  const [likesCount, liked, subscribed, subscribersCount] = await Promise.all([
    Like.countDocuments({ video: video._id }), req.user ? Like.exists({ video: video._id, likedBy: req.user._id }) : false,
    req.user ? Subscription.exists({ channel: video.owner._id, subscriber: req.user._id }) : false,
    Subscription.countDocuments({ channel: video.owner._id })
  ]);
  res.json(new ApiResponse(200, { ...video.toObject(), likesCount, isLiked: Boolean(liked), isSubscribed: Boolean(subscribed), subscribersCount }));
});
export const updateVideo = asyncHandler(async (req, res) => {
  const video = own(await Video.findById(id(req.params.videoId)), req.user);
  if (req.body.title === undefined && req.body.description === undefined && !req.file) throw new ApiError(400, 'Provide a title, description or thumbnail');
  if (req.body.title !== undefined) video.title = text(req.body.title, 'Title', 150);
  if (req.body.description !== undefined) video.description = text(req.body.description, 'Description');
  if (req.file) video.thumbnail = (await uploadOnCloudinary(req.file.path)).secure_url;
  await video.save(); res.json(new ApiResponse(200, video, 'Video updated'));
});
export const deleteVideo = asyncHandler(async (req, res) => {
  const video = own(await Video.findById(id(req.params.videoId)), req.user);
  const comments = await Comment.find({ video: video._id }).select('_id');
  await Like.deleteMany({ $or: [{ video: video._id }, { comment: { $in: comments.map(c => c._id) } }] });
  await Comment.deleteMany({ video: video._id });
  await Playlist.updateMany({ videos: video._id }, { $pull: { videos: video._id } });
  await User.updateMany({ watchHistory: video._id }, { $pull: { watchHistory: video._id } });
  await video.deleteOne();
  res.json(new ApiResponse(200, {}, 'Video deleted'));
});
export const togglePublishStatus = asyncHandler(async (req, res) => {
  const video = own(await Video.findById(id(req.params.videoId)), req.user);
  video.isPublished = !video.isPublished; await video.save();
  res.json(new ApiResponse(200, video, 'Visibility updated'));
});


