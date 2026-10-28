'use strict';

/* =========================================================
   1923 Từ - luyện nói từ vựng tiếng Anh
   Dữ liệu: words.js (WORDS = [en, ipa, vi, ví dụ, dịch ví dụ, nhóm gốc, bài])
   Lưu tiến độ trong localStorage của từng máy.
   ========================================================= */

const APP_VERSION = '2.0.1';
const STORE_KEY = 'tu1923:v2';
const OLD_STORE_KEY = 'tu1923:v1'; // cách chia 6 cấp cũ: chỉ lấy lại cài đặt
/* 8 cấp. Cấp 1, 2 giữ đúng bài như file gốc.
   Cấp 3 trong file (Thông dụng, 720 từ, bài 55-126) trộn lẫn rồi chia đều 3 cấp: 240 / 240 / 240.
   Cấp 4 trong file (Mở rộng, 659 từ, bài 127-192) trộn lẫn rồi chia đều 3 cấp: 220 / 220 / 219.
   Trộn bằng hạt giống cố định nên máy nào cũng ra cùng một bộ từ cho mỗi cấp. */
const LEVEL_GROUPS = [
  { name: 'Nền tảng', groups: [0], parts: 1, fileRef: 'Cấp 1', desc: 'Từ chức năng và từ cốt lõi nhất (the, have, go, family...)' },
  { name: 'Đời sống', groups: [1], parts: 1, fileRef: 'Cấp 2', desc: 'Đồ vật, món ăn, thời gian, tính từ và động từ hằng ngày' },
  { name: 'Thông dụng', groups: [2, 3], parts: 3, seed: 55126, fileRef: 'Cấp 3', desc: 'Từ hay gặp trong công việc, tin tức, giao tiếp' },
  { name: 'Mở rộng', groups: [4, 5], parts: 3, seed: 127192, fileRef: 'Cấp 4', desc: 'Từ đời thường và công việc nâng cao hơn' },
];
const LEVEL_COLORS = [
  ['#22c1a3', '#1a9e86'], ['#3fa9f5', '#2b7fd4'], ['#7c6ff2', '#5b4fe0'], ['#a855f7', '#8b3fe0'],
  ['#d946ef', '#b832cc'], ['#f97316', '#e0590a'], ['#e5484d', '#c22f3b'], ['#c2410c', '#9a3412'],
];

const W = (i) => ({ i, en: WORDS[i][0], ipa: WORDS[i][1], vi: WORDS[i][2], ex: WORDS[i][3], exVi: WORDS[i][4], src: WORD_SOURCES[WORDS[i][5]] });

