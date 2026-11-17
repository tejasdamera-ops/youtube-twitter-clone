import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { v2 as cloudinary } from 'cloudinary';
import { readdir } from 'node:fs/promises';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Video } from '../src/models/video.model.js';
import { Like } from '../src/models/like.model.js';
import { Comment } from '../src/models/comment.model.js';
import { Playlist } from '../src/models/playlist.model.js';
import { Subscription } from '../src/models/subscription.model.js';

let mongo, server, base, alice, bob, token, bobToken, refresh, video, comment, post, playlist;
const uploadOriginal = cloudinary.uploader.upload;
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = 'isolated-test-access-secret';
  process.env.REFRESH_TOKEN_SECRET = 'isolated-test-refresh-secret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName:'streamline-test' });
  await Promise.all([User.init(), Subscription.init()]);
  cloudinary.uploader.upload = async path => ({ secure_url:'https://example.com/' + (path.endsWith('.mp4') ? 'video.mp4' : 'image.png'), duration:125 });
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening',r));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { cloudinary.uploader.upload = uploadOriginal; if (server) await new Promise(r => server.close(r)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
async function request(path, { method='GET', body, auth, cookie, origin } = {}) {
  const response = await fetch(base + '/api/v1' + path, { method, headers:{ ...(body && !(body instanceof FormData) ? { 'Content-Type':'application/json' } : {}), ...(auth ? { Authorization:'Bearer ' + auth } : {}), ...(cookie ? { Cookie:cookie } : {}), ...(origin ? { Origin:origin } : {}) }, body:body ? body instanceof FormData ? body : JSON.stringify(body) : undefined });
  return { status:response.status, json:await response.json(), cookies:response.headers.getSetCookie() };
}
const expect = (result, code) => { assert.equal(result.status,code,JSON.stringify(result.json)); return result.json.data; };
test('health, frontend assets, unknown endpoints, and origin protection', async () => {
  expect(await request('/healthcheck'),200);
  assert.match(await (await fetch(base)).text(), /streamline/);
  assert.equal((await fetch(base + '/app.js')).status,200);
  assert.equal((await fetch(base + '/temp/private.mp4')).status,404);
  expect(await request('/unknown'),404);
  expect(await request('/users/login',{method:'POST',body:{},origin:'https://evil.example'}),403);
});
test('registration validates inputs, normalizes identity, and never exposes secrets', async () => {
  expect(await request('/users/register',{method:'POST',body:{ username:'ab',email:'wrong',password:'short',fullName:'A' }}),400);
  alice = expect(await request('/users/register',{method:'POST',body:{ username:'Alice',email:'ALICE@example.com',password:' testpass123 ',fullName:'Alice' }}),201);
  bob = expect(await request('/users/register',{method:'POST',body:{ username:'bob',email:'bob@example.com',password:'testpass123',fullName:'Bob' }}),201);
  assert.equal(alice.username,'alice'); assert.equal(alice.email,'alice@example.com'); assert.equal(alice.password,undefined);
  assert.notEqual((await User.findById(alice._id)).password,' testpass123 ');
  expect(await request('/users/register',{method:'POST',body:{ username:'ALICE',email:'other@example.com',password:'testpass123',fullName:'Other' }}),409);
});
test('login, cookie settings, authentication, and token rotation', async () => {
  expect(await request('/users/login',{method:'POST',body:{ username:'alice',password:'wrong' }}),401);
  const result = await request('/users/login',{method:'POST',body:{ email:'ALICE@example.com',password:' testpass123 ' }});
  const session = expect(result,200); token = session.accessToken;
  refresh = result.cookies.find(c => c.startsWith('refreshToken=')).split(';')[0];
  assert(result.cookies.every(c => c.includes('HttpOnly') && c.includes('SameSite=Lax')));
  assert.equal(session.user.refreshToken,undefined);
  bobToken = expect(await request('/users/login',{method:'POST',body:{ username:'bob',password:'testpass123' }}),200).accessToken;
  expect(await request('/users/current-user'),401);
  expect(await request('/users/current-user',{auth:'bad-token'}),401);
  expect(await request('/users/current-user',{auth:token}),200);
  const next = await request('/users/refresh-token',{method:'POST',cookie:refresh,body:{}}); expect(next,200);
  expect(await request('/users/refresh-token',{method:'POST',cookie:refresh,body:{}}),401);
  token = next.json.data.accessToken;
});
test('video publishing requires authentication and required media', async () => {
  expect(await request('/videos',{method:'POST',body:{ title:'Test',description:'Desc' }}),401);
  expect(await request('/videos',{method:'POST',auth:token,body:{ title:'Test',description:'Desc' }}),400);
  const data = new FormData(); data.set('title','Building a [tiny] world'); data.set('description','A creative experiment');
  data.set('videoFile',new Blob(['video'],{type:'video/mp4'}),'clip.mp4'); data.set('thumbnail',new Blob(['image'],{type:'image/png'}),'cover.png');
  video = expect(await request('/videos',{method:'POST',auth:token,body:data}),201);
  assert.equal(video.duration,125); assert.match(video.videoFile,/^https:/);
});
test('video browsing validates IDs, escapes search, paginates, populates owners, and records views/history', async () => {
  expect(await request('/videos/not-an-id'),400); expect(await request('/videos?limit=-2'),400);
  const result = expect(await request('/videos?query=' + encodeURIComponent('[tiny]')),200);
  assert.equal(result.totalDocs,1); assert.equal(result.docs[0].owner.password,undefined);
  expect(await request('/videos/' + video._id,{auth:bobToken}),200);
  const history = expect(await request('/users/history',{auth:bobToken}),200); assert.equal(history[0]._id,video._id);
  assert.equal((await Video.findById(video._id)).views,1);
});
test('video updates enforce ownership and unpublished videos are private', async () => {
  expect(await request('/videos/' + video._id,{method:'PATCH',auth:bobToken,body:{title:'Stolen'}}),403);
  expect(await request('/videos/' + video._id,{method:'PATCH',auth:token,body:{title:'Updated [tiny] world'}}),200);
  expect(await request('/videos/toggle/publish/' + video._id,{method:'PATCH',auth:token}),200);
  assert.equal(expect(await request('/videos'),200).totalDocs,0);
  expect(await request('/videos/' + video._id),404);
  expect(await request('/videos/' + video._id,{auth:token}),200);
  expect(await request('/videos/toggle/publish/' + video._id,{method:'PATCH',auth:token}),200);
});
test('comments support CRUD, owner checks, and correct updated responses', async () => {
  comment = expect(await request('/comments/' + video._id,{method:'POST',auth:bobToken,body:{content:'Nice work'}}),201);
  expect(await request('/comments/c/' + comment._id,{method:'PATCH',auth:token,body:{content:'No'}}),403);
  const updated = expect(await request('/comments/c/' + comment._id,{method:'PATCH',auth:bobToken,body:{newContent:'Great work'}}),200); assert.equal(updated.content,'Great work');
  assert.equal(expect(await request('/comments/' + video._id),200).totalDocs,1);
});
test('community posts validate content, support feed and author CRUD, and enforce ownership', async () => {
  expect(await request('/tweets',{method:'POST',auth:token,body:{content:'  '}}),400);
  post = expect(await request('/tweets',{method:'POST',auth:token,body:{content:'Hello community'}}),201);
  expect(await request('/tweets/' + post._id,{method:'PATCH',auth:bobToken,body:{content:'Stolen'}}),403);
  assert.equal(expect(await request('/tweets/' + post._id,{method:'PATCH',auth:token,body:{content:'Edited'}}),200).content,'Edited');
  assert.equal(expect(await request('/tweets/user/' + alice._id),200).totalDocs,1);
  assert.equal(expect(await request('/tweets'),200).totalDocs,1);
});
test('all three like targets toggle correctly and liked videos exclude other targets', async () => {
  for (const [type, target] of [['v',video],['c',comment],['t',post]]) {
    const path = '/likes/toggle/' + type + '/' + target._id;
    assert.equal(expect(await request(path,{method:'POST',auth:bobToken}),200).isLiked,true);
    assert.equal(expect(await request(path,{method:'POST',auth:bobToken}),200).isLiked,false);
    expect(await request(path,{method:'POST',auth:bobToken}),200);
  }
  assert.equal(expect(await request('/likes/videos',{auth:bobToken}),200).length,1);
  expect(await request('/likes/toggle/c/invalid',{method:'POST',auth:bobToken}),400);
});
test('playlists support CRUD, idempotent additions/removals, and owner checks', async () => {
  playlist = expect(await request('/playlist',{method:'POST',auth:token,body:{name:'Favorites',description:'Good things'}}),201);
  expect(await request('/playlist/add/' + video._id + '/' + playlist._id,{method:'PATCH',auth:bobToken}),403);
  for (let i=0;i<2;i++) expect(await request('/playlist/add/' + video._id + '/' + playlist._id,{method:'PATCH',auth:token}),200);
  assert.equal(expect(await request('/playlist/' + playlist._id,{auth:token}),200).videos.length,1);
  assert.equal(expect(await request('/playlist/user/' + alice._id,{auth:token}),200).length,1);
  expect(await request('/playlist/' + playlist._id,{method:'PATCH',auth:token,body:{name:'Updated'}}),200);
  expect(await request('/playlist/remove/' + video._id + '/' + playlist._id,{method:'PATCH',auth:token}),200);
  expect(await request('/playlist/add/' + video._id + '/' + playlist._id,{method:'PATCH',auth:token}),200);
});
test('subscriptions use correct route parameters, block self subscriptions, and hide private profile fields', async () => {
  expect(await request('/subscriptions/c/' + alice._id,{method:'POST',auth:token}),400);
  assert.equal(expect(await request('/subscriptions/c/' + alice._id,{method:'POST',auth:bobToken}),200).isSubscribed,true);
  assert.equal(expect(await request('/subscriptions/c/' + alice._id,{auth:token}),200)[0].subscriber._id,bob._id);
  assert.equal(expect(await request('/subscriptions/u/' + bob._id,{auth:bobToken}),200)[0].channel._id,alice._id);
  const channel = expect(await request('/users/channel/alice',{auth:bobToken}),200);
  assert.equal(channel.subscribersCount,1); assert.equal(channel.isSubscribed,true); assert.equal(channel.email,undefined);
});
test('dashboard aggregates actual channel statistics and returns owned videos', async () => {
  const stats = expect(await request('/dashboard/stats',{auth:token}),200);
  assert.equal(stats.totalVideos,1); assert.equal(stats.totalSubscribers,1); assert.equal(stats.totalLikes,1);
  assert.equal(expect(await request('/dashboard/videos',{auth:bobToken}),200).length,0);
});
test('profile updates do not leak refresh tokens and password changes revoke old sessions', async () => {
  const user = expect(await request('/users/update-user',{method:'PATCH',auth:bobToken,body:{fullName:'Robert',email:'robert@example.com'}}),200);
  assert.equal(user.refreshToken,undefined);
  expect(await request('/users/change-password',{method:'POST',auth:bobToken,body:{oldPassword:'testpass123',newPassword:'newpass123'}}),200);
  expect(await request('/users/current-user',{auth:bobToken}),401);
  bobToken = expect(await request('/users/login',{method:'POST',body:{username:'bob',password:'newpass123'}}),200).accessToken;
});
test('deletion cleans related likes, comments, playlist references, and watch history', async () => {
  expect(await request('/tweets/' + post._id,{method:'DELETE',auth:bobToken}),403);
  expect(await request('/tweets/' + post._id,{method:'DELETE',auth:token}),200);
  assert.equal(await Like.countDocuments({tweet:post._id}),0);
  expect(await request('/videos/' + video._id,{method:'DELETE',auth:token}),200);
  assert.equal(await Comment.countDocuments({video:video._id}),0);
  assert.equal(await Like.countDocuments(),0);
  assert.equal((await Playlist.findById(playlist._id)).videos.length,0);
  assert.equal((await User.findById(bob._id)).watchHistory.length,0);
  expect(await request('/playlist/' + playlist._id,{method:'DELETE',auth:token}),200);
});
test('logout revokes access and refresh sessions; upload temp files are cleaned', async () => {
  expect(await request('/users/logout',{method:'POST',auth:token}),200);
  expect(await request('/users/current-user',{auth:token}),401);
  await new Promise(r => setTimeout(r,100));
  assert.equal((await readdir('public/temp')).filter(n => n !== '.gitkeep').length,0);
});
