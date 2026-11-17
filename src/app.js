import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import userRouter from './routes/user.routes.js';
import healthcheckRouter from './routes/healthcheck.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import videoRouter from './routes/video.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : false, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.body ??= {};
  // Uploaded temporary files are private and are removed even after validation fails.
  res.on('finish', () => {
    const files = [...(req.file ? [req.file] : []), ...Object.values(req.files || {}).flat()];
    files.forEach(file => unlink(file.path).catch(() => {}));
  });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin')) {
    const allowed = [`${req.protocol}://${req.get('host')}`, ...(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim())];
    if (!allowed.includes(req.get('Origin'))) return res.status(403).json({ success: false, message: 'Origin is not allowed' });
  }
  next();
});
app.use('/api/v1/healthcheck', healthcheckRouter);
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Database is unavailable. Check the server configuration.' });
  next();
});
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tweets', tweetRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/videos', videoRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/playlist', playlistRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API endpoint not found' }));
app.use('/temp', (req, res) => res.sendStatus(404));
app.use(express.static(resolve('public')));
app.use((req, res) => res.status(404).json({ success: false, message: 'Page not found' }));
app.use((error, req, res, next) => {
  const status = error.code === 11000 ? 409 : error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'MulterError' ? 400 : error.statusCode || error.status || 500;
  const message = error.code === 11000 ? 'This username, email or relationship already exists' : status >= 500 && !error.statusCode ? 'Something went wrong. Please try again.' : error.message;
  res.status(status).json({ statusCode: status, success: false, data: null, message, errors: [] });
});
export { app };