function seededShuffle(arr, seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const LEVELS = [];
for (const g of LEVEL_GROUPS) {
  const pool = [];
  WORDS.forEach((w, i) => { if (g.groups.includes(w[5])) pool.push(i); });
  const lessons = pool.map((i) => WORDS[i][6]);
  const lessonFrom = Math.min(...lessons), lessonTo = Math.max(...lessons);
  const mixed = g.parts > 1 ? seededShuffle(pool, g.seed) : pool;
  const base = Math.floor(mixed.length / g.parts), extra = mixed.length % g.parts;
  let at = 0;
  for (let p = 0; p < g.parts; p++) {
    const size = base + (p < extra ? 1 : 0);
    const items = mixed.slice(at, at + size); at += size;
    const n = LEVELS.length + 1;
    LEVELS.push({
      n, name: g.parts > 1 ? `${g.name} · Phần ${p + 1}` : g.name, short: g.name, part: g.parts > 1 ? p + 1 : 0, desc: g.desc,
      fileRef: `${g.fileRef}, ${g.parts > 1 ? 'trộn ' : ''}bài ${lessonFrom}-${lessonTo}`, mixed: g.parts > 1,
      color: LEVEL_COLORS[(n - 1) % LEVEL_COLORS.length], items, size, lessonFrom, lessonTo,
    });
  }
}

/* ---------------- lưu trữ ----------------
   runs[cấp]: lượt thi đang dở của cấp đó (báo cáo lần 1, các lần thi lại, từ còn sai, bài đang làm dở).
   reports: báo cáo tổng hợp, mỗi lần hoàn thành một cấp là một dòng. Giữ lại kể cả khi lượt thi của cấp đã xóa. */
const DEFAULT_SETTINGS = {
  seconds: 3, accent: 'en-US', rate: 0.95, readVi: true, hint: true, mode: 'voice', autoNext: true, pushToTalk: true,
};
const store = loadStore();
function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
function loadStore() {
  let data = readJSON(STORE_KEY);
  const old = data ? null : readJSON(OLD_STORE_KEY);
  if (!data || typeof data !== 'object') data = {};
  return {
    ver: 1,
    runs: data.runs && typeof data.runs === 'object' ? data.runs : {},
    reports: Array.isArray(data.reports) ? data.reports : [],
    settings: Object.assign({}, DEFAULT_SETTINGS, (old && old.settings) || {}, data.settings || {}),
    days: Array.isArray(data.days) ? data.days : [],
  };
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { toast('Không lưu được dữ liệu trên máy này (bộ nhớ trình duyệt bị chặn).'); }
}
const S = store.settings;
if (S.mode !== 'type') S.mode = 'voice';
const todayKey = () => new Date().toLocaleDateString('sv-SE');
function streakDays() {
  const set = new Set(store.days);
  let n = 0; const d = new Date();
  if (!set.has(d.toLocaleDateString('sv-SE'))) d.setDate(d.getDate() - 1);
  while (set.has(d.toLocaleDateString('sv-SE'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------- tiện ích ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (a, b) => (b ? Math.round(a * 100 / b) : 0);
const grade = (p) => (p >= 80 ? 'good' : p >= 50 ? 'mid' : 'low');
const fmtDur = (sec) => { const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} phút ${s}s` : `${s}s`; };
const fmtDate = (t) => { const d = new Date(t); return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); };
const fmtClock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
let toastTimer;
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const ICON = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M19 11a7 7 0 0 1-1.1 3.8M5 11a7 7 0 0 0 10.6 6M12 18v3"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.6A1 1 0 0 0 8 5.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17v.01"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
};

/* =========================================================
   Giọng nói: đọc (speechSynthesis) và nghe (SpeechRecognition)
   ========================================================= */
const hasTTS = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
let micBlocked = false; // người dùng đã chặn mic / máy không có mic

const Voice = {
  voices: [],
  init() {
    if (!hasTTS) return;
    const load = () => { this.voices = speechSynthesis.getVoices() || []; };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  },
  pick(lang) {
    const L = lang.toLowerCase().replace('_', '-');
    const vs = this.voices.filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-') === L);
    const good = (v) => /google|natural|neural|online|premium|enhanced|siri/i.test(v.name);
    return vs.find(good) || vs[0] || this.voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(L.slice(0, 2))) || null;
  },
  has(lang) { return !!this.pick(lang); },
  speak(text, lang, rate = 1) {
    return new Promise((resolve) => {
      if (!hasTTS || !text) return resolve(false);
      try { speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate;
      const v = this.pick(lang); if (v) u.voice = v;
      let done = false;
      const fin = (ok) => { if (done) return; done = true; clearTimeout(guard); resolve(ok); };
      u.onend = () => fin(true);
      u.onerror = () => fin(false);
      // Một số trình duyệt không bắn onend: tự kết thúc sau thời gian ước lượng
      const guard = setTimeout(() => fin(false), 1800 + text.length * 110 / rate);
      setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { fin(false); } }, 40);
    });
  },
  stop() { if (hasTTS) try { speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } },
};
Voice.init();
const speakEn = (w, slow) => Voice.speak(w, S.accent, slow ? 0.6 : S.rate);

/* ---------- so khớp câu trả lời ---------- */
const NUMBERS = {
  zero: ['0'], one: ['1', 'won'], two: ['2', 'to', 'too'], three: ['3'], four: ['4', 'for', 'fore'], five: ['5'], six: ['6'],
  seven: ['7'], eight: ['8', 'ate'], nine: ['9'], ten: ['10'], hundred: ['100', 'a hundred', 'one hundred'],
  thousand: ['1000', '1,000', 'a thousand', 'one thousand'], first: ['1st'], second: ['2nd'], percent: ['%', 'per cent'],
};
const HOMO = [
  ['to', 'two', 'too'], ['for', 'four', 'fore'], ['be', 'bee', 'b'], ['see', 'sea', 'c'], ['i', 'eye', 'aye'], ['a', 'uh', 'ah', 'eh'],
  ['one', 'won'], ['know', 'no'], ['right', 'write', 'rite'], ['by', 'buy', 'bye'], ['there', 'their', "they're"], ['hear', 'here'],
  ['new', 'knew'], ['would', 'wood'], ['week', 'weak'], ['meet', 'meat'], ['son', 'sun'], ['hour', 'our'], ['whole', 'hole'],
  ['mail', 'male'], ['sale', 'sail'], ['pair', 'pear'], ['peace', 'piece'], ['plain', 'plane'], ['road', 'rode'], ['tail', 'tale'],
  ['wait', 'weight'], ['way', 'weigh'], ['wear', 'where'], ['which', 'witch'], ['weather', 'whether'], ['flour', 'flower'],
  ['break', 'brake'], ['steal', 'steel'], ['fair', 'fare'], ['hire', 'higher'], ['red', 'read'], ['blue', 'blew'], ['made', 'maid'],
  ['night', 'knight'], ['not', 'knot'], ['in', 'inn'], ['of', 'off'], ['do', 'due', 'dew'], ['or', 'oar', 'ore'], ['so', 'sew', 'sow'],
  ['me', 'mi'], ['my', 'mai'], ['we', 'wee'], ['an', 'and'], ['it', 'eat'], ['he', 'hee'], ['us', 'u s'], ['if', 'iff'], ['as', 'has'],
  ['at', 'add'], ['up', 'op'], ['go', 'goal'], ['email', 'e mail', 'gmail'], ['ok', 'okay'], ['cell', 'sell'], ['sent', 'cent', 'scent'],
  ['dear', 'deer'], ['die', 'dye'], ['fine', 'find'], ['bear', 'bare'], ['allowed', 'aloud'], ['heel', 'heal'], ['role', 'roll'],
];
const ALIAS = {};
for (const g of HOMO) for (const w of g) ALIAS[w] = (ALIAS[w] || []).concat(g.filter((x) => x !== w));
for (const [w, list] of Object.entries(NUMBERS)) ALIAS[w] = (ALIAS[w] || []).concat(list);

function norm(s) {
  return String(s).toLowerCase()
    .replace(/%/g, ' percent ')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const VERDICT_TEXT = { exact: 'Chính xác', near: 'Gần đúng', syn: 'Đúng nghĩa' };

/* Các từ có nghĩa tiếng Việt y hệt nhau (vd "nói" = say/speak): nói từ nào cũng tính đúng */
const SYN = {};
{
  const byVi = {};
  WORDS.forEach((w) => (byVi[w[2]] = byVi[w[2]] || []).push(w[0].toLowerCase()));
  for (const list of Object.values(byVi)) if (list.length > 1) for (const w of list) SYN[w] = list.filter((x) => x !== w);
}

/** Trả về 'exact' | 'near' | 'syn' | null */
function matchAnswer(target, transcripts) {
  const t = norm(target);
  const variants = new Set([t, ...(ALIAS[t] || []).map(norm)]);
  const syns = new Set(SYN[t] || []);
  let near = false, syn = false;
  for (const raw of transcripts) {
    const n = norm(raw); if (!n) continue;
    if (variants.has(n) || variants.has(n.replace(/ /g, ''))) return 'exact';
    const toks = n.split(' ');
    for (let k = 0; k < toks.length; k++) {
      const tok = toks[k].replace(/'s$/, '');
      if (variants.has(toks[k]) || variants.has(tok)) return 'exact';
      if (k + 1 < toks.length && variants.has(toks[k] + ' ' + toks[k + 1])) return 'exact';
      if (k + 1 < toks.length && (toks[k] + toks[k + 1]) === t) return 'exact';
      if (syns.has(tok)) syn = true;
      if (tok === t + 's' || tok === t + 'es' || tok + 's' === t || tok === t + 'd' || tok === t + 'ed') near = true;
      if (t.length >= 5 && Math.abs(tok.length - t.length) <= 2 && lev(tok, t) <= (t.length >= 8 ? 2 : 1)) near = true;
    }
  }
  return near ? 'near' : syn ? 'syn' : null;
}

/**
 * Nghe một từ trong `ms` mili giây.
 * Kết quả: { verdict: 'exact'|'near'|'syn'|null, heard, error }
 * Hết giờ mà máy đã nghe thấy tiếng nói thì chờ thêm chút cho máy xử lý xong (máy nhận dạng thường trễ 0,5-1,5 giây).
 */
let activeRec = null;
function listenFor(target, ms, { onStart, onHeard, onSound } = {}) {
  return new Promise((resolve) => {
    const SR = getSR();
    if (!SR) return resolve({ verdict: null, heard: '', error: 'unsupported' });
    let rec;
    try { rec = new SR(); } catch (e) { return resolve({ verdict: null, heard: '', error: 'unsupported' }); }
    activeRec = rec;
    // continuous=false ổn định hơn trên Chrome Android; máy ngắt sớm thì mở lại
    rec.lang = S.accent; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 5;
    let prevHeard = '', heard = '', done = false, timedOut = false, started = false, near = false, sound = false;
    let deadline = 0, timer = null, graceTimer = null, startGuard = null, lastError = '';
    const finish = (verdict, error) => {
      if (done) return; done = true;
      clearTimeout(timer); clearTimeout(graceTimer); clearTimeout(startGuard);
      rec.onresult = rec.onerror = rec.onend = rec.onstart = rec.onspeechstart = rec.onsoundstart = rec.onaudiostart = null;
      try { rec.abort(); } catch (e) { /* bỏ qua */ }
      if (activeRec === rec) activeRec = null;
      resolve({ verdict, heard: heard.trim(), error });
    };
    const begin = () => {
      if (started || done) return; started = true;
      deadline = performance.now() + ms;
      onStart && onStart(ms);
      timer = setTimeout(() => {
        timedOut = true;
        if (near) return finish(near);
        graceTimer = setTimeout(() => finish(near || null), sound ? 1800 : 500);
      }, ms);
    };
    const gotSound = () => { if (!sound) { sound = true; onSound && onSound(); } };
    rec.onstart = begin;
    rec.onaudiostart = begin;
    rec.onsoundstart = gotSound;
    rec.onspeechstart = gotSound;
    rec.onresult = (e) => {
      gotSound();
      const alts = []; let cur = ''; let allFinal = true;
      for (let r = 0; r < e.results.length; r++) {
        const res = e.results[r];
        cur += (res[0] && res[0].transcript) || '';
        if (!res.isFinal) allFinal = false;
        for (let a = 0; a < res.length; a++) alts.push(res[a].transcript);
      }
      heard = (prevHeard ? prevHeard + ' ' : '') + cur;
      alts.unshift(cur, heard);
      onHeard && onHeard(heard.trim());
      const v = matchAnswer(target, alts);
      if (v === 'exact') return finish('exact');
      if (v === 'near') near = 'near';
      else if (v === 'syn' && !near) near = 'syn';
      if (timedOut && allFinal) finish(near || null);
    };
    rec.onerror = (e) => {
      lastError = e.error || 'error';
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') micBlocked = true;
      finish(near || null, lastError);
    };
    rec.onend = () => {
      if (done) return;
      if (timedOut) return finish(near || null);
      if (!started) return finish(null, lastError || 'no-start');
      // máy tự ngắt khi còn giờ (vd sau một từ ngắn): mở lại để nghe tiếp
      prevHeard = heard;
      if (deadline - performance.now() > 500) { try { rec.start(); return; } catch (e) { /* rơi xuống */ } }
      // còn rất ít thời gian: chờ hết giờ rồi chấm
    };
    // Có máy không bắn onstart: vẫn bắt đầu đếm giờ sau 1,6 giây
    startGuard = setTimeout(begin, 1600);
    try { rec.start(); } catch (e) { finish(null, 'start-failed'); }
  });
}

/* Xin quyền mic trước khi vào bài, để hộp thoại xin quyền không ăn mất 3 giây của từ đầu tiên */
async function ensureMic() {
  if (!getSR()) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'ok';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micBlocked = false;
    return 'ok';
  } catch (e) {
    micBlocked = true;
    return e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? 'nodevice' : 'denied';
  }
}
function stopListening() { if (activeRec) { try { activeRec.abort(); } catch (e) { /* bỏ qua */ } activeRec = null; } }

/* =========================================================
   Điều hướng màn hình
   ========================================================= */
const app = $('#app');
let screen = 'home';
let cleanup = null;
function go(name, ...args) {
  if (cleanup) { try { cleanup(); } catch (e) { /* bỏ qua */ } cleanup = null; }
  Voice.stop(); stopListening();
  screen = name;
  const fn = SCREENS[name];
  app.innerHTML = '';
  window.scrollTo(0, 0);
  fn(...args);
  app.firstElementChild && app.firstElementChild.classList.add('fade-in');
}
function topbar(title, { back = 'home', right = '' } = {}) {
  return `<div class="topbar">
    <button class="icon-btn" data-back aria-label="Quay lại">${ICON.back}</button>
    <div class="title">${title}</div>
    ${right || '<span class="spacer"></span>'}
  </div>`;
}
function bindBack(root, target) { const b = $('[data-back]', root); if (b) b.onclick = typeof target === 'function' ? target : () => go(target || 'home'); }

function levelBadge(lv, text) {
  return `<div class="level-badge" style="background:linear-gradient(135deg,${lv.color[0]},${lv.color[1]})">${text ?? lv.n}</div>`;
}

function supportNotice() {
  const SR = getSR();
  const secure = window.isSecureContext;
  if (!SR) {
    return `<div class="notice">${ICON.warn}<div>Trình duyệt này <b>chưa hỗ trợ nhận giọng nói</b>. Bạn vẫn học được bằng cách <b>gõ phím</b>, máy tự chấm. Muốn nói vào mic, hãy mở bằng <b>Chrome</b> hoặc <b>Edge</b> (Android, Windows, Mac).</div></div>`;
  }
  if (!secure) {
    return `<div class="notice">${ICON.warn}<div>Trang đang mở không qua <b>HTTPS</b> nên trình duyệt sẽ không cho dùng mic. Hãy mở bằng đường link https hoặc localhost.</div></div>`;
  }
  let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (framed && !micBlocked) {
    return `<div class="notice info">${ICON.info}<div>App đang mở trong một khung nhúng nên mic có thể bị chặn. Nếu mic không chạy, app chuyển sang <b>gõ phím</b>. Muốn nói vào mic, hãy mở app ở trang web riêng của nó.</div></div>`;
  }
  if (micBlocked) {
    return `<div class="notice">${ICON.micOff}<div><b>Mic đang bị chặn hoặc không có mic.</b> Bấm biểu tượng ổ khóa cạnh thanh địa chỉ, cho phép Micro, rồi tải lại trang. Trong lúc đó bạn làm bài bằng cách gõ phím.</div></div>`;
  }
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return `<div class="notice info">${ICON.info}<div>Trên iPhone/iPad, nhận giọng nói của Safari còn chập chờn. Nếu máy không nghe được, vào <b>Cài đặt</b> chọn <b>Gõ phím</b>.</div></div>`;
  }
  return '';
}
const useMic = () => S.mode !== 'type' && !!getSR() && window.isSecureContext && !micBlocked;
/* Nói: mỗi từ cùng một thời gian (mặc định 3 giây).
   Gõ phím: theo độ dài từ, 3 giây để nghĩ + 0,5 giây cho mỗi chữ cái (go 4s, family 6s, beautiful 8s, responsibility 10s) */
const answerSeconds = () => S.seconds;
const typeSeconds = (en) => Math.ceil(3 + en.length * 0.5);
/* Thời gian làm bài tối đa của một bài = tổng thời gian trả lời của các từ trong bài
   (vd 360 từ × 3 giây = 18 phút). Chỉ tính lúc người học trả lời, không tính lúc máy đọc nghĩa, phát âm. */
const testLimitSec = (items, voice) => items.reduce((a, i) => a + (voice ? answerSeconds(WORDS[i][0]) : typeSeconds(WORDS[i][0])), 0);
const fmtLimit = (sec) => (sec < 60 ? `${sec} giây` : `${Math.floor(sec / 60)} phút${sec % 60 ? ` ${sec % 60} giây` : ''}`);

/* =========================================================
   Các màn hình
   ========================================================= */
const SCREENS = {};

/* ---------- Trang chủ: bấm vào cấp là vào thi luôn ---------- */
SCREENS.home = () => {
  const doneLv = new Set(store.reports.map((r) => r.lv)).size;
  const started = store.reports.length || Object.keys(store.runs).length;
  const notice = supportNotice();
  app.innerHTML = `<div>
    <div class="topbar">
      <div class="brand"><div class="brand-logo">1923</div><span>1923 Từ</span></div>
      <button class="icon-btn" id="btnInstall" aria-label="Cài lên máy" title="Cài lên máy" hidden>${ICON.download}</button>
      <button class="icon-btn" id="btnReport" aria-label="Báo cáo tổng hợp" title="Báo cáo tổng hợp">${ICON.chart}</button>
      <button class="icon-btn" id="btnSettings" aria-label="Cài đặt" title="Cài đặt">${ICON.gear}</button>
    </div>
    <div class="hero">
      <h2>${started ? 'Chào bạn, thi tiếp nào!' : 'Chào bạn 👋'}</h2>
      <p>Bấm vào một cấp là vào thi luôn. Nhìn nghĩa tiếng Việt, nói từ tiếng Anh trong ${S.seconds} giây. Từ nào sai thì thi lại tới khi hết sai.</p>
      <div class="hero-stats">
        <div class="hero-stat"><b>${doneLv}/${LEVELS.length}</b><span>cấp đã hoàn thành</span></div>
        <div class="hero-stat"><b>${store.reports.length}</b><span>lần hoàn thành</span></div>
        <div class="hero-stat"><b>${streakDays()}</b><span>ngày liên tiếp</span></div>
      </div>
    </div>
    ${notice ? `<div style="margin-top:14px">${notice}</div>` : ''}
    <div class="section-title">${LEVELS.length} cấp độ · 1.923 từ</div>
    <div class="level-grid">
      ${LEVELS.map((lv) => {
        const run = store.runs[lv.n];
        const st = levelStatus(lv, run);
        return `<button class="level-card" data-level="${lv.n}">
          ${levelBadge(lv)}
          <div class="level-info">
            <div class="level-name">Cấp ${lv.n} · ${esc(lv.name)}</div>
            <div class="level-meta">${lv.size} từ · ${lv.mixed ? 'trộn ' : ''}bài ${lv.lessonFrom}-${lv.lessonTo}</div>
            <div class="level-meta">${st.text}</div>
            ${run && run.first ? `<div class="bar"><i style="width:${pct(lv.size - run.pending.length, lv.size)}%"></i></div>` : ''}
          </div>
          <div class="level-score"><b>${st.big}</b><span>${st.small}</span></div>
        </button>`;
      }).join('')}
    </div>
  </div>`;
  app.querySelectorAll('[data-level]').forEach((b) => (b.onclick = () => {
    const n = +b.dataset.level;
    if (store.runs[n]) go('result', n); else startRound(n);
  }));
  $('#btnReport').onclick = () => go('report');
  $('#btnSettings').onclick = () => go('settings');
  const ib = $('#btnInstall');
  if (deferredInstall) { ib.hidden = false; ib.onclick = doInstall; }
};
function levelStatus(lv, run) {
  const times = store.reports.filter((r) => r.lv === lv.n).length;
  if (!run) return { text: times ? `Đã hoàn thành ${times} lần. Bấm để thi lượt mới` : 'Chưa thi. Bấm để thi', big: times, small: 'lần xong' };
  const L = run.live;
  if (!run.first) return { text: 'Đang thi lần 1 dở, bấm để thi tiếp', big: `${L ? L.results.length : 0}/${lv.size}`, small: 'đã làm' };
  const k = run.rounds.length;
  return {
    text: L ? `Đang thi lại lần ${L.round} dở, bấm để thi tiếp` : `Lần 1 đạt ${pct(run.first.c, run.first.n)}% · ${k ? `đã thi lại ${k} lần` : 'chưa thi lại'}`,
    big: run.pending.length, small: 'từ còn sai',
  };
}

function quickToggles() {
  const micOk = !!getSR() && window.isSecureContext && !micBlocked;
  return `<div class="toggles">
    <div class="toggle-row">
      <div class="t-main"><div class="t-title">Trả lời bằng</div><div class="t-sub">${micOk ? 'Nói vào mic hoặc gõ phím. Máy tự chấm cả hai.' : 'Máy này chưa dùng được mic nên trả lời bằng gõ phím.'}</div></div>
      <div class="seg" data-set="mode">
        <button data-v="voice" class="${S.mode !== 'type' && micOk ? 'on' : ''}" ${micOk ? '' : 'disabled'}>Nói</button>
        <button data-v="type" class="${S.mode === 'type' || !micOk ? 'on' : ''}">Gõ phím</button>
      </div>
    </div>
    <div class="toggle-row">
      <div class="t-main"><div class="t-title">Bấm nút mic để nói</div><div class="t-sub">Bật: mỗi từ bạn bấm nút mic rồi mới đếm giờ. Tắt: mic tự bật sau khi đọc nghĩa.</div></div>
      <label class="switch"><input type="checkbox" data-set="pushToTalk" ${S.pushToTalk ? 'checked' : ''}><span></span></label>
    </div>
    <div class="toggle-row">
      <div class="t-main"><div class="t-title">Gợi ý chữ cái đầu</div><div class="t-sub">Hiện chữ đầu và số chữ cái, vd: b _ _ _</div></div>
      <label class="switch"><input type="checkbox" data-set="hint" ${S.hint ? 'checked' : ''}><span></span></label>
    </div>
    <div class="toggle-row">
      <div class="t-main"><div class="t-title">Đọc to nghĩa tiếng Việt</div><div class="t-sub">${Voice.has('vi-VN') || !hasTTS ? 'Máy đọc nghĩa trước khi bạn nói' : 'Máy chưa có giọng tiếng Việt, có thể đọc không chuẩn'}</div></div>
      <label class="switch"><input type="checkbox" data-set="readVi" ${S.readVi ? 'checked' : ''}><span></span></label>
    </div>
  </div>`;
}
function bindQuickToggles(root) {
  root.querySelectorAll('.seg[data-set]').forEach((seg) => {
    seg.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      S[seg.dataset.set] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
      if (seg.dataset.set === 'accent') S.accent = b.dataset.v;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      saveStore();
    }));
  });
  root.querySelectorAll('input[type=checkbox][data-set]').forEach((c) => (c.onchange = () => { S[c.dataset.set] = c.checked; saveStore(); }));
}

/* ---------- Màn làm bài ----------
   Một lượt thi của cấp: lần 1 thi đủ cả cấp, các lần thi lại chỉ có những từ còn sai.
   Bài đang làm được lưu sau mỗi từ, tắt app mở lại vẫn thi tiếp đúng chỗ đang dở. */
let T = null;
async function startRound(n) {
  const lv = LEVELS[n - 1];
  const run = store.runs[n] || (store.runs[n] = { started: Date.now(), first: null, rounds: [], pending: [], wrong: [], live: null });
  if (!run.live) {
    const items = shuffle(run.first ? run.pending : lv.items);
    if (!items.length) return toast('Không có từ nào để thi.');
    run.live = { kind: run.first ? 'retake' : 'first', round: run.first ? run.rounds.length + 1 : 0, items, results: [], usedMs: 0, limitMs: 0, startedAt: Date.now() };
  }
  if (useMic()) {
    const m = await ensureMic();
    if (m === 'denied') toast('Bạn chưa cho phép mic. Bài này làm bằng gõ phím.', 4000);
    else if (m === 'nodevice') toast('Không tìm thấy mic. Bài này làm bằng gõ phím.', 4000);
  }
  const L = run.live;
  // thời gian làm bài tối đa = số từ × 3 giây, chỉ tính lúc trả lời
  if (!L.limitMs) L.limitMs = testLimitSec(L.items, useMic()) * 1000;
  saveStore();
  T = {
    lv: n, run, kind: L.kind, round: L.round, items: L.items, pos: L.results.length,
    results: L.results.map(([i, ok, heard]) => ({ i, ok: !!ok, heard })),
    token: 0, paused: false, startedAt: L.startedAt, phase: 'idle', cancelTap: null,
    limitMs: L.limitMs, usedMs: L.usedMs, runFrom: null, timeUp: false,
    title: `Cấp ${lv.n} · ${lv.name}`, sub: L.kind === 'first' ? 'Lần 1 · cả cấp' : `Thi lại lần ${L.round}`,
  };
  go('test');
}
function saveLive() {
  if (!T || !T.run.live) return;
  const L = T.run.live;
  L.results = T.results.map((r) => [r.i, r.ok ? 1 : 0, r.heard || '']);
  L.usedMs = T.usedMs + (T.runFrom != null ? performance.now() - T.runFrom : 0);
  L.limitMs = T.limitMs;
  saveStore();
}

SCREENS.test = () => {
  const ring = 2 * Math.PI * 56;
  app.innerHTML = `<div>
    <div class="test-top">
      <button class="icon-btn" id="tQuit" aria-label="Dừng bài">${ICON.close}</button>
      <div class="title">${esc(T.title)}<small>${esc(T.sub)} · <span id="tCount"></span></small></div>
      <button class="icon-btn" id="tPause" aria-label="Tạm dừng">${ICON.pause}</button>
    </div>
    <div class="progress"><i id="tBar" style="width:0"></i></div>
    <div class="scoreline">
      <span class="chip ok">${ICON.check}<span id="tOk">0</span></span>
      <span class="chip bad">${ICON.cross}<span id="tBad">0</span></span>
      ${T.limitMs ? `<span class="chip clock" id="tClockChip" title="Thời gian làm bài còn lại (chỉ tính lúc bạn trả lời)">${ICON.clock}<span id="tClock">${fmtClock(T.limitMs)}</span></span>` : ''}
    </div>
    <div class="card q-card">
      <div class="q-label">Nghĩa tiếng Việt
        <button class="icon-btn" id="tSayVi" style="width:34px;height:34px;border-radius:10px" aria-label="Đọc lại nghĩa">${ICON.speaker.replace('<svg', '<svg style="width:17px;height:17px"')}</button>
      </div>
      <div class="q-vi" id="tVi"></div>
      <div class="q-hint" id="tHint"></div>
      <div class="ring-wrap" id="tRing">
        <svg class="ring" viewBox="0 0 132 132"><circle class="ring-bg" cx="66" cy="66" r="56"/><circle class="ring-fg" id="tRingFg" cx="66" cy="66" r="56" stroke-dasharray="${ring}" stroke-dashoffset="0"/></svg>
        <div class="ring-center"><button class="mic" id="tMic" type="button" aria-label="Bấm để nói">${ICON.mic}</button></div>
        <span class="ring-sec" id="tSec">${S.seconds}s</span>
      </div>
      <div class="q-status" id="tStatus"></div>
      <div class="q-heard" id="tHeard"></div>
      <form class="type-box hidden" id="tType" autocomplete="off">
        <input id="tInput" type="text" inputmode="latin" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ từ tiếng Anh..." aria-label="Gõ từ tiếng Anh">
        <button class="btn" type="submit">Kiểm tra</button>
      </form>
      <div class="reveal hidden" id="tReveal"></div>
    </div>
    <div class="test-actions single" id="tActions"></div>
    <div class="kbd-hint" id="tKbd">Phím tắt: Space = tạm dừng/tiếp tục · Enter = từ tiếp theo</div>
  </div>`;
  $('#tQuit').onclick = () => {
    pauseTest();
    if (confirm('Dừng bài ở đây? Lần sau bấm vào cấp này sẽ thi tiếp từ chỗ đang dở.')) { saveLive(); T = null; go('home'); }
    else resumeTest();
  };
  $('#tPause').onclick = () => (T.paused ? resumeTest() : pauseTest());
  $('#tSayVi').onclick = () => { if (T.phase !== 'listen') Voice.speak(W(T.items[T.pos]).vi, 'vi-VN'); };
  const onKey = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); T.paused ? resumeTest() : pauseTest(); }
    else if (e.key === 'Enter') { const b = $('#tNext'); if (b) { e.preventDefault(); b.click(); } }
  };
  const onVis = () => { if (document.hidden && !T.paused) pauseTest(); };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  let clockTimer = null;
  if (T.limitMs) {
    clockTimer = setInterval(() => {
      if (!T || screen !== 'test') return;
      const left = clockLeft();
      $('#tClock').textContent = fmtClock(left);
      $('#tClockChip').classList.toggle('low', left <= 60000);
      if (left <= 0 && !T.timeUp) { T.timeUp = true; toast('Hết thời gian làm bài!'); finishTest(); }
    }, 500);
  }
  cleanup = () => { clearInterval(clockTimer); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); T && (T.token++); };
  runWord();
};

/* Đồng hồ thời gian làm bài: chỉ chạy lúc người học trả lời (chờ bấm mic, đang nói, đang gõ), tạm dừng thì dừng */
function clockLeft() { return T.limitMs - T.usedMs - (T.runFrom != null ? performance.now() - T.runFrom : 0); }
function clockStart() { if (T && T.limitMs && T.runFrom == null) T.runFrom = performance.now(); }
function clockStop() { if (T && T.runFrom != null) { T.usedMs += performance.now() - T.runFrom; T.runFrom = null; } }

function updateTestHeader() {
  const done = T.results.length;
  $('#tCount').textContent = `${Math.min(T.pos + 1, T.items.length)}/${T.items.length}`;
  $('#tBar').style.width = pct(done, T.items.length) + '%';
  $('#tOk').textContent = T.results.filter((r) => r.ok).length;
  $('#tBad').textContent = T.results.filter((r) => !r.ok).length;
}
function setRing(frac, cls) {
  const fg = $('#tRingFg'); if (!fg) return;
  const len = 2 * Math.PI * 56;
  fg.style.transition = 'none';
  fg.style.strokeDashoffset = String(len * (1 - frac));
  const wrap = $('#tRing'); wrap.classList.remove('live', 'ok', 'bad'); if (cls) wrap.classList.add(cls);
}
function animateRing(ms) {
  const fg = $('#tRingFg'); if (!fg) return;
  const len = 2 * Math.PI * 56;
  fg.style.transition = 'none'; fg.style.strokeDashoffset = '0';
  void fg.getBoundingClientRect();
  fg.style.transition = `stroke-dashoffset ${ms}ms linear`;
  fg.style.strokeDashoffset = String(len);
  const sec = $('#tSec'); const end = performance.now() + ms; const tok = T.token;
  const tick = () => {
    if (!sec.isConnected || !T || T.token !== tok || T.phase !== 'listen') return;
    sec.textContent = Math.max(0, Math.ceil((end - performance.now()) / 1000)) + 's';
    if (performance.now() < end) requestAnimationFrame(tick);
  };
  tick();
}
function hintFor(en) {
  if (!S.hint) return '';
  const rest = en.slice(1).replace(/[a-z]/gi, '_').split('').join(' ');
  return `${esc(en[0])} ${rest}<small>(${en.length} chữ)</small>`;
}

async function runWord() {
  const tok = ++T.token;
  const alive = () => T && T.token === tok && screen === 'test';
  if (T.pos >= T.items.length) return finishTest();
  const w = W(T.items[T.pos]);
  T.phase = 'prompt';
  updateTestHeader();
  $('#tVi').textContent = w.vi;
  $('#tHint').innerHTML = hintFor(w.en);
  $('#tHeard').textContent = '';
  $('#tReveal').classList.add('hidden');
  $('#tActions').innerHTML = '';
  const secs = answerSeconds(w.en);
  $('#tSec').textContent = secs + 's';
  setRing(1);
  $('#tMic').innerHTML = useMic() ? ICON.mic : ICON.micOff;
  $('#tStatus').textContent = S.readVi ? 'Đang đọc nghĩa...' : 'Chuẩn bị...';
  if (S.readVi) await Voice.speak(w.vi, 'vi-VN', 1.05); else await sleep(500);
  if (!alive()) return;

  let verdict = null, heard = '';
  let byVoice = useMic();
  T.phase = 'listen';
  if (byVoice) {
    // Chế độ "bấm để nói": chờ người học bấm nút mic (cần trên iPhone/iPad, máy chặn mic tự bật)
    const res = await new Promise((resolve) => {
      let windowEnd = null;
      const start = () => {
        clockStop(); // lúc máy mở mic không tính
        $('#tMic').onclick = null;
        $('#tRing').classList.remove('tap');
        $('#tStatus').textContent = 'Đang mở mic...';
        listenFor(w.en, secs * 1000, {
          onStart: (ms) => {
            if (!alive()) return;
            clockStart(); clearTimeout(windowEnd); windowEnd = setTimeout(clockStop, ms);
            $('#tStatus').textContent = `Nói từ tiếng Anh! (${secs} giây)`; $('#tRing').classList.add('live'); animateRing(ms);
          },
          onSound: () => { if (alive() && !$('#tHeard').textContent) $('#tHeard').innerHTML = '<span class="muted">Đang nghe...</span>'; },
          onHeard: (h) => { if (alive()) $('#tHeard').innerHTML = `Máy nghe: <b>${esc(h)}</b>`; },
        }).then((r) => { clearTimeout(windowEnd); clockStop(); resolve(r); });
      };
      T.cancelTap = () => { clearTimeout(windowEnd); clockStop(); resolve({ verdict: null, heard: '', error: 'cancel' }); };
      if (S.pushToTalk) {
        clockStart(); // thời gian chờ bấm mic là thời gian nghĩ, có tính
        $('#tStatus').textContent = `Bấm nút mic rồi nói (${secs} giây)`;
        $('#tRing').classList.add('tap');
        $('#tMic').onclick = start;
      } else start();
    });
    if (T) T.cancelTap = null;
    if (!alive()) return;
    if (res.error && !['no-start', 'no-speech', 'aborted', 'cancel'].includes(res.error)) {
      toast('Mic lỗi: ' + micErrorText(res.error) + (micBlocked ? '. Chuyển sang gõ phím.' : ''), 4000);
      if (micBlocked || res.error === 'unsupported') {
        byVoice = false;
        // chuyển sang gõ phím giữa bài: cộng thêm phần thời gian gõ còn thiếu cho các từ còn lại
        if (T.limitMs) T.limitMs += (testLimitSec(T.items.slice(T.pos), false) - testLimitSec(T.items.slice(T.pos), true)) * 1000;
      }
    }
    if (byVoice) { verdict = res.verdict; heard = res.heard; }
  }
  if (!byVoice) {
    // Không dùng được mic: gõ từ tiếng Anh, máy tự chấm
    const ms = typeSeconds(w.en) * 1000;
    $('#tMic').innerHTML = ICON.keyboard;
    $('#tStatus').textContent = 'Gõ từ tiếng Anh rồi bấm Enter';
    $('#tHeard').textContent = '';
    const box = $('#tType'), inp = $('#tInput');
    box.classList.remove('hidden'); inp.value = ''; inp.disabled = false;
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
    $('#tRing').classList.add('live');
    animateRing(ms);
    $('#tStatus').textContent = `Gõ từ tiếng Anh rồi bấm Enter (${Math.round(ms / 1000)} giây)`;
    clockStart();
    const typed = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(inp.value), ms);
      box.onsubmit = (e) => { e.preventDefault(); clearTimeout(t); resolve(inp.value); };
      T.cancelTap = () => { clearTimeout(t); resolve(null); };
    });
    clockStop();
    if (T) T.cancelTap = null;
    inp.disabled = true; box.onsubmit = (e) => e.preventDefault();
    if (!alive()) return;
    box.classList.add('hidden');
    heard = (typed || '').trim();
    const v = heard ? matchAnswer(w.en, [heard]) : null;
    // khi gõ: chỉ chấp nhận đúng từ, sai 1 chữ cái là "gần đúng"; đồng âm (two/to) không tính
    const nh = norm(heard), nt = norm(w.en);
    verdict = !heard ? null : nh === nt ? 'exact' : v === 'syn' ? 'syn' : (nt.length >= 4 && lev(nh, nt) <= 1) ? 'near' : null;
  }

  T.phase = 'reveal';
  const ok = !!verdict;
  const exEsc = esc(w.ex).replace(new RegExp(`\\b(${w.en.replace(/[^a-z]/gi, '')}\\w*)`, 'i'), '<mark>$1</mark>');
  const rv = $('#tReveal');
  rv.className = 'reveal' + (ok ? ' ok' : ' bad');
  rv.innerHTML = `
    ${ok ? `<span class="verdict ${verdict === 'exact' ? 'ok' : 'near'}">${ICON.check}${VERDICT_TEXT[verdict]}</span>`
      : `<span class="verdict bad">${ICON.cross}${heard ? 'Chưa đúng' : 'Hết giờ'}</span>`}
    <div class="reveal-word"><span class="en">${esc(w.en)}</span><span class="ipa">${esc(w.ipa)}</span></div>
    <div class="example">${exEsc}<span class="vi">${esc(w.exVi)}</span></div>
    <div class="speak-btns">
      <button class="btn sm secondary" id="tHear">${ICON.speaker}Nghe lại</button>
      <button class="btn sm ghost" id="tSlow">${ICON.slow}Nghe chậm</button>
    </div>`;
  $('#tHear').onclick = () => speakEn(w.en);
  $('#tSlow').onclick = () => speakEn(w.en, true);
  setRing(1, ok ? 'ok' : 'bad');
  $('#tMic').innerHTML = ok ? ICON.check : ICON.cross;
  $('#tSec').textContent = '0s';
  $('#tStatus').textContent = ok
    ? ({ exact: 'Tuyệt!', near: byVoice ? 'Gần đúng, nghe lại cho chuẩn nhé' : 'Gần đúng, xem lại chính tả nhé', syn: `Đúng nghĩa! Từ cần tìm ở đây là "${w.en}"` })[verdict]
    : (heard ? 'Chưa đúng rồi' : 'Hết giờ');
  const what = byVoice ? 'Máy nghe' : 'Bạn gõ';
  $('#tHeard').innerHTML = heard ? `${what}: <b>${esc(heard)}</b> · Đáp án: <b>${esc(w.en)}</b>` : (byVoice ? 'Máy chưa nghe thấy gì' : 'Bạn chưa gõ gì');

  const record = (isOk) => {
    T.results.push({ i: w.i, ok: isOk, near: verdict === 'near', heard, typed: !byVoice });
    saveLive();
    updateTestHeader();
  };

  record(ok);
  $('#tActions').className = 'test-actions single';
  $('#tActions').innerHTML = `<button class="btn" id="tNext">${T.pos + 1 >= T.items.length ? 'Xem kết quả' : 'Từ tiếp theo'}${ICON.next}</button>`;
  $('#tKbd').textContent = 'Phím tắt: Space = tạm dừng/tiếp tục · Enter = từ tiếp theo';
  $('#tNext').onclick = () => { if (!alive()) return; T.pos++; runWord(); };
  await speakEn(w.en);
  if (!alive()) return;
  if (S.autoNext) {
    await sleep(ok ? 900 : 1800);
    if (!alive()) return;
    T.pos++; runWord();
  }
}

function pauseTest() {
  if (!T || T.paused) return;
  T.paused = true; T.token++; Voice.stop(); stopListening(); if (T.cancelTap) T.cancelTap(); clockStop();
  // nếu đã chấm xong từ hiện tại thì khi tiếp tục sẽ sang từ mới
  if (T.results.length > T.pos) T.pos = T.results.length;
  $('#tPause').innerHTML = ICON.play;
  $('#tStatus').textContent = 'Đang tạm dừng';
  setRing(1); $('#tRing').classList.remove('live', 'tap'); $('#tType').classList.add('hidden');
  $('#tActions').className = 'test-actions single';
  $('#tActions').innerHTML = `<button class="btn" id="tResume">${ICON.play}Tiếp tục</button>`;
  $('#tResume').onclick = resumeTest;
  saveLive();
}
function resumeTest() {
  if (!T || !T.paused) return;
  T.paused = false;
  $('#tPause').innerHTML = ICON.pause;
  runWord();
}

function finishTest() {
  T.token++;
  Voice.stop(); stopListening(); if (T.cancelTap) T.cancelTap(); clockStop();
  const run = T.run, lv = LEVELS[T.lv - 1];
  // hết giờ: các từ chưa kịp làm tính là sai và vào lần thi lại
  const answered = new Set(T.results.map((r) => r.i));
  const left = T.items.filter((i) => !answered.has(i));
  const wrong = T.results.filter((r) => !r.ok).map((r) => [r.i, r.heard || '', 0]).concat(left.map((i) => [i, '', 1]));
  const n = T.items.length, c = n - wrong.length;
  const res = { t: Date.now(), n, c, left: left.length, used: Math.round(T.usedMs / 1000), limitSec: Math.round(T.limitMs / 1000) };
  if (T.kind === 'first') run.first = res; else run.rounds.push(res);
  run.pending = wrong.map((x) => x[0]); run.wrong = wrong; run.live = null;
  const d = todayKey(); if (!store.days.includes(d)) store.days.push(d);
  if (store.days.length > 400) store.days.splice(0, store.days.length - 400);
  T = null;
  if (!wrong.length) {
    // hết từ sai: hoàn thành cấp, ghi vào báo cáo tổng hợp, xóa từ sai và bài thi của cấp
    const rep = { id: Date.now(), t: Date.now(), started: run.started, lv: lv.n, name: lv.name, first: { c: run.first.c, n: run.first.n }, retakes: run.rounds.length };
    store.reports.push(rep);
    delete store.runs[lv.n];
    saveStore();
    return go('done', rep.id);
  }
  saveStore();
  go('result', lv.n);
}

const ringSvg = (p) => {
  const len = 2 * Math.PI * 62;
  return `<div class="big-ring">
    <svg viewBox="0 0 150 150"><circle class="ring-bg" cx="75" cy="75" r="62"/><circle class="ring-fg" cx="75" cy="75" r="62" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - p / 100)}" style="stroke:${p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--warn)' : 'var(--bad)'}"/></svg>
    <div class="pct"><div>${p}%<small>đạt</small></div></div>
  </div>`;
};
const firstStats = (c, n) => `<div class="stat-grid">
    <div class="stat ok"><b>${c}/${n}</b><span>Câu đúng</span></div>
    <div class="stat bad"><b>${n - c}/${n}</b><span>Câu sai</span></div>
    <div class="stat"><b>${pct(c, n)}%</b><span>Đạt</span></div>
  </div>`;

/* ---------- Kết quả của lượt thi đang dở: báo cáo lần 1, các lần thi lại, nút thi lại ---------- */
SCREENS.result = (n) => {
  const lv = LEVELS[n - 1]; const run = store.runs[n];
  if (!run) return go('home');
  const F = run.first, L = run.live;
  const last = run.rounds[run.rounds.length - 1];
  const nextRound = run.rounds.length + 1;
  let action;
  if (L) {
    const done = L.results.length, total = L.items.length;
    action = `<div class="notice info" style="margin-top:14px">${ICON.info}<div>Bạn đang thi dở <b>${L.kind === 'first' ? 'lần 1' : `thi lại lần ${L.round}`}</b>: đã làm ${done}/${total} từ.</div></div>
      <button class="btn block" id="rGo" style="margin-top:10px">${ICON.next}Thi tiếp (còn ${total - done} từ)</button>`;
  } else {
    action = `${last ? `<div class="notice ${last.c === last.n ? 'info' : ''}" style="margin-top:14px">${ICON.redo}<div><b>Thi lại lần ${run.rounds.length}:</b> đúng ${last.c}/${last.n}, còn ${last.n - last.c} từ sai${last.left ? ` (có ${last.left} từ hết giờ chưa kịp làm)` : ''}.</div></div>` : ''}
      <button class="btn block" id="rGo" style="margin-top:12px">${ICON.redo}Thi lại ${run.pending.length} từ sai</button>
      <div class="small muted center" style="margin-top:6px">Thi lại lần ${nextRound} · làm bài tối đa ${fmtLimit(testLimitSec(run.pending, useMic()))}</div>`;
  }
  app.innerHTML = `<div>
    ${topbar(`Cấp ${lv.n}`)}
    ${F ? `<div class="card sum-hero">
      <div class="section-title" style="margin:0 0 6px">Báo cáo lần 1</div>
      ${ringSvg(pct(F.c, F.n))}
      <div class="muted small">Cấp ${lv.n} · ${esc(lv.name)} · ${fmtDate(F.t)}</div>
      ${F.left ? `<div class="small" style="margin-top:6px;color:var(--bad);font-weight:600">Hết giờ, ${F.left} từ chưa kịp làm, tính là sai</div>` : ''}
      ${firstStats(F.c, F.n)}
    </div>` : `<div class="card"><div class="level-name">Cấp ${lv.n} · ${esc(lv.name)}</div><div class="level-meta">${lv.size} từ · ${esc(lv.fileRef)}</div></div>`}
    ${action}
    ${!L && run.wrong.length ? `<div class="section-title">${run.wrong.length} từ còn sai</div>
      <div class="word-list">${run.wrong.map(([i, heard, left]) => wordRow(i, { heard, left: !!left, showHeard: true })).join('')}</div>` : ''}
    ${run.rounds.length ? `<div class="section-title">Các lần thi lại</div>
      <div class="word-list">${run.rounds.map((r, k) => `<div class="hist-row"><div class="h-main"><div class="h-title">Thi lại lần ${k + 1}</div><div class="h-sub">${fmtDate(r.t)} · đúng ${r.c}/${r.n} · còn ${r.n - r.c} từ sai</div></div><span class="pill ${grade(pct(r.c, r.n))}">${pct(r.c, r.n)}%</span></div>`).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:18px">
      <button class="btn ghost" id="rHome">Trang chủ</button>
      <button class="btn ghost" id="rReport">${ICON.chart}Báo cáo tổng hợp</button>
    </div>
  </div>`;
  bindBack(app); bindWordRows(app);
  $('#rGo').onclick = () => startRound(n);
  $('#rHome').onclick = () => go('home');
  $('#rReport').onclick = () => go('report');
};

/* ---------- Hoàn thành cấp ---------- */
SCREENS.done = (id) => {
  const r = store.reports.find((x) => x.id === id);
  if (!r) return go('home');
  app.innerHTML = `<div>
    ${topbar('Hoàn thành cấp')}
    <div class="card sum-hero">
      <div style="font-size:46px;line-height:1">🎉</div>
      <h2 class="sum-title" style="margin-top:8px">Hoàn thành cấp ${r.lv}!</h2>
      <div class="muted small">${esc(r.name)} · ${fmtDate(r.t)}</div>
      <div style="margin-top:10px;font-weight:700">${r.retakes ? `Thi lại ${r.retakes} lần thì hết từ sai` : 'Đúng hết ngay lần 1, không phải thi lại'}</div>
      <div class="section-title" style="margin:18px 0 0">Báo cáo lần 1</div>
      ${firstStats(r.first.c, r.first.n)}
    </div>
    <p class="small muted center" style="margin:12px 6px">Đã lưu vào Báo cáo tổng hợp. Danh sách từ sai của cấp này đã làm mới, lần sau bấm vào cấp sẽ thi lại từ đầu.</p>
    <div class="btn-row">
      <button class="btn ghost" id="dHome">Trang chủ</button>
      <button class="btn" id="dReport">${ICON.chart}Báo cáo tổng hợp</button>
    </div>
  </div>`;
  bindBack(app);
  $('#dHome').onclick = () => go('home');
  $('#dReport').onclick = () => go('report');
};

function wordRow(i, { heard = '', showHeard = false, left = false } = {}) {
  const w = W(i);
  return `<div class="word-row">
    <div class="w-main">
      <div class="w-en">${esc(w.en)}<span class="ipa">${esc(w.ipa)}</span></div>
      <div class="w-vi">${esc(w.vi)}</div>
      ${showHeard ? `<div class="w-heard">${left ? '<span class="muted">Hết giờ, chưa kịp làm</span>' : heard ? `Trả lời: <span class="h">${esc(heard)}</span>` : '<span class="muted">Không nghe thấy / hết giờ</span>'}</div>` : ''}
    </div>
    <button class="icon-btn" data-say="${i}" aria-label="Nghe ${esc(w.en)}">${ICON.speaker}</button>
  </div>`;
}
function bindWordRows(root) {
  root.querySelectorAll('[data-say]').forEach((b) => (b.onclick = () => speakEn(W(+b.dataset.say).en)));
}

/* ---------- Báo cáo tổng hợp: chỉ lấy số liệu báo cáo lần 1 và số lần thi lại để hoàn thành cấp ---------- */
SCREENS.report = () => {
  const R = store.reports;
  // xếp theo cấp: mỗi lần hoàn thành cấp ghi kết quả lần 1 (đúng / sai / tổng, đạt %) và số lần thi lại
  const levelBlock = (lv) => {
    const list = R.filter((r) => r.lv === lv.n);
    return `<div class="card" style="margin-bottom:12px">
      <div class="row">${levelBadge(lv)}<div class="grow"><div class="level-name">Cấp ${lv.n} · ${esc(lv.name)}</div>
        <div class="level-meta">${list.length ? `Đã hoàn thành ${list.length} lần` : 'Chưa hoàn thành'}</div></div></div>
      ${list.map((r, k) => { const p = pct(r.first.c, r.first.n); return `
        <div style="margin-top:14px">
          <div class="small" style="font-weight:700">Hoàn thành lần ${k + 1} <span class="muted" style="font-weight:500">· ${fmtDate(r.t)}</span></div>
          <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px">
            <div class="stat ok"><b style="font-size:17px">${r.first.c}/${r.first.n}</b><span>Đúng</span></div>
            <div class="stat bad"><b style="font-size:17px">${r.first.n - r.first.c}/${r.first.n}</b><span>Sai</span></div>
            <div class="stat"><b style="font-size:17px">${p}%</b><span>Đạt</span></div>
            <div class="stat"><b style="font-size:17px">${r.retakes} lần</b><span>Thi lại</span></div>
          </div>
        </div>`; }).join('')}
    </div>`;
  };
  app.innerHTML = `<div>
    ${topbar('Báo cáo tổng hợp')}
    <p class="muted small" style="margin:0 2px 12px">Theo từng cấp: kết quả thi lần 1 (số từ đúng, số từ sai trên tổng số từ, đạt bao nhiêu %) và số lần thi lại để hoàn thành cấp.</p>
    ${LEVELS.map(levelBlock).join('')}

    <div class="section-title">Dữ liệu trên máy này</div>
    <div class="card">
      <p class="small muted" style="margin:0 0 12px">Báo cáo chỉ lưu trong trình duyệt của máy này. Muốn chuyển sang máy khác, hãy xuất file rồi nhập ở máy kia.</p>
      <div class="btn-row">
        <button class="btn ghost sm" id="rExport">${ICON.download}Xuất dữ liệu</button>
        <button class="btn ghost sm" id="rImport">Nhập dữ liệu</button>
      </div>
      <button class="btn ghost sm block" id="rReset" style="margin-top:10px;color:var(--bad)">Xóa toàn bộ dữ liệu</button>
      <input type="file" id="rFile" accept="application/json,.json" hidden>
    </div>
  </div>`;
  bindBack(app);
  $('#rExport').onclick = () => {
    const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-1923-tu-${todayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#rImport').onclick = () => $('#rFile').click();
  $('#rFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.reports) || typeof d.runs !== 'object') throw new Error('bad');
      if (!confirm('Thay dữ liệu hiện tại bằng dữ liệu trong file?')) return;
      store.reports = d.reports; store.runs = d.runs || {}; store.days = d.days || []; Object.assign(S, d.settings || {});
      saveStore(); toast('Đã nhập dữ liệu.'); go('report');
    } catch (err) { toast('File không đúng định dạng.'); }
  };
  $('#rReset').onclick = () => {
    if (!confirm('Xóa toàn bộ báo cáo và bài đang thi dở trên máy này? Không hoàn tác được.')) return;
    store.reports = []; store.runs = {}; store.days = []; saveStore(); toast('Đã xóa dữ liệu.'); go('report');
  };
};

/* ---------- Cài đặt ---------- */
SCREENS.settings = () => {
  const vVi = Voice.pick('vi-VN'), vEn = Voice.pick(S.accent);
  app.innerHTML = `<div>
    ${topbar('Cài đặt')}
    <div class="card"><div class="toggles">
      <div class="toggle-row">
        <div class="t-main"><div class="t-title">Thời gian nói mỗi từ</div><div class="t-sub">Mặc định 3 giây cho mọi từ. Gõ phím thì tự tính theo độ dài từ.</div></div>
        <div class="seg" data-set="seconds">${[3, 5, 8].map((s) => `<button data-v="${s}" class="${S.seconds === s ? 'on' : ''}">${s}s</button>`).join('')}</div>
      </div>
      <div class="toggle-row">
        <div class="t-main"><div class="t-title">Giọng tiếng Anh</div><div class="t-sub">Dùng cho cả phát âm và nhận giọng nói</div></div>
        <div class="seg" data-set="accent"><button data-v="en-US" class="${S.accent === 'en-US' ? 'on' : ''}">Mỹ</button><button data-v="en-GB" class="${S.accent === 'en-GB' ? 'on' : ''}">Anh</button></div>
      </div>
      <div class="toggle-row">
        <div class="t-main"><div class="t-title">Tự sang từ tiếp theo</div><div class="t-sub">Tắt nếu muốn tự bấm sau mỗi từ</div></div>
        <label class="switch"><input type="checkbox" data-set="autoNext" ${S.autoNext ? 'checked' : ''}><span></span></label>
      </div>
    </div></div>
    <div class="section-title">Cách làm bài</div>
    <div class="card">${quickToggles()}</div>
    <div class="section-title">Kiểm tra máy</div>
    <div class="card">
      <div class="status-list">${deviceStatus(vVi, vEn)}</div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn ghost sm" id="sTestVoice">${ICON.speaker}Thử loa</button>
        <button class="btn ghost sm" id="sTestMic">${ICON.mic}Thử mic</button>
      </div>
      <div class="small center" id="sMicOut" style="margin-top:10px;min-height:22px"></div>
    </div>
    <div class="center" style="margin-top:18px"><button class="link-btn" id="sHelp">Hướng dẫn & giới hạn</button></div>
    <p class="small muted center" style="margin-top:6px">Phiên bản ${APP_VERSION}</p>
  </div>`;
  bindBack(app); bindQuickToggles(app);
  $('#sHelp').onclick = () => go('help');
  $('#sTestVoice').onclick = async () => { await Voice.speak('Xin chào, mình là giọng tiếng Việt.', 'vi-VN'); speakEn('Hello! This is the English voice.'); };
  $('#sTestMic').onclick = async () => {
    const out = $('#sMicOut');
    if (!getSR()) { out.textContent = 'Trình duyệt này không có nhận giọng nói.'; return; }
    out.textContent = 'Hãy nói "hello"...';
    const r = await listenFor('hello', 4000, { onHeard: (h) => (out.innerHTML = `Máy nghe: <b>${esc(h)}</b>`) });
    if (!out.isConnected) return;
    if (r.error) out.innerHTML = `<span style="color:var(--bad)">Lỗi mic: ${esc(micErrorText(r.error))}</span>`;
    else if (r.verdict) out.innerHTML = `<span style="color:var(--ok);font-weight:700">Mic hoạt động tốt!</span> Máy nghe: <b>${esc(r.heard)}</b>`;
    else out.innerHTML = r.heard ? `Máy nghe: <b>${esc(r.heard)}</b> (mic chạy được)` : 'Không nghe thấy gì. Kiểm tra lại mic.';
    if (r.error) setTimeout(() => go('settings'), 2500);
  };
};
function micErrorText(e) {
  return ({ 'not-allowed': 'bạn chưa cho phép dùng mic', 'service-not-allowed': 'trình duyệt không cho dùng dịch vụ nhận giọng nói', 'audio-capture': 'không tìm thấy mic', network: 'cần kết nối Internet', unsupported: 'trình duyệt không hỗ trợ', 'language-not-supported': 'máy không hỗ trợ giọng này', 'start-failed': 'không mở được mic' })[e] || e;
}
function deviceStatus(vVi, vEn) {
  const item = (ok, text) => `<div class="status-item ${ok ? 'ok' : 'bad'}">${ok ? ICON.check : ICON.cross}<span>${text}</span></div>`;
  return [
    item(!!getSR(), getSR() ? 'Nhận giọng nói: có' : 'Nhận giọng nói: không có (dùng Chrome/Edge)'),
    item(window.isSecureContext, window.isSecureContext ? 'Kết nối an toàn (HTTPS)' : 'Không phải HTTPS: mic bị chặn'),
    item(!micBlocked, micBlocked ? 'Mic đang bị chặn hoặc không có' : 'Mic: chưa thấy lỗi'),
    item(!!vVi, vVi ? `Giọng tiếng Việt: ${esc(vVi.name)}` : 'Chưa có giọng tiếng Việt trên máy'),
    item(!!vEn, vEn ? `Giọng tiếng Anh: ${esc(vEn.name)}` : 'Chưa có giọng tiếng Anh trên máy'),
  ].join('');
}

/* ---------- Hướng dẫn ---------- */
SCREENS.help = () => {
  app.innerHTML = `<div>
    ${topbar('Hướng dẫn')}
    <div class="card help">
      <h3 style="margin-top:0">Cách học</h3>
      <ul>
        <li>1.923 từ chia thành <b>8 cấp</b>. Cấp 1 Nền tảng (271 từ, bài 1-27), cấp 2 Đời sống (273 từ, bài 28-54). Cấp 3, 4, 5 là Thông dụng, mỗi cấp 240 từ trộn lẫn từ bài 55-126. Cấp 6, 7, 8 là Mở rộng (220, 220, 219 từ) trộn lẫn từ bài 127-192.</li>
        <li>Bấm vào cấp là vào thi luôn, một lượt hết cả cấp. Thời gian làm bài tối đa = số từ × ${S.seconds} giây (vd 240 từ = 12 phút). Đồng hồ chỉ chạy lúc bạn trả lời (chờ bấm mic, nói, gõ), không tính lúc máy đọc nghĩa và phát âm. Hết giờ thì từ chưa kịp làm tính là sai.</li>
        <li>Máy hiện và đọc nghĩa tiếng Việt. Bấm nút mic, bạn có <b>${S.seconds} giây</b> để nói từ tiếng Anh, từ nào cũng vậy. Quá giờ tính là sai. Máy tự chấm. Không có mic thì gõ từ, thời gian theo độ dài: 3 giây + 0,5 giây mỗi chữ cái (go 4 giây, family 6 giây, beautiful 8 giây).</li>
        <li>Sau mỗi từ, máy đọc phát âm chuẩn và cho xem máy đã nghe được gì.</li>
        <li>Thi xong lần đầu có <b>Báo cáo lần 1</b>: số câu đúng, số câu sai trên tổng số câu và đạt bao nhiêu %, kèm danh sách từ sai.</li>
        <li>Bấm <b>Thi lại</b> để thi những từ còn sai. Lần nào còn sai thì thi lại tiếp, tới khi không còn từ sai là <b>hoàn thành cấp</b>. Đang thi mà tắt app thì mở lại bấm vào cấp sẽ thi tiếp chỗ đang dở.</li>
        <li>Hoàn thành cấp thì kết quả lần 1 và số lần thi lại được ghi vào <b>Báo cáo tổng hợp</b>. Danh sách từ sai của cấp được làm mới, lần sau thi lại từ đầu.</li>
      </ul>
      <h3>Trình duyệt nên dùng</h3>
      <ul>
        <li><b>Chrome</b> hoặc <b>Edge</b> trên Android, Windows, Mac: chạy tốt nhất.</li>
        <li><b>Safari trên iPhone/iPad</b>: nhận giọng nói còn hạn chế, có lúc không nghe. Khi đó chọn trả lời bằng <b>Gõ phím</b>.</li>
        <li>Firefox: chưa có nhận giọng nói, chỉ trả lời bằng gõ phím được.</li>
        <li>Mic chỉ hoạt động khi trang mở qua <b>https://</b>. Nhận giọng nói của Chrome cần <b>Internet</b>.</li>
        <li>Lần đầu, trình duyệt sẽ hỏi quyền dùng Micro: chọn <b>Cho phép</b>.</li>
      </ul>
      <h3>Máy chấm thế nào?</h3>
      <ul>
        <li>Không phân biệt hoa/thường, bỏ qua dấu câu.</li>
        <li>Chấp nhận từ đồng âm máy hay nhầm (to/two/too, right/write, four/4...).</li>
        <li>Có 21 cặp từ trùng nghĩa (vd "nói" = say/speak). Nói từ còn lại cũng tính đúng, máy sẽ chỉ ra từ cần tìm.</li>
        <li>Từ dài nghe lệch 1-2 chữ cái, hoặc thêm/bớt "s", "ed" được tính <b>Gần đúng</b> (vẫn tính đúng) và bạn nên nghe lại cho chuẩn.</li>
      </ul>
      <h3>Cài lên điện thoại</h3>
      <ul>
        <li>Android (Chrome): bấm menu ⋮ rồi chọn <b>Cài đặt ứng dụng</b> / <b>Thêm vào màn hình chính</b>.</li>
        <li>iPhone (Safari): bấm nút <b>Chia sẻ</b> rồi <b>Thêm vào MH chính</b>.</li>
      </ul>
      <h3>Dữ liệu</h3>
      <p>Tiến độ lưu ngay trên máy bạn, không gửi đi đâu. Đổi máy thì vào Báo cáo tổng hợp, xuất dữ liệu rồi nhập ở máy mới.</p>
    </div>
  </div>`;
  bindBack(app);
};

/* =========================================================
   PWA: cài lên máy + chạy offline
   ========================================================= */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredInstall = e;
  const b = $('#btnInstall'); if (b) { b.hidden = false; b.onclick = doInstall; }
});
async function doInstall() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch (e) { /* bỏ qua */ }
  deferredInstall = null; const b = $('#btnInstall'); if (b) b.hidden = true;
}
if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  window.addEventListener('load', () => { navigator.serviceWorker?.register('sw.js').catch(() => { /* chạy được không cần SW */ }); });
}

go('home');
