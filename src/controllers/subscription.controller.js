import { User } from '../models/user.model.js';
import { Subscription } from '../models/subscription.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/APIresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { id, publicUser } from '../utils/validation.js';
export const toggleSubscription = asyncHandler(async (req, res) => {
  const channel = id(req.params.channelId);
  if (String(req.user._id) === channel) throw new ApiError(400, 'You cannot subscribe to yourself');
  if (!await User.exists({ _id: channel })) throw new ApiError(404, 'Channel not found');
  const filter = { channel, subscriber: req.user._id };
  const removed = await Subscription.findOneAndDelete(filter);
  if (!removed) await Subscription.create(filter);
  res.json(new ApiResponse(200, { isSubscribed: !removed, subscribersCount: await Subscription.countDocuments({ channel }) }));
});
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscription.find({ channel: id(req.params.channelId) }).populate('subscriber', publicUser);
  res.json(new ApiResponse(200, subscribers));
});
export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const channels = await Subscription.find({ subscriber: id(req.params.subscriberId) }).populate('channel', publicUser);
  res.json(new ApiResponse(200, channels));
});


