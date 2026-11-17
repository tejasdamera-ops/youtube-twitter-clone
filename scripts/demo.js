import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Tweet } from '../src/models/tweet.model.js';

// Separate disposable database. Never connects to MONGODB_URI or MONGODB_URL.
process.env.ACCESS_TOKEN_SECRET = randomBytes(32).toString('hex');
process.env.REFRESH_TOKEN_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'development';
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri(), { dbName:'streamline-demo' });
const user = await User.create({ username:'demo', email:'demo@streamline.local', fullName:'Demo Creator', password:'demoStream123' });
await Tweet.create([
  { owner:user._id, content:'Welcome to the Streamline demo. This is a temporary local space to explore the app. Sign in as demo with password demoStream123 to try posts, playlists, and the creator studio.' },
  { owner:user._id, content:'What are you making next? Share a small idea, a work in progress, or something that sparked your curiosity today.' }
]);
const port = process.env.DEMO_PORT || 8000;
const server = app.listen(port, () => console.log(`Disposable demo: http://localhost:${port}\nSign in: demo / demoStream123\nAll demo data is removed when this process stops. Cloudinary credentials are needed for media uploads.`));
async function stop() { await new Promise(r => server.close(r)); await mongoose.disconnect(); await mongo.stop(); process.exit(0); }
process.on('SIGINT',stop); process.on('SIGTERM',stop);
