import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
export async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri) throw new Error('Set MONGODB_URI in .env');
  return mongoose.connect(uri, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
}

