import { Comment } from '../models/comment.model.js';
import { Video } from '../models/video.model.js';
import { Like } from '../models/like.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { id, text, own, pagination, pageResult, publicUser } from '../utils/validation.js';
async function visible(videoId) {
  if (!await Video.exists({ _id: id(videoId), isPublished: true })) throw new ApiError(404, 'Video not found');
}
export const getVideoComments = asyncHandler(async (req, res) => {
  await visible(req.params.videoId);
  const { page, limit, skip } = pagination(req.query), filter = { video: req.params.videoId };
  const [docs, total] = await Promise.all([Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', publicUser), Comment.countDocuments(filter)]);
  res.json(new ApiResponse(200, pageResult(docs, total, page, limit)));
});
export const addComment = asyncHandler(async (req, res) => {
  await visible(req.params.videoId);
  const comment = await Comment.create({ content: text(req.body.content, 'Comment', 2000), video: req.params.videoId, owner: req.user._id });
  await comment.populate('owner', publicUser);
  res.status(201).json(new ApiResponse(201, comment, 'Comment added'));
});
export const updateComment = asyncHandler(async (req, res) => {
  const comment = own(await Comment.findById(id(req.params.commentId)), req.user);
  comment.content = text(req.body.content ?? req.body.newContent, 'Comment', 2000); await comment.save();
  res.json(new ApiResponse(200, comment, 'Comment updated'));
});
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = own(await Comment.findById(id(req.params.commentId)), req.user);
  await Like.deleteMany({ comment: comment._id }); await comment.deleteOne();
  res.json(new ApiResponse(200, {}, 'Comment deleted'));
});


