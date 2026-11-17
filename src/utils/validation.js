import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';
export function id(value) {
  if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) throw new ApiError(400, 'Invalid resource ID');
  return value;
}
export function text(value, name = 'Content', max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ApiError(400, `${name} is required and must be at most ${max} characters`);
  return value.trim();
}
export function pagination(query) {
  const page = Number(query.page ?? 1), limit = Number(query.limit ?? 12);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'Invalid pagination (limit must be 1–100)');
  return { page, limit, skip: (page - 1) * limit };
}
export function own(resource, user) {
  if (!resource) throw new ApiError(404, 'Resource not found');
  if (String(resource.owner?._id ?? resource.owner) !== String(user._id)) throw new ApiError(403, 'You do not own this resource');
  return resource;
}
export const publicUser = 'username fullName avatar coverImage';
export function pageResult(docs, totalDocs, page, limit) {
  return { docs, totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit), hasNextPage: page * limit < totalDocs };
}

