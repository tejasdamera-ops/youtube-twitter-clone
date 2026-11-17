import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';
import { Subscription } from '../models/subscription.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { text, publicUser } from '../utils/validation.js';

const safe = user => { const obj = user.toObject(); delete obj.password; delete obj.refreshToken; return obj; };
const cookies = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
async function session(user, res) {
  const accessToken = user.generateAccessToken();
  const refreshToken = jwt.sign({ _id: user._id, jti: randomUUID() }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' });
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.cookie('accessToken', accessToken, { ...cookies(), maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookies(), maxAge: 7 * 86400000 });
  return { user: safe(user), accessToken };
}
function emailAddress(value) {
  const email = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address');
  return email;
}
function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value) > 72) throw new ApiError(400, 'Password must contain at least 8 characters and at most 72 bytes');
  return value;
}
export const registerUser = asyncHandler(async (req, res) => {
  const username = text(req.body.username, 'Username', 30).toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new ApiError(400, 'Username must contain 3–30 letters, numbers or underscores');
  const email = emailAddress(req.body.email), fullName = text(req.body.fullName, 'Full name', 80), password = passwordValue(req.body.password);
  if (await User.exists({ $or: [{ username }, { email }] })) throw new ApiError(409, 'Username or email is already registered');
  const avatar = await uploadOnCloudinary(req.files?.avatar?.[0]?.path);
  const cover = await uploadOnCloudinary(req.files?.coverImage?.[0]?.path);
  const user = await User.create({ username, email, fullName, password, avatar: avatar?.secure_url || '/avatar.svg', coverImage: cover?.secure_url || '' });
  res.status(201).json(new ApiResponse(201, safe(user), 'Account created. You can sign in now.'));
});
export const loginUser = asyncHandler(async (req, res) => {
  const identifier = text(req.body.username || req.body.email, 'Username or email', 254).toLowerCase();
  const password = req.body.password;
  if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) throw new ApiError(400, 'Enter your password');
  const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
  if (!user || !await user.isPasswordCorrect(password)) throw new ApiError(401, 'Incorrect username or password');
  res.json(new ApiResponse(200, await session(user, res), 'Signed in'));
});
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 }, $inc: { tokenVersion: 1 } });
  res.clearCookie('accessToken', cookies()).clearCookie('refreshToken', cookies()).json(new ApiResponse(200, {}, 'Signed out'));
});
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  let decoded;
  try { decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET); } catch { throw new ApiError(401, 'Invalid refresh token'); }
  const user = await User.findOneAndUpdate({ _id: decoded._id, refreshToken: token }, { $unset: { refreshToken: 1 } }, { returnDocument: 'after' });
  if (!user) throw new ApiError(401, 'Refresh token has expired or was already used');
  res.json(new ApiResponse(200, await session(user, res), 'Session refreshed'));
});
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const newPassword = passwordValue(req.body.newPassword);
  const user = await User.findById(req.user._id);
  if (typeof req.body.oldPassword !== 'string' || !await user.isPasswordCorrect(req.body.oldPassword)) throw new ApiError(400, 'Current password is incorrect');
  user.password = newPassword; user.refreshToken = undefined; user.tokenVersion += 1; await user.save();
  res.clearCookie('accessToken', cookies()).clearCookie('refreshToken', cookies()).json(new ApiResponse(200, {}, 'Password changed. Sign in again.'));
});
export const getCurrentUser = asyncHandler(async (req, res) => res.json(new ApiResponse(200, req.user)));
export const updateAccountDetails = asyncHandler(async (req, res) => {
  const fullName = text(req.body.fullName, 'Full name', 80), email = emailAddress(req.body.email);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { fullName, email } }, { returnDocument: 'after', runValidators: true }).select('-password -refreshToken');
  res.json(new ApiResponse(200, user, 'Profile updated'));
});
const updateImage = field => asyncHandler(async (req, res) => {
  if (!req.file?.path) throw new ApiError(400, 'Choose an image');
  const media = await uploadOnCloudinary(req.file.path);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { [field]: media.secure_url } }, { returnDocument: 'after' }).select('-password -refreshToken');
  res.json(new ApiResponse(200, user, 'Image updated'));
});
export const updateAvatar = updateImage('avatar');
export const updateUserCoverImage = updateImage('coverImage');
export const getUserChannelDetails = asyncHandler(async (req, res) => {
  const channel = await User.findOne({ username: req.params.username.toLowerCase() }).select(publicUser).lean();
  if (!channel) throw new ApiError(404, 'Channel not found');
  const [subscribersCount, channelsSubscribedToCount, isSubscribed] = await Promise.all([
    Subscription.countDocuments({ channel: channel._id }), Subscription.countDocuments({ subscriber: channel._id }),
    req.user ? Subscription.exists({ subscriber: req.user._id, channel: channel._id }) : false
  ]);
  res.json(new ApiResponse(200, { ...channel, subscribersCount, channelsSubscribedToCount, isSubscribed: Boolean(isSubscribed) }));
});
export const getChannelHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('watchHistory');
  const videos = await Video.find({ _id: { $in: user.watchHistory }, isPublished: true }).populate('owner', publicUser);
  const order = new Map(user.watchHistory.map((v, i) => [String(v), i]));
  videos.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  res.json(new ApiResponse(200, videos));
});


