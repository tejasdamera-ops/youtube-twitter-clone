import 'dotenv/config';
import { connectDB } from './db/index.js';
import { app } from './app.js';
import mongoose from 'mongoose';
try {
  for (const key of ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET']) {
    if (!process.env[key]) throw new Error(`Set ${key} in .env`);
  }
  await connectDB();
  const server = app.listen(process.env.PORT || 8000, () => console.log(`Local: http://localhost:${process.env.PORT || 8000}`));
  const stop = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error('Startup failed:', error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[database URI]'));
  process.exitCode = 1;
}

