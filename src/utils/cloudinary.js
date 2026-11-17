import { v2 as cloudinary } from 'cloudinary';
import { unlink } from 'node:fs/promises';
import { ApiError } from './ApiError.js';
export const uploadOnCloudinary = async (path) => {
  if (!path) return null;
  try {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return await cloudinary.uploader.upload(path, { resource_type: 'auto', secure: true });
  } catch {
    throw new ApiError(502, 'Media upload failed. Check the Cloudinary configuration and try again.');
  } finally { await unlink(path).catch(() => {}); }
};

