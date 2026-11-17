import { Playlist } from '../models/playlist.model.js';
import { Video } from '../models/video.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { id, text, own, publicUser } from '../utils/validation.js';
const populated = query => query.populate('owner', publicUser).populate({ path: 'videos', match: { isPublished: true }, populate: { path: 'owner', select: publicUser } });
export const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.create({ name: text(req.body.name, 'Name', 100), description: text(req.body.description, 'Description', 1000), owner: req.user._id });
  res.status(201).json(new ApiResponse(201, playlist, 'Playlist created'));
});
export const getUserPlaylists = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await populated(Playlist.find({ owner: id(req.params.userId) }).sort({ createdAt: -1 }))));
});
export const getPlaylistById = asyncHandler(async (req, res) => {
  const playlist = await populated(Playlist.findById(id(req.params.playlistId)));
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  res.json(new ApiResponse(200, playlist));
});
export const updatePlaylist = asyncHandler(async (req, res) => {
  const playlist = own(await Playlist.findById(id(req.params.playlistId)), req.user);
  if (req.body.name === undefined && req.body.description === undefined) throw new ApiError(400, 'Provide a name or description');
  if (req.body.name !== undefined) playlist.name = text(req.body.name, 'Name', 100);
  if (req.body.description !== undefined) playlist.description = text(req.body.description, 'Description', 1000);
  await playlist.save(); res.json(new ApiResponse(200, playlist, 'Playlist updated'));
});
export const deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = own(await Playlist.findById(id(req.params.playlistId)), req.user);
  await playlist.deleteOne(); res.json(new ApiResponse(200, {}, 'Playlist deleted'));
});
const changeVideo = remove => asyncHandler(async (req, res) => {
  const playlist = own(await Playlist.findById(id(req.params.playlistId)), req.user);
  const videoId = id(req.params.videoId);
  if (!remove && !await Video.exists({ _id: videoId, isPublished: true })) throw new ApiError(404, 'Video not found');
  const updated = await Playlist.findByIdAndUpdate(playlist._id, remove ? { $pull: { videos: videoId } } : { $addToSet: { videos: videoId } }, { returnDocument: 'after' });
  res.json(new ApiResponse(200, updated, remove ? 'Video removed' : 'Video saved'));
});
export const addVideoToPlaylist = changeVideo(false);
export const removeVideoFromPlaylist = changeVideo(true);


