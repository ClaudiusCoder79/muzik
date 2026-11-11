/* Muzik — music & audiobook player for your own files.
   Plain JavaScript, no build step. Files are stored on the phone in IndexedDB. */
'use strict';

/* ============================== helpers ============================== */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = (s) => esc(encodeURIComponent(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const baseName = (n) => n.replace(/\.[^.]+$/, '');
const byText = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
function fmtLeft(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec > 0 && sec < 60) return '<1m';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
function fmtSize(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return Math.round(bytes / 1e6) + ' MB';
  return Math.round(bytes / 1e3) + ' KB';
}
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ============================== icons ============================== */
const sv = (body, size = 24, fill = false, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : `fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`} aria-hidden="true">${body}</svg>`;
const P = {
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  next: '<path d="M5 5l10 7-10 7z"/><rect x="16.5" y="5" width="2.5" height="14" rx="1"/>',
  prev: '<path d="M19 5L9 12l10 7z"/><rect x="5" y="5" width="2.5" height="14" rx="1"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  share: '<path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  back15: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 3.5v4h4"/><text x="12" y="15.2" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">15</text>',
  fwd30: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M21 3.5v4h-4"/><text x="12" y="15.2" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">30</text>'
};
const FILLED = new Set(['play', 'pause', 'next', 'prev']);
const I = (name, size = 24, sw = 2) => sv(P[name], size, FILLED.has(name), sw);

/* ============================== database ============================== */
let db;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('muzik', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('songs', { keyPath: 'id' });
      d.createObjectStore('books', { keyPath: 'id' });
      d.createObjectStore('progress', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const os = (name, mode = 'readonly') => db.transaction(name, mode).objectStore(name);
const dbAll = (n) => req2p(os(n).getAll());
const dbPut = (n, o) => req2p(os(n, 'readwrite').put(clean(o)));
const dbDel = (n, id) => req2p(os(n, 'readwrite').delete(id));
function clean(o) { const { _cu, ...rest } = o; return rest; } // never store temporary picture links

/* ============================== state ============================== */
const S = {
  songs: [], books: [], progress: {},
  tab: 'music', musicView: 'songs', search: '', group: null, // group = {type:'album'|'artist', name}
  visible: [],             // song ids shown in the current list (for "tap to play")
  mode: null,              // 'song' | 'book' | null
  queue: [], orig: [], qi: 0, shuffle: false, repeat: 'off',
  bookId: null, showParts: false,
  playerOpen: false,
  sleep: 0, sleepEnd: 0, sleepAtEnd: false,
  jobs: []
};
const SLEEP = [{ label: 'Sleep timer' }, { label: '15 min', m: 15 }, { label: '30 min', m: 30 }, { label: '60 min', m: 60 }, { label: 'End of part', end: true }];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2, 3];
const song = (id) => S.songs.find((s) => s.id === id);
const book = (id) => S.books.find((b) => b.id === id);
const curSong = () => (S.mode === 'song' ? song(S.queue[S.qi]) : null);
const curBook = () => (S.mode === 'book' ? book(S.bookId) : null);
function prog(id) {
  if (!S.progress[id]) S.progress[id] = { id, part: 0, pos: 0, speed: 1, finished: false, last: 0 };
  return S.progress[id];
}
const bookTotal = (b) => sum(b.parts.map((p) => p.duration || 0));
function bookDone(b) {
  const p = prog(b.id);
  if (p.finished) return bookTotal(b);
  return sum(b.parts.slice(0, p.part).map((x) => x.duration || 0)) + (p.pos || 0);
}

/* ============================== pictures ============================== */
const TINTS = ['#2E4A62', '#5B3A29', '#3B4D3A', '#4A3B5C', '#5C3A45', '#2F4F4F', '#4D4433'];
function tint(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return TINTS[Math.abs(h) % TINTS.length]; }
function coverUrl(it) {
  if (!it || !it.cover) return null;
  if (!it._cu) it._cu = URL.createObjectURL(it.cover);
  return it._cu;
}
function art(it, size, kind, extraClass = '') {
  const u = coverUrl(it);
  const dim = size ? `width:${size}px;height:${size}px;` : '';
  if (u) return `<img class="art ${extraClass}" src="${u}" alt="" style="${dim}">`;
  const iconSize = size ? Math.round(size * 0.42) : 48;
  return `<div class="art ph ${extraClass}" style="${dim}background:${tint(it.id)}">${I(kind === 'book' ? 'book' : 'note', iconSize, 1.6)}</div>`;
}
// Shrink a chosen picture to max 800px JPEG so it is small and works inside MP3 tags.
function resizeImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read picture'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Could not read picture')); };
    img.src = u;
  });
}

/* ============================== importing ============================== */
function readTags(file) {
  return new Promise((res) => {
    try { window.jsmediatags.read(file, { onSuccess: (t) => res(t.tags || {}), onError: () => res({}) }); }
    catch (e) { res({}); }
  });
}
function picToBlob(p) {
  if (!p || !p.data || !p.data.length) return null;
  const type = p.format && p.format.includes('/') ? p.format : 'image/jpeg';
  return new Blob([new Uint8Array(p.data)], { type });
}
function getDuration(blob) {
  return new Promise((res) => {
    const a = new Audio();
    const u = URL.createObjectURL(blob);
    let done = false;
    const fin = (d) => { if (done) return; done = true; URL.revokeObjectURL(u); a.removeAttribute('src'); res(isFinite(d) ? d : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => fin(a.duration);
    a.onerror = () => fin(0);
    setTimeout(() => fin(0), 15000);
    a.src = u;
  });
}
async function askPersist() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
}

async function importMusic(files) {
  await askPersist();
  const jobs = files.map((f) => ({ name: f.name, status: 'Waiting', pct: 0 }));
  S.jobs = jobs.concat(S.jobs).slice(0, 30);
  renderView();
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i], job = jobs[i];
    job.status = 'Reading…'; job.pct = 30; renderView();
    try {
      const tags = await readTags(f);
      const duration = await getDuration(f);
      job.pct = 70; renderView();
      const s = {
        id: uid(), blob: f, fileName: f.name, type: f.type || '',
        title: tags.title || baseName(f.name), artist: tags.artist || '', album: tags.album || '',
        genre: tags.genre || '', year: tags.year || '', track: tags.track || '',
        cover: picToBlob(tags.picture), duration, added: Date.now()
      };
      await dbPut('songs', s);
      S.songs.push(s);
      job.status = 'Done'; job.pct = 100; added++;
    } catch (e) {
      console.error(e);
      job.status = isQuota(e) ? 'Phone full' : 'Failed'; job.pct = 100; job.err = true;
    }
    renderView();
  }
  if (added) toast(`Added ${added} song${added > 1 ? 's' : ''}`);
}

async function importBook(files) {
  await askPersist();
  files = files.slice().sort((a, b) => byText(a.name, b.name));
  const job = { name: files.length > 1 ? `${files.length} files (one audiobook)` : files[0].name, status: 'Reading…', pct: 5 };
  S.jobs = [job].concat(S.jobs).slice(0, 30);
  renderView();
  try {
    const parts = [];
    let tags = {}, cover = null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (i === 0 || !cover) {
        const t = await readTags(f);
        if (i === 0) tags = t;
        if (!cover) cover = picToBlob(t.picture);
      }
      parts.push({ blob: f, name: f.name, duration: await getDuration(f) });
      job.pct = Math.round(((i + 1) / files.length) * 90); renderView();
    }
    const multi = files.length > 1;
    const b = {
      id: uid(), parts, cover,
      title: (multi ? tags.album || tags.title : tags.title || tags.album) || baseName(files[0].name),
      author: tags.artist || '', genre: tags.genre || '', year: tags.year || '', added: Date.now()
    };
    await dbPut('books', b);
    S.books.push(b);
    job.status = 'Done'; job.pct = 100;
    toast('Audiobook added');
  } catch (e) {
    console.error(e);
    job.status = isQuota(e) ? 'Phone full' : 'Failed'; job.pct = 100; job.err = true;
  }
  renderView();
}
const isQuota = (e) => e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message)));

/* ============================== playback ============================== */
const audio = $('#audio');
let curUrl = null, pendingSeek = 0, lastSave = 0, lastPos = 0;

function loadBlob(blob) {
  if (curUrl) URL.revokeObjectURL(curUrl);
  curUrl = URL.createObjectURL(blob);
  audio.src = curUrl;
}
function rate() { return S.mode === 'book' ? prog(S.bookId).speed : 1; }
function play() { audio.playbackRate = rate(); const p = audio.play(); if (p) p.catch(() => {}); }

function playSongs(ids, start, shuffle) {
  if (!ids.length) return;
  saveBookPos();
  S.mode = 'song'; S.bookId = null;
  S.orig = ids.slice();
  S.shuffle = !!shuffle;
  if (S.shuffle) {
    const first = shuffle && start < 0 ? ids[Math.floor(Math.random() * ids.length)] : ids[Math.max(0, start)];
    S.queue = [first, ...shuffleArr(ids.filter((x) => x !== first))];
    S.qi = 0;
  } else {
    S.queue = ids.slice(); S.qi = Math.max(0, start);
  }
  setHandlers();
  loadSong(true);
}
function loadSong(autoplay) {
  const s = curSong();
  if (!s) return;
  pendingSeek = 0;
  loadBlob(s.blob);
  if (autoplay) play();
  updateMedia();
  renderAll();
}
function nextSong(auto) {
  if (auto && S.repeat === 'one') { audio.currentTime = 0; play(); return; }
  if (S.qi < S.queue.length - 1) { S.qi++; loadSong(true); }
  else if (S.repeat === 'all' || !auto) { S.qi = 0; loadSong(auto || !audio.paused); }
  else { audio.pause(); audio.currentTime = 0; renderAll(); }
}
function prevSong() {
  if (audio.currentTime > 3 || S.qi === 0) { audio.currentTime = 0; return; }
  S.qi--; loadSong(true);
}
function toggleShuffle() {
  S.shuffle = !S.shuffle;
  if (S.mode === 'song') {
    const cur = S.queue[S.qi];
    if (S.shuffle) { S.orig = S.queue.slice(); S.queue = [cur, ...shuffleArr(S.queue.filter((x) => x !== cur))]; S.qi = 0; }
    else { S.queue = S.orig.slice(); S.qi = Math.max(0, S.queue.indexOf(cur)); }
  }
  renderPlayer();
}
function cycleRepeat() {
  S.repeat = S.repeat === 'off' ? 'all' : S.repeat === 'all' ? 'one' : 'off';
  renderPlayer();
}

function playBook(id) {
  const b = book(id);
  if (!b) return;
  if (S.mode === 'book' && S.bookId === id) { togglePlay(); return; }
  saveBookPos();
  S.mode = 'book'; S.bookId = id; S.showParts = false;
  const p = prog(id);
  if (p.finished) { p.finished = false; p.part = 0; p.pos = 0; }
  setHandlers();
  loadPart(p.part, p.pos, true);
}
function loadPart(i, pos, autoplay) {
  const b = curBook();
  if (!b) return;
  i = Math.max(0, Math.min(b.parts.length - 1, i));
  const p = prog(b.id);
  p.part = i; p.pos = pos || 0;
  pendingSeek = pos || 0;
  loadBlob(b.parts[i].blob);
  if (autoplay) play();
  updateMedia();
  renderAll();
}
function skip(sec) {
  if (!audio.src) return;
  const playing = !audio.paused;
  let t = audio.currentTime + sec;
  const b = curBook();
  if (b) {
    const p = prog(b.id);
    if (t < 0 && p.part > 0) { const prevDur = b.parts[p.part - 1].duration || 0; loadPart(p.part - 1, Math.max(0, prevDur + t), playing); return; }
    if (isFinite(audio.duration) && t > audio.duration && p.part < b.parts.length - 1) { loadPart(p.part + 1, t - audio.duration, playing); return; }
  }
  audio.currentTime = Math.max(0, Math.min(t, (audio.duration || t) - 0.25));
}
function togglePlay() {
  if (!audio.src) return;
  if (audio.paused) play(); else audio.pause();
}
function saveBookPos(force) {
  const b = curBook();
  if (!b || !audio.src) return;
  const p = prog(b.id);
  if (!pendingSeek) p.pos = audio.currentTime || 0;
  p.last = Date.now();
  if (force || Date.now() - lastSave > 5000) { lastSave = Date.now(); dbPut('progress', p).catch(() => {}); }
}
function setSpeed(v) {
  const b = curBook();
  if (!b) return;
  const p = prog(b.id);
  p.speed = v; audio.playbackRate = v;
  dbPut('progress', p).catch(() => {});
  renderPlayer();
}
function cycleSleep() {
  S.sleep = (S.sleep + 1) % SLEEP.length;
  const o = SLEEP[S.sleep];
  S.sleepEnd = o.m ? Date.now() + o.m * 60000 : 0;
  S.sleepAtEnd = !!o.end;
  if (S.sleep) toast(o.end ? 'Will stop at the end of this part' : `Will stop in ${o.m} minutes`);
  renderPlayer();
}
function sleepNow() {
  audio.pause();
  S.sleep = 0; S.sleepEnd = 0; S.sleepAtEnd = false;
  renderAll();
}

audio.addEventListener('loadedmetadata', () => {
  if (pendingSeek) { try { audio.currentTime = pendingSeek; } catch (e) { /* ignore */ } pendingSeek = 0; }
  audio.playbackRate = rate();
  updateTimes();
});
audio.addEventListener('play', () => { audio.playbackRate = rate(); renderMini(); renderPlayerButtons(); });
audio.addEventListener('pause', () => { saveBookPos(true); renderMini(); renderPlayerButtons(); });
audio.addEventListener('timeupdate', () => {
  if (S.sleepEnd && Date.now() >= S.sleepEnd) { sleepNow(); toast('Sleep timer: stopped'); }
  if (S.mode === 'book') saveBookPos(false);
  if (Math.abs(audio.currentTime - lastPos) >= 0.5) { lastPos = audio.currentTime; updateTimes(); }
});
audio.addEventListener('ended', () => {
  if (S.mode === 'song') {
    if (S.sleepAtEnd) { sleepNow(); return; }
    nextSong(true);
  } else if (S.mode === 'book') {
    const b = curBook(), p = prog(b.id);
    if (p.part < b.parts.length - 1) {
      if (S.sleepAtEnd) { p.part++; p.pos = 0; dbPut('progress', p).catch(() => {}); loadPart(p.part, 0, false); sleepNow(); return; }
      loadPart(p.part + 1, 0, true);
    } else {
      p.finished = true; p.part = 0; p.pos = 0; p.last = Date.now();
      dbPut('progress', p).catch(() => {});
      S.sleep = 0; S.sleepAtEnd = false;
      toast('Book finished');
      renderAll();
    }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) saveBookPos(true); });

/* lock screen / headphone / car controls */
function setHandlers() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (e) { /* not supported */ } };
  set('play', () => play());
  set('pause', () => audio.pause());
  set('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
  if (S.mode === 'book') {
    set('previoustrack', null); set('nexttrack', null);
    set('seekbackward', () => skip(-15));
    set('seekforward', () => skip(30));
  } else {
    set('seekbackward', null); set('seekforward', null);
    set('previoustrack', () => prevSong());
    set('nexttrack', () => nextSong(false));
  }
}
function updateMedia() {
  if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
  const s = curSong(), b = curBook(), it = s || b;
  if (!it) return;
  const u = coverUrl(it);
  const artwork = u ? [{ src: u, sizes: '512x512', type: it.cover.type || 'image/jpeg' }] : [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }];
  const album = s ? s.album : b.parts.length > 1 ? `Part ${prog(b.id).part + 1} of ${b.parts.length}` : '';
  navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: s ? s.artist : b.author, album, artwork });
}

/* ============================== rendering ============================== */
function renderAll() { renderView(); renderMini(); renderTabs(); renderPlayer(); }

function renderTabs() {
  const tabs = [['music', 'note', 'Music'], ['books', 'book', 'Audiobooks'], ['add', 'folderPlus', 'Add files']];
  document.querySelectorAll('#tabs .tab').forEach((el, i) => {
    const [key, icon, label] = tabs[i];
    el.className = 'tab' + (S.tab === key ? ' on' : '');
    el.innerHTML = I(icon) + label;
    el.setAttribute('aria-current', S.tab === key ? 'page' : 'false');
  });
}

function renderView() {
  const v = $('#view');
  if (S.tab === 'music') v.innerHTML = musicView();
  else if (S.tab === 'books') v.innerHTML = booksView();
  else v.innerHTML = addView();
  if (S.tab === 'add') fillStorage();
}

/* ---------- music tab ---------- */
function songMatches(s, q) {
  return !q || [s.title, s.artist, s.album, s.genre].some((x) => String(x || '').toLowerCase().includes(q));
}
function songRows(list) {
  S.visible = list.map((s) => s.id);
  const playingId = S.mode === 'song' ? S.queue[S.qi] : null;
  return list.map((s, i) => `
    <div class="row">
      <button class="hit" data-act="play-song" data-i="${i}">
        ${art(s, 48, 'song')}
        <span class="txt">
          <span class="t1${s.id === playingId ? ' now' : ''}">${esc(s.title)}</span>
          <span class="t2">${esc([s.artist || 'Unknown artist', fmt(s.duration)].join(' · '))}</span>
        </span>
      </button>
      <button class="icon-btn" data-act="edit" data-kind="song" data-id="${s.id}" aria-label="Edit tags of ${esc(s.title)}">${I('edit', 20)}</button>
    </div>`).join('');
}
function groupsOf(key) {
  const map = new Map();
  for (const s of S.songs) {
    const name = s[key] || (key === 'album' ? 'Unknown album' : 'Unknown artist');
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(s);
  }
  return [...map.entries()].sort((a, b) => byText(a[0], b[0]));
}
function sortAlbum(list) {
  return list.slice().sort((a, b) => (parseInt(a.track) || 999) - (parseInt(b.track) || 999) || byText(a.title, b.title));
}
function musicList() {
  const q = S.search.trim().toLowerCase();
  if (S.group) {
    const key = S.group.type;
    const list = S.songs.filter((s) => (s[key] || (key === 'album' ? 'Unknown album' : 'Unknown artist')) === S.group.name && songMatches(s, q));
    const sorted = key === 'album' ? sortAlbum(list) : list.sort((a, b) => byText(a.album + a.title, b.album + b.title));
    return `<div class="backrow"><button data-act="ungroup">${I('back', 22)}Back</button></div>
      <div class="head" style="padding-top:0"><h2 style="margin:0;font-size:22px">${esc(S.group.name)}</h2></div>
      ${actions()}${songRows(sorted)}`;
  }
  if (S.musicView === 'songs') {
    const list = S.songs.filter((s) => songMatches(s, q)).sort((a, b) => byText(a.title, b.title));
    if (!list.length && q) return `<div class="empty">No songs match “${esc(S.search)}”.</div>`;
    return actions() + songRows(list);
  }
  const key = S.musicView === 'albums' ? 'album' : 'artist';
  const groups = groupsOf(key).filter(([name, songs]) => !q || name.toLowerCase().includes(q) || songs.some((s) => songMatches(s, q)));
  S.visible = [];
  if (key === 'album') {
    return `<div class="grid">${groups.map(([name, songs]) => {
      const withArt = songs.find((s) => s.cover) || songs[0];
      return `<button class="tile" data-act="group" data-type="album" data-name="${enc(name)}">
        ${art(withArt, 0, 'song')}
        <span class="t1">${esc(name)}</span><span class="t2">${esc(songs[0].artist || 'Unknown artist')} · ${songs.length} song${songs.length > 1 ? 's' : ''}</span>
      </button>`;
    }).join('')}</div>`;
  }
  return groups.map(([name, songs]) => {
    const withArt = songs.find((s) => s.cover) || songs[0];
    return `<div class="row"><button class="hit" data-act="group" data-type="artist" data-name="${enc(name)}">
      ${art(withArt, 48, 'song')}
      <span class="txt"><span class="t1">${esc(name)}</span><span class="t2">${songs.length} song${songs.length > 1 ? 's' : ''}</span></span>
    </button></div>`;
  }).join('');
}
function actions() {
  return `<div class="actions">
    <button class="big" data-act="play-all">${I('play', 18)}Play all</button>
    <button class="big" data-act="shuffle-all">${I('shuffle', 18)}Shuffle</button>
  </div>`;
}
function musicView() {
  const head = `<div class="head"><h1>Music</h1><button class="round" data-act="tab" data-tab="add" aria-label="Add files">${I('plus', 22, 2.2)}</button></div>`;
  if (!S.songs.length) {
    return head + `<div class="empty">${I('note', 40, 1.6)}No music yet.<br>Add songs from the Files app (iCloud Drive, OneDrive, Downloads…).<br>
      <button class="primary" data-act="add-music">${I('plus', 20, 2.4)}Add music</button></div>`;
  }
  const views = [['songs', 'Songs'], ['albums', 'Albums'], ['artists', 'Artists']];
  return head + `
    <label class="search">${I('search', 18)}<input id="q" type="search" placeholder="Search songs, artists, albums" value="${esc(S.search)}" autocomplete="off"></label>
    ${S.group ? '' : `<div class="chips">${views.map(([k, l]) => `<button class="chip${S.musicView === k ? ' on' : ''}" data-act="mview" data-v="${k}">${l}</button>`).join('')}</div>`}
    <div id="mlist">${musicList()}</div>`;
}

/* ---------- audiobooks tab ---------- */
function bookSub(b) {
  const p = prog(b.id), total = bookTotal(b);
  if (p.finished) return 'Finished';
  if (!p.last && !p.pos && !p.part) return `${fmtLeft(total)} · Not started`;
  return `${fmtLeft(total - bookDone(b))} left`;
}
function bookPct(b) {
  const total = bookTotal(b);
  return total ? Math.min(100, (bookDone(b) / total) * 100) : 0;
}
function booksView() {
  const head = `<div class="head"><h1>Audiobooks</h1><button class="round" data-act="tab" data-tab="add" aria-label="Add audiobooks">${I('plus', 22, 2.2)}</button></div>`;
  if (!S.books.length) {
    return head + `<div class="empty">${I('book', 40, 1.6)}No audiobooks yet.<br>Add one M4B file, or all the MP3 parts of one book together.<br>
      <button class="primary" data-act="add-book">${I('plus', 20, 2.4)}Add audiobook</button></div>`;
  }
  const sorted = S.books.slice().sort((a, b) => (prog(b.id).last || b.added) - (prog(a.id).last || a.added));
  const cont = sorted.find((b) => prog(b.id).last && !prog(b.id).finished);
  let html = head;
  if (cont) {
    const p = prog(cont.id), playing = S.mode === 'book' && S.bookId === cont.id && !audio.paused;
    html += `<div class="label">Continue listening</div>
      <button class="cont" data-act="play-book" data-id="${cont.id}" data-open="1">
        ${art(cont, 96, 'book')}
        <span class="info">
          <span><span class="t1" style="display:block;font-weight:600;font-size:17px;white-space:normal">${esc(cont.title)}</span>
          <span class="t2" style="display:block;margin-top:3px">${esc([cont.author, cont.parts.length > 1 ? `Part ${p.part + 1} of ${cont.parts.length}` : ''].filter(Boolean).join(' · '))}</span></span>
          <span><span class="bar" style="display:block"><div style="width:${bookPct(cont)}%"></div></span>
          <span class="foot"><span class="t2">${esc(bookSub(cont))}</span><span class="pill">${I(playing ? 'pause' : 'play', 14)}${playing ? 'Playing' : 'Resume'}</span></span></span>
        </span>
      </button>`;
  }
  html += `<div class="label">All books</div>`;
  html += sorted.map((b) => {
    const p = prog(b.id);
    return `<div class="row">
      <button class="hit" data-act="play-book" data-id="${b.id}" data-open="1">
        ${art(b, 60, 'book')}
        <span class="txt" style="min-height:68px">
          <span class="t1${S.bookId === b.id && S.mode === 'book' ? ' now' : ''}">${esc(b.title)}</span>
          <span class="t2">${esc([b.author || 'Unknown author', bookSub(b)].join(' · '))}</span>
          <span class="bar${p.finished ? ' done' : ''}"><div style="width:${bookPct(b)}%"></div></span>
        </span>
      </button>
      <button class="icon-btn" data-act="edit" data-kind="book" data-id="${b.id}" aria-label="Edit details of ${esc(b.title)}">${I('edit', 20)}</button>
    </div>`;
  }).join('');
  return html;
}

/* ---------- add files tab ---------- */
function addView() {
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  return `<div class="head"><h1>Add files</h1></div>
    <p class="intro">Pick files from the iPhone Files app: iCloud Drive, OneDrive, Downloads or a USB stick. Muzik keeps its own copy, so it plays offline.</p>
    <button class="addbtn hot" data-act="add-music">${I('note', 28)}<span><b>Add music</b><span>MP3, M4A, AAC, WAV, FLAC · pick many at once</span></span></button>
    <button class="addbtn" data-act="add-book">${I('book', 28)}<span><b>Add audiobook</b><span>One M4B file, or all MP3 parts of one book</span></span></button>
    ${S.jobs.length ? `<div class="label">Recently added</div>` + S.jobs.map((j) => `
      <div class="job">
        <div class="art ph" style="width:40px;height:40px;background:var(--surface);color:var(--muted)">${sv('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', 20, false, 1.8)}</div>
        <div class="txt">
          <div style="display:flex;justify-content:space-between;gap:8px"><span class="t1" style="font-size:15px">${esc(j.name)}</span>
          <span class="t2" style="color:${j.err ? 'var(--danger)' : j.status === 'Done' ? 'var(--ok)' : 'var(--muted)'}">${esc(j.status)}</span></div>
          <div class="bar${j.status === 'Done' ? ' done' : ''}"><div style="width:${j.pct}%"></div></div>
        </div>
      </div>`).join('') : ''}
    <div class="card">
      <div style="display:flex;justify-content:space-between;font-size:14px"><b>Storage used by Muzik</b><span id="storTotal" class="t2">…</span></div>
      <div class="stor"><div id="storM" style="width:0;background:var(--accent)"></div><div id="storB" style="width:0;background:#4FB3FF"></div></div>
      <div class="legend"><span><i class="dot" style="background:var(--accent)"></i><span id="storMl">Music</span></span><span><i class="dot" style="background:#4FB3FF"></i><span id="storBl">Audiobooks</span></span></div>
    </div>
    ${standalone ? '' : `<div class="card"><b>Tip: install Muzik</b><p>In Safari tap Share, then “Add to Home Screen”. Muzik then opens like a normal app and works offline. Add your files after installing — the home screen app keeps its own library.</p></div>`}
    <div class="card"><b>Copying from your Windows PC</b><p>Put your music in iCloud Drive or OneDrive on the PC (or copy to a USB stick), then tap “Add music” here and pick the files.</p></div>`;
}
async function fillStorage() {
  const m = sum(S.songs.map((s) => s.blob.size || 0)) + sum(S.songs.map((s) => (s.cover ? s.cover.size : 0)));
  const b = sum(S.books.map((x) => sum(x.parts.map((p) => p.blob.size || 0))));
  let quota = 0;
  try { if (navigator.storage && navigator.storage.estimate) quota = (await navigator.storage.estimate()).quota || 0; } catch (e) { /* ignore */ }
  const base = Math.max(quota, (m + b) * 1.5, 1);
  const set = (id, prop, v) => { const el = document.getElementById(id); if (el) el.style[prop] = v; };
  const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('storM', 'width', (m / base) * 100 + '%');
  set('storB', 'width', (b / base) * 100 + '%');
  txt('storTotal', fmtSize(m + b) + (quota ? ` of ${fmtSize(quota)}` : ''));
  txt('storMl', `Music ${fmtSize(m)}`);
  txt('storBl', `Audiobooks ${fmtSize(b)}`);
}

/* ---------- mini player ---------- */
function renderMini() {
  const el = $('#mini');
  const s = curSong(), b = curBook(), it = s || b;
  if (!it || S.playerOpen) { el.hidden = true; return; }
  el.hidden = false;
  const sub = s ? s.artist || 'Unknown artist' : b.author || 'Audiobook';
  el.innerHTML = `
    <button class="hit" data-act="open-player">${art(it, 44, s ? 'song' : 'book')}
      <span style="min-width:0"><span class="t1" style="display:block;font-size:15px;font-weight:600">${esc(it.title)}</span><span class="t2" style="display:block">${esc(sub)}</span></span>
    </button>
    <button class="icon-btn" data-act="toggle" aria-label="${audio.paused ? 'Play' : 'Pause'}">${I(audio.paused ? 'play' : 'pause', 26)}</button>
    ${s ? `<button class="icon-btn" data-act="next" aria-label="Next song">${I('next', 24)}</button>`
        : `<button class="icon-btn" data-act="fwd30" aria-label="Forward 30 seconds">${I('fwd30', 28, 1.6)}</button>`}`;
}

/* ---------- full player ---------- */
function renderPlayer() {
  const el = $('#player');
  if (!S.playerOpen) { el.hidden = true; return; }
  const s = curSong(), b = curBook();
  if (!s && !b) { S.playerOpen = false; el.hidden = true; return; }
  el.hidden = false;
  const top = `<div class="topbar">
      <button class="icon-btn" data-act="close-player" aria-label="Close player">${I('down', 28, 2.2)}</button>
      <div class="ttl">${s ? `<small>Playing</small>${esc(S.group ? S.group.name : 'Your music')}` : 'Audiobook'}</div>
      ${b && b.parts.length > 1 ? `<button class="icon-btn" data-act="parts" aria-label="Parts">${I('list', 22)}</button>` : `<button class="icon-btn" data-act="edit" data-kind="${s ? 'song' : 'book'}" data-id="${(s || b).id}" aria-label="Edit tags">${I('edit', 22)}</button>`}
    </div>`;
  const seek = `<div class="seek"><input id="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Position">
      <div class="times"><span id="tCur">0:00</span><span id="tLeft">-0:00</span></div>${b ? '<div class="left" id="tBook"></div>' : ''}</div>`;
  if (s) {
    el.innerHTML = `<div class="inner">${top}
      ${art(s, 0, 'song', 'cover')}
      <div class="np-title"><div style="min-width:0"><div class="t">${esc(s.title)}</div><div class="a">${esc([s.artist || 'Unknown artist', s.album].filter(Boolean).join(' · '))}</div></div></div>
      ${seek}
      <div class="controls">
        <button class="ctl sm${S.shuffle ? ' on' : ''}" data-act="shuffle" aria-label="Shuffle" aria-pressed="${S.shuffle}">${I('shuffle', 22)}</button>
        <button class="ctl" data-act="prev" aria-label="Previous">${I('prev', 34)}</button>
        <button class="playbig" data-act="toggle" id="bigPlay" aria-label="${audio.paused ? 'Play' : 'Pause'}">${I(audio.paused ? 'play' : 'pause', 34)}</button>
        <button class="ctl" data-act="next" aria-label="Next">${I('next', 34)}</button>
        <button class="ctl sm${S.repeat !== 'off' ? ' on' : ''}" data-act="repeat" aria-label="Repeat: ${S.repeat}" style="position:relative">${I('repeat', 22)}${S.repeat === 'one' ? '<b style="position:absolute;font-size:9px;top:8px;right:6px">1</b>' : ''}</button>
      </div>
      <div class="duo"><button class="${S.sleep ? 'on' : ''}" data-act="sleep">${I('moon', 18)}${esc(SLEEP[S.sleep].label.replace('part', 'song'))}</button>
        <button data-act="edit" data-kind="song" data-id="${s.id}">${I('edit', 18)}Edit tags</button></div>
    </div>`;
  } else {
    const p = prog(b.id);
    el.innerHTML = `<div class="inner">${top}
      ${art(b, 0, 'book', 'cover bookc')}
      <div class="np-title center"><div class="center"><div class="t">${esc(b.title)}</div><div class="a">${esc(b.author || 'Unknown author')}</div>
        ${b.parts.length > 1 ? `<button class="partbtn" data-act="parts">Part ${p.part + 1} of ${b.parts.length}${I('down', 14, 2.4)}</button>` : ''}</div></div>
      ${S.showParts ? `<div class="parts">${b.parts.map((x, i) => `<button class="${i === p.part ? 'on' : ''}" data-act="part" data-i="${i}"><span>${esc(baseName(x.name))}</span><span class="t2">${fmt(x.duration)}</span></button>`).join('')}</div>` : ''}
      ${seek}
      <div class="controls book">
        <button class="ctl" style="width:60px;height:60px" data-act="back15" aria-label="Back 15 seconds">${I('back15', 40, 1.6)}</button>
        <button class="playbig" data-act="toggle" id="bigPlay" aria-label="${audio.paused ? 'Play' : 'Pause'}">${I(audio.paused ? 'play' : 'pause', 34)}</button>
        <button class="ctl" style="width:60px;height:60px" data-act="fwd30" aria-label="Forward 30 seconds">${I('fwd30', 40, 1.6)}</button>
      </div>
      <div class="speedlbl">Speed</div>
      <div class="speeds">${SPEEDS.map((v) => `<button class="${p.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${p.speed === v}">${v}×</button>`).join('')}</div>
      <div class="duo"><button class="${S.sleep ? 'on' : ''}" data-act="sleep">${I('moon', 18)}${esc(SLEEP[S.sleep].label)}</button>
        <button data-act="edit" data-kind="book" data-id="${b.id}">${I('edit', 18)}Edit details</button></div>
    </div>`;
  }
  const seekEl = $('#seek');
  seekEl.addEventListener('input', () => { seeking = true; const d = audio.duration || 0; $('#tCur').textContent = fmt((seekEl.value / 1000) * d); });
  seekEl.addEventListener('change', () => { const d = audio.duration || 0; if (d) audio.currentTime = (seekEl.value / 1000) * d; seeking = false; });
  updateTimes();
}
let seeking = false;
function updateTimes() {
  if (!S.playerOpen || seeking) return;
  const d = audio.duration || 0, c = audio.currentTime || 0;
  const seekEl = $('#seek');
  if (!seekEl) return;
  seekEl.value = d ? Math.round((c / d) * 1000) : 0;
  $('#tCur').textContent = fmt(c);
  $('#tLeft').textContent = '-' + fmt(d - c);
  const b = curBook(), tb = $('#tBook');
  if (b && tb) {
    const done = sum(b.parts.slice(0, prog(b.id).part).map((x) => x.duration || 0)) + c;
    const r = prog(b.id).speed || 1;
    tb.textContent = `${fmtLeft((bookTotal(b) - done) / r)} left in book${r !== 1 ? ` at ${r}×` : ''}`;
  }
}
function renderPlayerButtons() {
  const big = $('#bigPlay');
  if (big) { big.innerHTML = I(audio.paused ? 'play' : 'pause', 34); big.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause'); }
}

/* ============================== tag editor ============================== */
let E = null; // the item being edited
function openEditor(kind, id) {
  const it = kind === 'song' ? song(id) : book(id);
  if (!it) return;
  E = { kind, it, cover: it.cover || null, coverChanged: false, coverUrl: null };
  renderEditor();
}
function renderEditor() {
  const el = $('#editor');
  if (!E) { el.hidden = true; return; }
  el.hidden = false;
  const { kind, it } = E;
  if (E.coverUrl) URL.revokeObjectURL(E.coverUrl);
  E.coverUrl = E.cover ? URL.createObjectURL(E.cover) : null;
  const pic = E.coverUrl ? `<img class="art" src="${E.coverUrl}" alt="Cover picture">` : `<div class="art ph" style="background:${tint(it.id)}">${I(kind === 'book' ? 'book' : 'note', 48, 1.6)}</div>`;
  const f = (id, label, val, type = 'text', mode) => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(val)}" ${mode ? `inputmode="${mode}"` : ''} autocomplete="off"></label>`;
  const mp3 = kind === 'song' && isMp3(it);
  el.innerHTML = `<div class="inner">
    <div class="topbar"><button class="textbtn" data-act="ed-cancel">Cancel</button><div class="ttl">${kind === 'song' ? 'Edit tags' : 'Edit audiobook'}</div><button class="textbtn b" data-act="ed-save">Save</button></div>
    <div class="edcover">${pic}<div class="btns">
      <button class="ghost" data-act="ed-cover">${I('image', 18)}Choose picture</button>
      ${E.cover ? `<button class="ghost danger" data-act="ed-cover-remove">${I('trash', 18)}Remove picture</button>` : ''}
    </div></div>
    ${f('fTitle', 'Title', it.title)}
    ${kind === 'song' ? f('fArtist', 'Artist', it.artist) + f('fAlbum', 'Album', it.album) : f('fArtist', 'Author', it.author)}
    <div class="two">${f('fGenre', 'Genre', it.genre)}${f('fYear', 'Year', it.year, 'text', 'numeric')}</div>
    ${kind === 'song' ? f('fTrack', 'Track number', it.track, 'text', 'numeric') : ''}
    <p class="note">${mp3 ? 'For MP3 files the new tags and picture are also written into the file itself, so they stay when you save the file elsewhere.'
      : kind === 'song' ? 'Changes are saved in Muzik. (Writing tags into the file itself works for MP3 files only.)'
      : 'Changes are saved in Muzik.'}</p>
    <div class="edfoot">
      ${kind === 'song' ? `<button class="ghost" data-act="ed-export">${I('share', 18)}Save file to Files…</button>` : ''}
      <button class="ghost danger" data-act="ed-delete">${I('trash', 18)}Delete from Muzik</button>
    </div>
  </div>`;
}
function closeEditor() {
  if (E && E.coverUrl) URL.revokeObjectURL(E.coverUrl);
  E = null;
  renderEditor();
}
const isMp3 = (s) => /\.mp3$/i.test(s.fileName || '') || s.type === 'audio/mpeg';
const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

async function writeId3(s) {
  const buf = await s.blob.arrayBuffer();
  const w = new window.ID3Writer(buf);
  if (s.title) w.setFrame('TIT2', s.title);
  if (s.artist) w.setFrame('TPE1', [s.artist]);
  if (s.album) w.setFrame('TALB', s.album);
  if (s.genre) w.setFrame('TCON', [s.genre]);
  const y = parseInt(s.year, 10);
  if (y) w.setFrame('TYER', y);
  if (s.track) w.setFrame('TRCK', String(s.track));
  if (s.cover) w.setFrame('APIC', { type: 3, data: await s.cover.arrayBuffer(), description: 'Cover' });
  w.addTag();
  return new Blob([w.arrayBuffer], { type: 'audio/mpeg' });
}

async function saveEditor() {
  if (!E) return;
  const { kind, it } = E;
  it.title = val('fTitle') || it.title;
  it.genre = val('fGenre'); it.year = val('fYear');
  if (kind === 'song') { it.artist = val('fArtist'); it.album = val('fAlbum'); it.track = val('fTrack'); }
  else it.author = val('fArtist');
  if (E.coverChanged) {
    if (it._cu) { URL.revokeObjectURL(it._cu); it._cu = null; }
    it.cover = E.cover;
  }
  let note = 'Saved';
  if (kind === 'song' && isMp3(it)) {
    try { it.blob = await writeId3(it); note = 'Saved (also written into the MP3)'; }
    catch (e) { console.error(e); note = 'Saved in Muzik (could not write into the file)'; }
  }
  try { await dbPut(kind === 'song' ? 'songs' : 'books', it); }
  catch (e) { console.error(e); toast(isQuota(e) ? 'Not enough space on the phone' : 'Could not save'); return; }
  closeEditor();
  renderAll();
  updateMedia();
  toast(note);
}
async function exportSong() {
  const s = E && E.it;
  if (!s) return;
  const file = new File([s.blob], s.fileName || s.title + '.mp3', { type: s.blob.type || s.type || 'audio/mpeg' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: s.title }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
async function deleteItem() {
  const { kind, it } = E;
  if (!confirm(`Delete “${it.title}” from Muzik? The original file in the Files app is not touched.`)) return;
  if ((kind === 'song' && S.mode === 'song' && S.queue[S.qi] === it.id) || (kind === 'book' && S.mode === 'book' && S.bookId === it.id)) {
    audio.pause(); audio.removeAttribute('src'); audio.load(); S.mode = null; S.playerOpen = false; renderPlayer();
  }
  if (kind === 'song') {
    await dbDel('songs', it.id);
    S.songs = S.songs.filter((s) => s.id !== it.id);
    S.queue = S.queue.filter((x) => x !== it.id); S.orig = S.orig.filter((x) => x !== it.id);
  } else {
    await dbDel('books', it.id); await dbDel('progress', it.id).catch(() => {});
    S.books = S.books.filter((b) => b.id !== it.id); delete S.progress[it.id];
  }
  if (it._cu) URL.revokeObjectURL(it._cu);
  closeEditor();
  if (S.group) {
    const g = S.group, unknown = g.type === 'album' ? 'Unknown album' : 'Unknown artist';
    if (!S.songs.some((s) => (s[g.type] || unknown) === g.name)) S.group = null;
  }
  renderAll();
  toast('Deleted');
}

/* ============================== events ============================== */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const d = t.dataset;
  switch (d.act) {
    case 'tab': S.tab = d.tab; S.group = null; window.scrollTo(0, 0); renderAll(); break;
    case 'add-music': $('#pickMusic').click(); break;
    case 'add-book': $('#pickBook').click(); break;
    case 'mview': S.musicView = d.v; renderView(); break;
    case 'group': S.group = { type: d.type, name: decodeURIComponent(d.name) }; window.scrollTo(0, 0); renderView(); break;
    case 'ungroup': S.group = null; renderView(); break;
    case 'play-song': playSongs(S.visible, +d.i, false); break;
    case 'play-all': playSongs(S.visible, 0, false); break;
    case 'shuffle-all': playSongs(S.visible, -1, true); break;
    case 'play-book':
      if (S.mode === 'book' && S.bookId === d.id) { S.playerOpen = true; renderAll(); }
      else { playBook(d.id); if (d.open) { S.playerOpen = true; renderAll(); } }
      break;
    case 'open-player': S.playerOpen = true; renderAll(); break;
    case 'close-player': S.playerOpen = false; renderAll(); break;
    case 'toggle': togglePlay(); break;
    case 'next': nextSong(false); break;
    case 'prev': prevSong(); break;
    case 'shuffle': toggleShuffle(); break;
    case 'repeat': cycleRepeat(); break;
    case 'back15': skip(-15); break;
    case 'fwd30': skip(30); break;
    case 'speed': setSpeed(parseFloat(d.v)); break;
    case 'sleep': cycleSleep(); break;
    case 'parts': S.showParts = !S.showParts; renderPlayer(); break;
    case 'part': loadPart(+d.i, 0, true); break;
    case 'edit': openEditor(d.kind, d.id); break;
    case 'ed-cancel': closeEditor(); break;
    case 'ed-save': saveEditor(); break;
    case 'ed-cover': $('#pickCover').click(); break;
    case 'ed-cover-remove': if (E) { E.cover = null; E.coverChanged = true; keepFields(renderEditor); } break;
    case 'ed-export': exportSong(); break;
    case 'ed-delete': deleteItem(); break;
  }
});
// keep what was typed in the editor when it re-renders (e.g. after choosing a picture)
function keepFields(fn) {
  const ids = ['fTitle', 'fArtist', 'fAlbum', 'fGenre', 'fYear', 'fTrack'];
  const saved = {};
  ids.forEach((id) => { const el = document.getElementById(id); if (el) saved[id] = el.value; });
  fn();
  ids.forEach((id) => { const el = document.getElementById(id); if (el && id in saved) el.value = saved[id]; });
}
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') { S.search = ev.target.value; const l = $('#mlist'); if (l) l.innerHTML = musicList(); }
});
$('#pickMusic').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importMusic(f); });
$('#pickBook').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importBook(f); });
$('#pickCover').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f || !E) return;
  try { E.cover = await resizeImage(f); E.coverChanged = true; keepFields(renderEditor); }
  catch (err) { toast('Could not use that picture'); }
});

/* ============================== start ============================== */
(async function start() {
  renderTabs();
  try {
    db = await openDB();
    const [songs, books, progress] = await Promise.all([dbAll('songs'), dbAll('books'), dbAll('progress')]);
    S.songs = songs; S.books = books;
    progress.forEach((p) => { S.progress[p.id] = p; });
  } catch (e) {
    console.error(e);
    $('#view').innerHTML = '<div class="empty">Muzik could not open its storage. If you are in a private Safari tab, open it in a normal tab.</div>';
    return;
  }
  renderAll();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
