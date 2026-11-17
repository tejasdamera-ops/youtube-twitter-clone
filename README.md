# Streamline

A full-stack video and community app built with Express 5, MongoDB/Mongoose, Cloudinary, and a responsive vanilla JavaScript frontend. The frontend is served by Express, so there is no separate frontend server or build step.

## Run locally

Requires Node.js 22+ and MongoDB (local or Atlas).

1. Run `npm install`.
2. Copy `.env.example` to `.env` if you do not already have one. Set the MongoDB URI and two distinct random JWT secrets. Existing `MONGODB_URL` configurations are also supported. Use a valid Atlas connection string; the app selects the `videoTube` database without appending a path to the URI.
3. Set Cloudinary credentials to enable media uploads. Registration works without a profile image or Cloudinary.
4. Run `npm run dev` for development, or `npm start`.
5. Open **http://localhost:8000** (or the port in `.env`).

The existing Atlas hostname failed DNS resolution during verification. Your original `.env` has been preserved. Replace the connection string with the correct one from your Atlas cluster and check its network access configuration.

## Disposable local demo

Run `npm run demo`, then open **http://localhost:8000**. Sign in with username **demo** and password **demoStream123**. This starts a separate temporary MongoDB process, generates temporary JWT secrets, and seeds two sample community posts. It never connects to the configured database. Data disappears when the demo stops. Media uploads still use Cloudinary if configured; those uploads are real and may remain in your Cloudinary account. Use `DEMO_PORT` to select another port.

The first demo/test run may download a MongoDB binary and needs internet access. The MongoDB process must be allowed to run on your machine. Demo mode is for local development only.

## Features

- Registration, sign-in/out, rotating refresh cookies, session revocation, password changes, profile details, avatar and cover uploads.
- Public video discovery, literal title search, sorting, pagination, playback, view tracking, and watch history.
- Creator studio with channel statistics, video uploads, metadata/thumbnail edits, publish toggles, and deletion.
- Public community feed, creator posts, post editing/deletion, and likes.
- Video comments with ownership-protected editing/deletion and API support for comment likes.
- Video likes, liked videos, channel subscriptions, subscriber lists, public channel profiles.
- Playlists with create/update/delete, duplicate-safe video additions, and removals.
- Responsive layouts, keyboard-accessible forms and dialogs, loading/error/empty states, deletion confirmation, and session refresh.

## Verification

```sh
npm run check
npm test
npm audit
```

`npm test` uses its own temporary MongoDB and HTTP server. It does not load `.env` or touch your application database. The 15 integration scenarios exercise authentication, session rotation and revocation, input validation, private videos, ownership checks, uploads, comments, posts, all like targets, subscriptions, playlists, statistics, and dependent-record cleanup. Cloudinary upload responses are stubbed in tests; live Cloudinary credentials and playback were not verified.

## API overview

All routes start with `/api/v1`. Responses use `{ statusCode, success, data, message }`; failures use JSON with an appropriate HTTP status. Lists of videos, posts, and comments return `data.docs`, `totalDocs`, `page`, `limit`, `totalPages`, and `hasNextPage`. Page must be a positive integer; limit is 1–100.

| Area | Routes |
| --- | --- |
| Health | `GET /healthcheck` (includes database status) |
| Users | `POST /users/register`, `/users/login`, `/users/logout`, `/users/refresh-token`, `/users/change-password`; `GET /users/current-user`, `/users/history`, `/users/channel/:username`; `PATCH /users/update-user`, `/users/update-avatar`, `/users/update-coverImage` |
| Videos | `GET /videos?query=&sortBy=createdAt&sortType=desc&page=1&limit=12&userId=`, `POST /videos`, `GET/PATCH/DELETE /videos/:videoId`, `PATCH /videos/toggle/publish/:videoId` |
| Community | `GET/POST /tweets`, `GET /tweets/user/:userId`, `PATCH/DELETE /tweets/:tweetId` |
| Comments | `GET/POST /comments/:videoId`, `PATCH/DELETE /comments/c/:commentId` |
| Likes | `POST /likes/toggle/v/:videoId`, `/likes/toggle/c/:commentId`, `/likes/toggle/t/:tweetId`; `GET /likes/videos` |
| Subscriptions | `GET/POST /subscriptions/c/:channelId`, `GET /subscriptions/u/:subscriberId` |
| Playlists | `POST /playlist`, `GET/PATCH/DELETE /playlist/:playlistId`, `GET /playlist/user/:userId`, `PATCH /playlist/add/:videoId/:playlistId`, `/playlist/remove/:videoId/:playlistId` |
| Dashboard | `GET /dashboard/stats`, `/dashboard/videos` |

Protected routes accept HttpOnly cookies or `Authorization: Bearer <accessToken>`. Cookie refresh rotates the refresh token and sets both cookies. Profile and public owner responses omit passwords and refresh tokens. Register/login accept JSON; uploads use multipart form data. Video uploads require `title`, `description`, `videoFile`, and `thumbnail`; image uploads accept JPEG/PNG/WebP and videos accept MP4/WebM/QuickTime, up to 100 MB per file. Registration accepts optional `avatar` and `coverImage` files. Comment/post updates accept `content` and retain compatibility with `newContent`.

Use HTTPS with `NODE_ENV=production` for secure cookies. The default frontend uses the same origin. Cross-origin deployments require an explicit comma-separated `CORS_ORIGIN` allowlist; cross-site cookies would require adjusting the cookie policy. Uploaded temporary files are private and cleaned after requests. Video deletion removes related comments, likes, playlist entries, and watch history from MongoDB. Existing Cloudinary assets are retained; production media lifecycle cleanup and transaction/retry handling for multi-document deletion are future hardening work. Put a shared rate limiter at the edge for a public deployment.
