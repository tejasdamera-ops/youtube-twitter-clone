const $ = (s, root = document) => root.querySelector(s);
const main = $('#main'), dialog = $('#dialog');
const state = { user:null, route:'', page:1, query:'', sort:'createdAt', videos:[], posts:[], current:null, epoch:0, searchNavigation:false };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const url = v => { try { const u = new URL(v, location.origin); return ['http:', 'https:'].includes(u.protocol) ? esc(u.href) : '/avatar.svg'; } catch { return '/avatar.svg'; } };
const avatar = u => `<img class="avatar" src="${url(u?.avatar || '/avatar.svg')}" alt="" loading="lazy">`;
const num = n => Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:1 }).format(n || 0);
const ago = d => { const n = Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000)); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 30 ? `${n} days ago` : new Date(d).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }); };
const duration = n => `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2,'0')}`;
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200); }
async function api(path, { method='GET', body, retry=true } = {}) {
  const response = await fetch('/api/v1' + path, { method, credentials:'same-origin', headers:body && !(body instanceof FormData) ? { 'Content-Type':'application/json' } : {}, body:body ? body instanceof FormData ? body : JSON.stringify(body) : undefined });
  if (response.status === 401 && retry && !['/users/login','/users/refresh-token'].includes(path)) {
    const refresh = await fetch('/api/v1/users/refresh-token', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:'{}' });
    if (refresh.ok) return api(path, { method, body, retry:false });
    state.user = null; account();
  }
  const result = await response.json().catch(() => ({ message:'The server returned an invalid response' }));
  if (!response.ok) throw new Error(result.message || 'Request failed');
  return result.data;
}
function account() { $('#account').innerHTML = state.user ? `<a class="account-button" href="#settings" aria-label="Your profile">${avatar(state.user)}</a>` : '<button class="button secondary" data-action="login">Sign in</button>'; }
function needUser() { if (state.user) return true; auth(); return false; }
function modal(html) { $('#dialog-content').innerHTML = html; if (!dialog.open) dialog.showModal(); }
function closeModal() { dialog.close(); }
function field(label, name, type='text', value='', extra='', required=true) { return `<label class="field">${label}<input name="${name}" type="${type}" ${required ? 'required' : ''} value="${esc(value)}" ${extra}></label>`; }
const endForm = label => `<p class="form-error" role="alert"></p><button class="button form-submit" type="submit">${label}</button></form>`;
const textarea = (label, name, value='', max=5000) => `<label class="field">${label}<textarea name="${name}" required maxlength="${max}">${esc(value)}</textarea></label>`;
const empty = (title, description, action='', label='') => `<div class="empty"><div class="empty-symbol">✧</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action ? `<button class="button secondary" data-action="${action}">${esc(label)} ↗</button>` : ''}</div>`;
const header = (title, description, button='') => `<div class="section-heading"><div><div class="eyebrow">YOUR DAILY DOSE OF DISCOVERY</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${button}</div>`;
const more = (data, action='more-videos') => data.hasNextPage ? `<div class="load-more"><button class="button secondary" data-action="${action}">Load more</button></div>` : '';
function auth(register=false) {
  modal(`<div class="eyebrow">WELCOME TO STREAMLINE</div><h2>${register ? 'A space for your ideas.' : 'Good to see you again.'}</h2><p>${register ? 'Create your account and join the conversation.' : 'Sign in to save what you love and share what you create.'}</p><form data-form="${register ? 'register' : 'login'}">${register ? field('Full name','fullName','text','','maxlength="80" autocomplete="name"') + field('Username','username','text','','pattern="[a-zA-Z0-9_]{3,30}" autocomplete="username"') + field('Email','email','email','','autocomplete="email"') : field('Username or email','username','text','','autocomplete="username"')}${field('Password','password','password','',`minlength="8" maxlength="72" autocomplete="${register ? 'new-password' : 'current-password'}"`)}${endForm(register ? 'Create account ↗' : 'Sign in ↗')}<span class="auth-switch">${register ? 'Already part of the community? <button data-action="login">Sign in</button>' : 'New here? <button data-action="register">Create an account</button>'}</span>`);
}
function videoCard(v) { return `<article class="video-card"><a class="thumbnail" href="#watch/${esc(v._id)}"><img src="${url(v.thumbnail)}" alt="${esc(v.title)}" loading="lazy"><span class="duration">${duration(v.duration)}</span></a><div class="video-info"><a href="#channel/${esc(v.owner?.username || '')}">${avatar(v.owner)}</a><div><h3><a href="#watch/${esc(v._id)}">${esc(v.title)}</a></h3><p><a href="#channel/${esc(v.owner?.username || '')}">${esc(v.owner?.fullName || v.owner?.username || 'Creator')}</a><br>${num(v.views)} views · ${ago(v.createdAt)}</p></div></div></article>`; }
const grid = videos => `<div class="grid">${videos.length ? videos.map(videoCard).join('') : empty('A fresh start. Endless possibilities.', 'The first video is waiting to be shared. Bring your perspective to the community.', 'upload', 'Upload a video')}</div>`;
const hero = () => '<section class="hero"><div class="hero-content"><div class="eyebrow"><i class="pill-dot"></i> A HOME FOR YOUR CURIOSITY</div><h1>Find your next<br>little obsession.</h1><p>Fresh perspectives. Big ideas. Videos and conversations that make you look twice.</p><div class="hero-actions"><a class="button" href="#community">Meet the community ↗</a><span>Watch. Connect. Create.</span></div></div><div class="hero-art" aria-hidden="true"><span class="art-star">✳</span><div class="orbit"><div class="play-art">▶</div></div><div class="floating-note"><span class="note-icon">◎</span><div><strong>Good things start with a spark.</strong><small>Find yours on Streamline.</small></div></div></div></section>';
async function home(trending=false) {
  const data = await api('/videos?' + new URLSearchParams({ page:1, limit:12, query:state.query, sortBy:trending ? 'views' : state.sort })); state.videos = data.docs;
  return `<div class="welcome-row"><div><h1>${state.query ? 'A little discovery, just for you.' : 'A world worth exploring.'}</h1><p>Follow your curiosity. See where it takes you.</p></div><span class="date-label"><i></i>${new Date().toLocaleDateString(undefined,{ weekday:'long', month:'short', day:'numeric' })}</span></div>${!state.query && !trending ? hero() : ''}<div class="section-heading"><div><h2>${state.query ? 'Results for “' + esc(state.query) + '”' : trending ? 'Making waves right now' : 'Picked for your curiosity'}</h2><p>${data.totalDocs} videos to explore</p></div>${trending ? '' : `<select id="video-sort" aria-label="Sort videos"><option value="createdAt" ${state.sort === 'createdAt' ? 'selected' : ''}>Recently added</option><option value="views" ${state.sort === 'views' ? 'selected' : ''}>Most watched</option></select>`}</div><div class="tabs"><a class="tab ${!trending ? 'active' : ''}" href="#home">For you</a><a class="tab ${trending ? 'active' : ''}" href="#trending">Trending ↗</a><a class="tab" href="#community">Community voices</a><a class="tab" href="#subscriptions">Following</a></div>${grid(data.docs)}${more(data)}`;
}
function postCard(p) { return `<article class="post"><div class="post-head"><a href="#channel/${esc(p.owner?.username)}">${avatar(p.owner)}</a><div><a href="#channel/${esc(p.owner?.username)}"><strong>${esc(p.owner?.fullName || p.owner?.username)}</strong></a><small>@${esc(p.owner?.username)} · ${ago(p.createdAt)}</small></div></div><div class="post-content">${esc(p.content)}</div><div class="post-actions"><button class="text-button ${p.isLiked ? 'liked' : ''}" data-action="like-post" data-id="${p._id}">${p.isLiked ? '♥' : '♡'} ${num(p.likesCount)}</button>${state.user?._id === p.owner?._id ? `<button class="text-button push-right" data-action="edit-post" data-id="${p._id}">Edit</button><button class="text-button" data-action="delete-post" data-id="${p._id}">Delete</button>` : ''}</div></article>`; }
async function community() {
  const data = await api('/tweets?limit=15'); state.posts = data.docs;
  const composer = state.user ? `<div class="panel composer">${avatar(state.user)}<form data-form="post"><textarea name="content" placeholder="An idea, a discovery, a little inspiration…" aria-label="Write a post" required maxlength="1000"></textarea><div class="composer-footer"><span class="subtle">A little thought can go a long way.</span><button class="button">Share ↗</button></div><p class="form-error" role="alert"></p></form></div>` : '<div class="panel" style="margin-bottom:20px"><h3>Every perspective adds something.</h3><p>Join the community to share yours.</p><button class="button" data-action="login">Join the conversation ↗</button></div>';
  return header('Good ideas travel.', 'A place for the thoughts between the videos.') + `<div class="community-layout"><div>${composer}<div id="posts">${data.docs.length ? data.docs.map(postCard).join('') : empty('Start a conversation.', 'Share something you learned, something you made, or something on your mind.')}</div>${more(data,'more-posts')}</div><aside class="community-aside"><div class="panel"><div class="eyebrow">THE COMMUNITY CORNER</div><h2>Small thoughts.<br>New connections.</h2><p>Behind every video is a person with a perspective. This is where those perspectives meet.</p><div class="about-note"><strong>Be curious. Be kind.</strong>Share your own work, ask thoughtful questions, and give people room to be themselves.</div></div></aside></div>`;
}
const commentCard = c => `<article class="comment">${avatar(c.owner)}<div><strong>${esc(c.owner?.fullName || c.owner?.username)}</strong> <span class="subtle">· ${ago(c.createdAt)}</span><p>${esc(c.content)}</p>${state.user?._id === c.owner?._id ? `<button class="text-button" data-action="edit-comment" data-id="${c._id}">Edit</button> · <button class="text-button" data-action="delete-comment" data-id="${c._id}">Delete</button>` : ''}</div></article>`;
async function watch(id) {
  const [v, comments, related] = await Promise.all([api('/videos/' + id), api('/comments/' + id), api('/videos?limit=4')]); state.current = v; state.comments = comments.docs;
  return `<div class="video-layout"><section><video class="player" controls playsinline preload="metadata" poster="${url(v.thumbnail)}" src="${url(v.videoFile)}"></video><h1 class="watch-title">${esc(v.title)}</h1><div class="watch-meta"><a class="watch-owner" href="#channel/${esc(v.owner.username)}">${avatar(v.owner)}<div><strong>${esc(v.owner.fullName)}</strong><small>${num(v.subscribersCount)} subscribers</small></div></a>${state.user?._id !== v.owner._id ? `<button class="button ${v.isSubscribed ? 'secondary' : ''}" data-action="subscribe" data-id="${v.owner._id}">${v.isSubscribed ? 'Subscribed ✓' : 'Subscribe'}</button>` : ''}<button class="button secondary" data-action="like-video">${v.isLiked ? '♥' : '♡'} ${num(v.likesCount)}</button><button class="button secondary" data-action="save-video">＋ Save</button></div><div class="description"><strong>${num(v.views)} views · ${ago(v.createdAt)}</strong><br>${esc(v.description)}</div><h2>${comments.totalDocs} comments</h2><form class="comment-form" data-form="comment"><input name="content" aria-label="Add a comment" placeholder="Add your perspective…" required maxlength="2000"><button class="button">Post</button></form><div id="comments">${comments.docs.map(commentCard).join('')}</div>${more(comments,'more-comments')}</section><aside class="recommendations"><h2>Keep exploring</h2>${grid(related.docs.filter(r => r._id !== id))}</aside></div>`;
}
async function library(kind) { return header(kind === 'liked' ? 'The ones you loved.' : 'Pick up where you left off.', kind === 'liked' ? 'All your liked videos, in one place.' : 'Your recently watched videos.') + grid(await api(kind === 'liked' ? '/likes/videos' : '/users/history')); }
async function playlists(id) {
  if (id) {
    const p = await api('/playlist/' + id); state.current = p; const owner = state.user?._id === p.owner?._id;
    return header(p.name, p.description, owner ? `<div class="row-actions"><button class="button secondary" data-action="edit-playlist">Edit playlist</button><button class="button danger" data-action="delete-playlist" data-id="${p._id}">Delete</button></div>` : '') + `<div class="grid">${p.videos.length ? p.videos.map(v => `<div>${videoCard(v)}${owner ? `<button class="text-button" data-action="remove-playlist-video" data-id="${v._id}">Remove from playlist</button>` : ''}</div>`).join('') : empty('Make room for your favorites.', 'Save a video from its watch page to start this collection.')}</div>`;
  }
  const lists = await api('/playlist/user/' + state.user._id);
  return header('Curate your corner.', 'Collections for every mood, interest, and rabbit hole.', '<button class="button" data-action="new-playlist">＋ New playlist</button>') + `<div class="grid">${lists.length ? lists.map(p => `<article class="playlist-card"><a href="#playlists/${p._id}"><div class="playlist-art">☷</div><div class="playlist-body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><span class="subtle">${p.videos.length} videos · View collection ↗</span></div></a></article>`).join('') : empty('Your next collection starts here.', 'Keep your favorite videos together in playlists.', 'new-playlist', 'Create a playlist')}</div>`;
}
async function subscriptions() {
  const data = await api('/subscriptions/u/' + state.user._id);
  return header('Your people. Their perspectives.', 'Stay close to the creators you subscribe to.') + `<div class="grid">${data.length ? data.filter(s => s.channel).map(s => `<a class="panel" href="#channel/${esc(s.channel.username)}">${avatar(s.channel)}<h3 style="margin:15px 0 5px">${esc(s.channel.fullName)}</h3><p>@${esc(s.channel.username)}</p><span class="subtle">Explore channel ↗</span></a>`).join('') : empty('Find your people.', 'Subscribe to a creator from a video or channel page. You’ll find them here.')}</div>`;
}
async function channel(username) {
  const c = await api('/users/channel/' + encodeURIComponent(username));
  const [videos, posts] = await Promise.all([api('/videos?userId=' + c._id), api('/tweets/user/' + c._id)]); state.current = c; state.posts = posts.docs;
  return `${c.coverImage ? `<img class="channel-cover" src="${url(c.coverImage)}" alt="Channel cover">` : ''}<div class="channel-head">${avatar(c)}<div><h1>${esc(c.fullName)}</h1><p>@${esc(c.username)} · ${num(c.subscribersCount)} subscribers</p></div>${state.user?._id !== c._id ? `<button class="button" data-action="subscribe" data-id="${c._id}">${c.isSubscribed ? 'Subscribed ✓' : 'Subscribe'}</button>` : '<a class="button secondary" href="#studio">Creator studio ↗</a>'}</div><h2>Videos</h2>${grid(videos.docs)}${more(videos,'more-channel-videos')}<h2 style="margin-top:35px">From the community</h2><div id="posts">${posts.docs.map(postCard).join('') || empty('A quiet corner for now.', 'This creator hasn’t shared any posts yet.')}</div>${more(posts,'more-channel-posts')}`;
}
async function studio() {
  const [stats, videos] = await Promise.all([api('/dashboard/stats'), api('/dashboard/videos')]); state.videos = videos;
  return header('Your ideas, in motion.', 'A little overview of what you’re putting into the world.', '<button class="button" data-action="upload">＋ Upload video</button>') + `<div class="stats">${[['Total views',stats.totalViews],['Subscribers',stats.totalSubscribers],['Videos',stats.totalVideos],['Likes',stats.totalLikes]].map(([label,n]) => `<div class="stat"><span>${label}</span><strong>${num(n)}</strong></div>`).join('')}</div><div class="panel"><h2>Your videos</h2>${videos.length ? videos.map(v => `<div class="studio-row"><img src="${url(v.thumbnail)}" alt=""><div class="studio-meta"><h3>${esc(v.title)}</h3><span class="subtle">${num(v.views)} views · ${ago(v.createdAt)}</span></div><span class="badge ${!v.isPublished ? 'draft' : ''}">${v.isPublished ? 'Published' : 'Unpublished'}</span><div class="row-actions"><button class="text-button" data-action="edit-video" data-id="${v._id}">Edit</button><button class="text-button" data-action="toggle-video" data-id="${v._id}">${v.isPublished ? 'Unpublish' : 'Publish'}</button><button class="text-button" data-action="delete-video" data-id="${v._id}">Delete</button></div></div>`).join('') : empty('Every creator starts somewhere.', 'Upload your first video and start building your channel.', 'upload','Upload a video')}</div>`;
}
function settings() {
  const u = state.user;
  return header('Make yourself at home.', 'Your profile, your preferences, your space.') + `<div class="settings-layout"><section class="panel"><h2>Your profile</h2><form data-form="profile">${field('Full name','fullName','text',u.fullName,'maxlength="80"')}${field('Email','email','email',u.email)}${endForm('Save profile')}<form data-form="avatar" style="margin-top:24px">${field('Profile photo','avatar','file','','accept="image/png,image/jpeg,image/webp"')}${endForm('Update photo')}<form data-form="coverImage" style="margin-top:24px">${field('Channel cover','coverImage','file','','accept="image/png,image/jpeg,image/webp"')}${endForm('Update cover')}</section><section class="panel"><h2>Account security</h2><form data-form="password">${field('Current password','oldPassword','password','','autocomplete="current-password"')}${field('New password','newPassword','password','','minlength="8" maxlength="72" autocomplete="new-password"')}${endForm('Change password')}<div class="about-note" style="margin-top:25px"><strong>@${esc(u.username)}</strong>Thanks for making this corner of the internet your own.</div><button class="button secondary" data-action="logout">Sign out</button></section></div>`;
}
async function render() {
  const epoch = ++state.epoch;
  const [route='home', id] = (location.hash.slice(1) || 'home').split('/'); state.route = route; state.page = 1; state.commentPage = 1; state.channelVideoPage = 1; state.channelPostPage = 1;
  $('#sidebar').classList.remove('open');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === route));
  $('#crumb').textContent = ({home:'For you',trending:'Trending',community:'Community',subscriptions:'Subscriptions',history:'History',liked:'Liked videos',playlists:'Playlists',studio:'Creator studio',settings:'Settings',watch:'Watching',channel:'Channel'})[route] || 'Discover';
  main.innerHTML = '<div class="loading"><span class="spinner"></span>Finding something good…</div>';
  try {
    if (['liked','history','playlists','subscriptions','studio','settings'].includes(route) && !state.user) { main.innerHTML = header('Your space is waiting.', 'Sign in to save, share, and keep exploring.') + empty('Make it yours.', 'Your playlists, favorite creators, and watch history live here.', 'login', 'Sign in'); return; }
    let html;
    if (route === 'home' || route === 'trending') html = await home(route === 'trending');
    else if (route === 'community') html = await community();
    else if (route === 'watch') html = await watch(id);
    else if (route === 'channel') html = await channel(id);
    else if (route === 'liked' || route === 'history') html = await library(route);
    else if (route === 'playlists') html = await playlists(id);
    else if (route === 'subscriptions') html = await subscriptions();
    else if (route === 'studio') html = await studio();
    else if (route === 'settings') html = settings();
    else html = empty('A little off the beaten path.', 'This page doesn’t exist. Head back to discover something new.', 'home','Go home');
    if (epoch === state.epoch) { main.innerHTML = html; document.title = $('#crumb').textContent + ' · Streamline'; }
  } catch (e) { if (epoch === state.epoch) main.innerHTML = `<div class="empty error-state"><div class="empty-symbol">↻</div><h3>We couldn’t load this just yet.</h3><p>${esc(e.message)}</p><button class="button secondary" data-action="retry">Try again</button></div>`; }
}
function upload() {
  if (!needUser()) return;
  modal(`<div class="eyebrow">GIVE YOUR IDEAS A HOME</div><h2>Put something good out there.</h2><p>Upload a video and let your perspective find its people.</p><form data-form="upload">${field('Title','title','text','','maxlength="150"')}${textarea('Description','description')}${field('Video · up to 100 MB','videoFile','file','','accept="video/mp4,video/webm,video/quicktime"')}${field('Thumbnail','thumbnail','file','','accept="image/jpeg,image/png,image/webp"')}${endForm('Publish video ↗')}`);
}
function playlistModal(edit=false) {
  if (!needUser()) return;
  const p = edit ? state.current : {};
  modal(`<div class="eyebrow">YOUR PERSONAL COLLECTION</div><h2>${edit ? 'Refine your collection.' : 'Save a little inspiration.'}</h2><p>Give your playlist a name and make it your own.</p><form data-form="${edit ? 'edit-playlist' : 'playlist'}">${field('Playlist name','name','text',p.name,'maxlength="100"')}${textarea('Description','description',p.description,1000)}${endForm(edit ? 'Save changes' : 'Create playlist ↗')}`);
}
function confirmAction(title, action, id) { modal(`<h2>${esc(title)}</h2><p>This will permanently delete this item.</p><button class="button danger" data-action="${action}" data-id="${esc(id)}">Delete permanently</button> <button class="button secondary" data-action="close">Keep it</button>`); }
document.addEventListener('click', async event => {
  const b = event.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action, id = b.dataset.id;
  if (a === 'close') return closeModal();
  if (a === 'menu') return $('#sidebar').classList.toggle('open');
  if (a === 'login') return auth();
  if (a === 'register') return auth(true);
  if (a === 'upload') return upload();
  if (a === 'new-playlist') return playlistModal();
  if (a === 'edit-playlist') return playlistModal(true);
  if (a === 'retry') return render();
  if (a === 'home') { location.hash = 'home'; return; }
  b.disabled = true;
  try {
    if (a === 'logout') { await api('/users/logout',{method:'POST'}); state.user = null; account(); location.hash = 'home'; await render(); toast('You’re signed out. See you soon.'); }
    if (a === 'like-post') { if (!needUser()) return; const data = await api('/likes/toggle/t/' + id,{method:'POST'}); const p = state.posts.find(p => p._id === id); if (p) { Object.assign(p,data); b.closest('.post').outerHTML = postCard(p); } }
    if (a === 'edit-post' || a === 'edit-comment') { const p = (a === 'edit-post' ? state.posts : state.comments).find(p => p._id === id); modal(`<h2>A little edit.</h2><form data-form="${a}" data-id="${id}">${textarea('Your words','content',p.content,a === 'edit-post' ? 1000 : 2000)}${endForm('Save changes')}`); }
    if (['delete-post','delete-video','delete-comment','delete-playlist'].includes(a)) return confirmAction('Delete this ' + a.slice(7) + '?', 'confirm-' + a,id);
    if (a.startsWith('confirm-delete-')) { const kind = a.slice(15), paths = { post:'/tweets/', video:'/videos/', comment:'/comments/c/', playlist:'/playlist/' }; await api(paths[kind] + id,{method:'DELETE'}); closeModal(); if (kind === 'playlist') location.hash = 'playlists'; await render(); toast('Deleted'); }
    if (a === 'like-video') { if (!needUser()) return; const data = await api('/likes/toggle/v/' + state.current._id,{method:'POST'}); Object.assign(state.current,data); b.textContent = (data.isLiked ? '♥' : '♡') + ' ' + num(data.likesCount); }
    if (a === 'subscribe') { if (!needUser()) return; const data = await api('/subscriptions/c/' + id,{method:'POST'}); b.textContent = data.isSubscribed ? 'Subscribed ✓' : 'Subscribe'; toast(data.isSubscribed ? 'You’re subscribed' : 'Subscription removed'); }
    if (a === 'toggle-video') { await api('/videos/toggle/publish/' + id,{method:'PATCH'}); await render(); }
    if (a === 'edit-video') { const v = state.videos.find(v => v._id === id); modal(`<h2>Fine-tune your video.</h2><form data-form="edit-video" data-id="${id}">${field('Title','title','text',v.title,'maxlength="150"')}${textarea('Description','description',v.description)}${field('Replace thumbnail (optional)','thumbnail','file','','accept="image/jpeg,image/png,image/webp"',false)}${endForm('Save changes')}`); }
    if (a === 'save-video') { if (!needUser()) return; const lists = await api('/playlist/user/' + state.user._id); modal(`<h2>A good one to keep.</h2><p>Choose a playlist for this video.</p>${lists.length ? lists.map(p => `<button class="button secondary" style="width:100%;margin-bottom:10px" data-action="add-playlist-video" data-id="${p._id}">＋ ${esc(p.name)}</button>`).join('') : '<p>No playlists yet. Create one, then save this video.</p>'}<button class="text-button" data-action="new-playlist">＋ Create a playlist</button>`); }
    if (a === 'add-playlist-video') { await api('/playlist/add/' + state.current._id + '/' + id,{method:'PATCH'}); closeModal(); toast('Saved to your playlist'); }
    if (a === 'remove-playlist-video') { await api('/playlist/remove/' + id + '/' + state.current._id,{method:'PATCH'}); await render(); toast('Removed from playlist'); }
    if (a === 'more-videos' || a === 'more-channel-videos') { const channel = a === 'more-channel-videos'; const data = await api('/videos?' + new URLSearchParams({ page:channel ? ++state.channelVideoPage : ++state.page, limit:12, query:channel ? '' : state.query, sortBy:state.route === 'trending' ? 'views' : state.sort, ...(channel ? { userId:state.current._id } : {}) })); state.videos.push(...data.docs); main.querySelector('.grid').insertAdjacentHTML('beforeend',data.docs.map(videoCard).join('')); if (!data.hasNextPage) b.remove(); }
    if (a === 'more-posts' || a === 'more-channel-posts') { const channel = a === 'more-channel-posts'; const data = await api(channel ? '/tweets/user/' + state.current._id + '?page=' + ++state.channelPostPage : '/tweets?limit=15&page=' + ++state.page); state.posts.push(...data.docs); $('#posts').insertAdjacentHTML('beforeend',data.docs.map(postCard).join('')); if (!data.hasNextPage) b.remove(); }
    if (a === 'more-comments') { const data = await api('/comments/' + state.current._id + '?page=' + ++state.commentPage); state.comments.push(...data.docs); $('#comments').insertAdjacentHTML('beforeend',data.docs.map(commentCard).join('')); if (!data.hasNextPage) b.remove(); }
  } catch (e) { toast(e.message); } finally { b.disabled = false; }
});
document.addEventListener('submit', async event => {
  const form = event.target; event.preventDefault();
  if (form.id === 'search-form') { state.query = new FormData(form).get('query').trim(); if (state.route !== 'home') { state.searchNavigation = true; location.hash = 'home'; } else render(); return; }
  const type = form.dataset.form; if (!type) return;
  const button = $('button[type="submit"],button:not([type])',form), error = $('.form-error',form); if (error) error.textContent = ''; if (button) button.disabled = true;
  const data = new FormData(form), body = Object.fromEntries(data);
  try {
    if (type === 'login') { const result = await api('/users/login',{method:'POST',body}); state.user = result.user; account(); closeModal(); await render(); toast('Welcome back, ' + state.user.fullName); }
    else if (type === 'register') { await api('/users/register',{method:'POST',body}); auth(); toast('Account created. Sign in to get started.'); }
    else if (type === 'upload') { await api('/videos',{method:'POST',body:data}); closeModal(); location.hash = 'studio'; await render(); toast('Your video is out in the world.'); }
    else if (type === 'post') { await api('/tweets',{method:'POST',body}); await render(); toast('Your thought is out there.'); }
    else if (type === 'edit-post' || type === 'edit-comment') { await api((type === 'edit-post' ? '/tweets/' : '/comments/c/') + form.dataset.id,{method:'PATCH',body}); closeModal(); await render(); toast('Updated'); }
    else if (type === 'comment') { if (!needUser()) return; await api('/comments/' + state.current._id,{method:'POST',body}); await render(); toast('Comment added'); }
    else if (type === 'playlist' || type === 'edit-playlist') { await api(type === 'playlist' ? '/playlist' : '/playlist/' + state.current._id,{method:type === 'playlist' ? 'POST' : 'PATCH',body}); closeModal(); if (state.route !== 'watch') await render(); toast(type === 'playlist' ? 'Playlist created' : 'Playlist updated'); }
    else if (type === 'edit-video') { if (!data.get('thumbnail')?.size) data.delete('thumbnail'); await api('/videos/' + form.dataset.id,{method:'PATCH',body:data}); closeModal(); await render(); toast('Video updated'); }
    else if (type === 'profile') { state.user = await api('/users/update-user',{method:'PATCH',body}); account(); toast('Profile saved'); }
    else if (type === 'avatar' || type === 'coverImage') { state.user = await api('/users/update-' + (type === 'avatar' ? 'avatar' : 'coverImage'),{method:'PATCH',body:data}); account(); toast('Image updated'); }
    else if (type === 'password') { await api('/users/change-password',{method:'POST',body}); state.user = null; account(); await render(); auth(); toast('Password changed. Please sign in again.'); }
  } catch (e) { if (error) error.textContent = e.message; else toast(e.message); } finally { if (button) button.disabled = false; }
});
document.addEventListener('change', e => { if (e.target.id === 'video-sort') { state.sort = e.target.value; render(); } });
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal(); } });
window.addEventListener('hashchange', () => { if (!state.searchNavigation) { state.query = ''; $('#search-form input').value = ''; } state.searchNavigation = false; window.scrollTo(0,0); render(); });
try { state.user = await api('/users/current-user'); } catch {}
account(); render();
