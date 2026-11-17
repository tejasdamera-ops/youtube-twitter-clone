import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
async function authenticate(req) {
  const token = req.cookies?.accessToken || req.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return;
  let decoded;
  try { decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); }
  catch { throw new ApiError(401, 'Your session has expired. Please sign in again.'); }
  req.user = await User.findById(decoded._id).select('-password -refreshToken');
  if (!req.user) throw new ApiError(401, 'Invalid access token');
  if ((decoded.tokenVersion || 0) !== req.user.tokenVersion) throw new ApiError(401, 'Please sign in again');
}
export const verifyJWT = asyncHandler(async (req, res, next) => {
  await authenticate(req);
  if (!req.user) throw new ApiError(401, 'Please sign in to continue');
  next();
});
export const optionalJWT = asyncHandler(async (req, res, next) => { await authenticate(req); next(); });

