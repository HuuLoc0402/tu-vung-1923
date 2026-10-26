'use strict';

/* =========================================================
   1923 Từ - luyện nói từ vựng tiếng Anh
   Dữ liệu: words.js (WORDS = [en, ipa, vi, ví dụ, dịch ví dụ, nhóm gốc, bài])
   Lưu tiến độ trong localStorage của từng máy.
   ========================================================= */

const APP_VERSION = '1.4.0';
const STORE_KEY = 'tu1923:v1';
const LESSONS_PER_CHUNK = 5; // mỗi chặng gom khoảng 5 bài (~50 từ) của file gốc
const SEC_PER_WORD = 7; // ước lượng thời gian một từ trong bài test
const LEVEL_TEST_MIN = 25; // bài kiểm tra cả cấp giới hạn 25 phút
// Mô tả lấy từ sheet "Hướng dẫn" của file gốc; cấp 3 và cấp 4 trong file có 2 phần, mỗi phần là một cấp ở app
const LEVEL_DESC = [
  'Từ chức năng và từ cốt lõi nhất (the, have, go, family...)',
  'Đồ vật, món ăn, thời gian, tính từ và động từ hằng ngày',
  'Từ hay gặp trong công việc, tin tức, giao tiếp (phần 1)',
  'Từ hay gặp trong công việc, tin tức, giao tiếp (phần 2)',
  'Từ đời thường và công việc nâng cao hơn (phần 1)',
  'Từ đời thường và công việc nâng cao hơn (phần 2)',
];
const LEVEL_FILE_REF = ['Cấp 1', 'Cấp 2', 'Cấp 3, phần 1', 'Cấp 3, phần 2', 'Cấp 4, phần 1', 'Cấp 4, phần 2'];
const LEVEL_COLORS = [
  ['#22c1a3', '#1a9e86'], ['#3fa9f5', '#2b7fd4'], ['#7c6ff2', '#5b4fe0'],
  ['#a855f7', '#8b3fe0'], ['#f97316', '#e0590a'], ['#e5484d', '#c22f3b'],
];

const W = (i) => ({ i, en: WORDS[i][0], ipa: WORDS[i][1], vi: WORDS[i][2], ex: WORDS[i][3], exVi: WORDS[i][4], src: WORD_SOURCES[WORDS[i][5]] });

/* Chia cấp và bài đúng như file gốc: 6 phần (271 / 273 / 360 / 360 / 330 / 329 từ), 192 bài.
   Mỗi cấp chia thêm thành các chặng, mỗi chặng gồm trọn vài bài liền nhau. */
const LEVELS = WORD_SOURCES.map((name, k) => {
  const idx = [];
  WORDS.forEach((w, i) => { if (w[5] === k) idx.push(i); });
  const start = idx[0], end = idx[idx.length - 1] + 1;
  const lessons = [];
  for (const i of idx) {
    const l = WORDS[i][6];
    if (!lessons.length || lessons[lessons.length - 1].n !== l) lessons.push({ n: l, start: i, end: i + 1 });
    else lessons[lessons.length - 1].end = i + 1;
  }
  const nc = Math.max(1, Math.round(lessons.length / LESSONS_PER_CHUNK));
  const chunks = Array.from({ length: nc }, (_, c) => {
    const ls = lessons.slice(Math.round(c * lessons.length / nc), Math.round((c + 1) * lessons.length / nc));
    return { n: c + 1, start: ls[0].start, end: ls[ls.length - 1].end, lessonFrom: ls[0].n, lessonTo: ls[ls.length - 1].n };
  });
  return {
    n: k + 1, name, desc: LEVEL_DESC[k] || '', fileRef: LEVEL_FILE_REF[k] || '', color: LEVEL_COLORS[k % LEVEL_COLORS.length], start, end, size: end - start,
    lessonFrom: lessons[0].n, lessonTo: lessons[lessons.length - 1].n, chunks,
  };
});
const range = (s, e) => Array.from({ length: e - s }, (_, k) => s + k);

/* ---------------- lưu trữ ---------------- */
const DEFAULT_SETTINGS = {
  seconds: 3, accent: 'en-US', rate: 0.95, readVi: true, hint: true, mode: 'voice', autoNext: true, pushToTalk: true, byLength: true,
};
const store = loadStore();
function loadStore() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = {};
  const history = Array.isArray(data.history) ? data.history : [];
  // bản cũ chia 7 cấp (chưa có ver) hoặc 4 cấp (ver 2): giữ lịch sử và tiến độ từng từ, chỉ bỏ gắn cấp/chặng không còn đúng
  const keepLevel = (h) => data.ver === 2 && (h.lv === 1 || h.lv === 2);
  if (data.ver !== 3) {
    for (const h of history) {
      if (!h.lv || keepLevel(h)) continue;
      h.title = (h.title || '') + ' (cách chia cũ)'; h.lv = 0; h.chunk = 0;
      if (h.kind === 'level' || h.kind === 'chunk') h.kind = 'old';
    }
  }
  return {
    ver: 3,
    history,
    stats: data.stats && typeof data.stats === 'object' ? data.stats : {},
    settings: Object.assign({}, DEFAULT_SETTINGS, data.settings || {}),
    days: Array.isArray(data.days) ? data.days : [],
  };
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { toast('Không lưu được dữ liệu trên máy này (bộ nhớ trình duyệt bị chặn).'); }
}
const S = store.settings;
if (S.mode !== 'type') S.mode = 'voice';
const stat = (i) => store.stats[i] || { r: 0, w: 0, s: 0 };
const isMastered = (i) => stat(i).s >= 2;
function recordWord(i, ok, heard) {
  const st = Object.assign({ r: 0, w: 0, s: 0 }, store.stats[i]);
  if (ok) { st.r++; st.s++; } else { st.w++; st.s = 0; if (heard) st.h = heard.slice(0, 40); }
  st.t = Date.now();
  store.stats[i] = st;
}
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
const estMin = (n) => Math.max(1, Math.round(n * SEC_PER_WORD / 60));
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
function levelStats(lv) {
  let mastered = 0; for (let i = lv.start; i < lv.end; i++) if (isMastered(i)) mastered++;
  const tests = store.history.filter((h) => h.lv === lv.n);
  const full = tests.filter((h) => h.kind === 'level');
  const best = tests.length ? Math.max(...tests.map((h) => pct(h.c, h.n))) : null;
  const last = tests.length ? pct(tests[tests.length - 1].c, tests[tests.length - 1].n) : null;
  return { mastered, tests: tests.length, best, last, fullBest: full.length ? Math.max(...full.map((h) => pct(h.c, h.n))) : null };
}
function weakWords(limit = 30) {
  return Object.entries(store.stats)
    .map(([i, s]) => ({ i: +i, ...s }))
    .filter((s) => s.w > 0 && s.s < 2)
    .sort((a, b) => (b.w - b.r * 0.5) - (a.w - a.r * 0.5) || b.w - a.w || (b.t || 0) - (a.t || 0))
    .slice(0, limit);
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
/* Thời gian trả lời theo độ dài từ: từ ngắn (tới 5 chữ cái) dùng thời gian gốc, 6-8 chữ thêm 1 giây, từ 9 chữ trở lên thêm 2 giây */
const answerSeconds = (en) => S.seconds + (S.byLength ? (en.length >= 6 ? 1 : 0) + (en.length >= 9 ? 1 : 0) : 0);
/* Gõ phím: tối thiểu 8 giây, từ dài được thêm thời gian */
const typeSeconds = (en) => Math.max(8, Math.round(5 + en.length * 0.7));

/* =========================================================
   Các màn hình
   ========================================================= */
const SCREENS = {};

/* ---------- Trang chủ ---------- */
SCREENS.home = () => {
  const total = store.history.length;
  let mastered = 0; for (const k in store.stats) if (store.stats[k].s >= 2) mastered++;
  const weak = weakWords(200).length;
  const notice = supportNotice();
  app.innerHTML = `<div>
    <div class="topbar">
      <div class="brand"><div class="brand-logo">1923</div><span>1923 Từ</span></div>
      <button class="icon-btn" id="btnInstall" aria-label="Cài lên máy" title="Cài lên máy" hidden>${ICON.download}</button>
      <button class="icon-btn" id="btnReport" aria-label="Báo cáo" title="Báo cáo">${ICON.chart}</button>
      <button class="icon-btn" id="btnSettings" aria-label="Cài đặt" title="Cài đặt">${ICON.gear}</button>
    </div>
    <div class="hero">
      <h2>${total ? 'Chào bạn, học tiếp nào!' : 'Chào bạn 👋'}</h2>
      <p>Nhìn nghĩa tiếng Việt, nói từ tiếng Anh trong ${S.seconds}-${S.seconds + (S.byLength ? 2 : 0)} giây. Sai thì nghe lại và ôn ngay.</p>
      <div class="hero-stats">
        <div class="hero-stat"><b>${mastered}</b><span>từ đã thuộc</span></div>
        <div class="hero-stat"><b>${streakDays()}</b><span>ngày liên tiếp</span></div>
        <div class="hero-stat"><b>${total}</b><span>bài đã làm</span></div>
      </div>
    </div>
    ${notice ? `<div style="margin-top:14px">${notice}</div>` : ''}
    <div class="section-title">6 cấp độ · 1.923 từ · 192 bài</div>
    <div class="level-grid">
      ${LEVELS.map((lv) => {
        const st = levelStats(lv);
        return `<button class="level-card" data-level="${lv.n}">
          ${levelBadge(lv)}
          <div class="level-info">
            <div class="level-name">Cấp ${lv.n} · ${lv.name.split(' · ')[0]}</div>
            <div class="level-meta">${lv.name.includes(' · ') ? lv.name.split(' · ')[1] + ' · ' : ''}Bài ${lv.lessonFrom}-${lv.lessonTo}</div>
            <div class="bar"><i style="width:${pct(st.mastered, lv.size)}%"></i></div>
          </div>
          <div class="level-score"><b>${st.mastered}</b><span>/${lv.size} thuộc</span></div>
        </button>`;
      }).join('')}
      <button class="level-card review" id="btnWeak">
        <div class="level-badge">${ICON.redo.replace('<svg', '<svg style="width:26px;height:26px"')}</div>
        <div class="level-info">
          <div class="level-name">Ôn từ hay sai</div>
          <div class="level-meta">${weak ? `${weak} từ đang cần ôn` : 'Chưa có từ nào sai. Làm bài để bắt đầu.'}</div>
        </div>
        ${ICON.chev}
      </button>
    </div>
    <div class="footer-links">
      <button class="link-btn" id="btnHelp">Hướng dẫn & giới hạn</button>
      <button class="link-btn" id="btnAll">Tra cả 1.923 từ</button>
    </div>
  </div>`;
  app.querySelectorAll('[data-level]').forEach((b) => (b.onclick = () => go('level', +b.dataset.level)));
  $('#btnReport').onclick = () => go('report');
  $('#btnSettings').onclick = () => go('settings');
  $('#btnHelp').onclick = () => go('help');
  $('#btnAll').onclick = () => go('words', 0);
  $('#btnWeak').onclick = () => go('weak');
  const ib = $('#btnInstall');
  if (deferredInstall) { ib.hidden = false; ib.onclick = doInstall; }
};

/* ---------- Màn cấp độ ---------- */
SCREENS.level = (n) => {
  const lv = LEVELS[n - 1];
  const st = levelStats(lv);
  const hist = store.history.filter((h) => h.lv === lv.n);
  const chunkScore = (c) => {
    const t = hist.filter((h) => h.kind === 'chunk' && h.chunk === c.n);
    return t.length ? Math.max(...t.map((h) => pct(h.c, h.n))) : null;
  };
  const scoreTag = (p) => (p == null ? '<span class="o-score">Chưa làm</span>' : `<span class="o-score ${grade(p)}">${p}%</span>`);
  app.innerHTML = `<div>
    ${topbar(`Cấp ${lv.n}`)}
    <div class="card">
      <div class="level-head">
        ${levelBadge(lv)}
        <div class="grow">
          <div class="level-name" style="font-size:20px;font-weight:800">${lv.name}</div>
          <div class="level-meta">${lv.size} từ · bài ${lv.lessonFrom} tới ${lv.lessonTo} · trong file: ${esc(lv.fileRef)}</div>
          <div class="level-meta">${esc(lv.desc)}</div>
        </div>
      </div>
      <div class="bar" style="margin-top:14px"><i style="width:${pct(st.mastered, lv.size)}%"></i></div>
      <div class="row small muted" style="margin-top:6px;justify-content:space-between">
        <span>Đã thuộc ${st.mastered}/${lv.size} từ</span><span>${st.tests ? `Cao nhất ${st.best}% · ${st.tests} bài` : 'Chưa làm bài nào'}</span>
      </div>
    </div>

    <div class="section-title">Kiểm tra</div>
    <div class="option-list">
      <button class="option featured" id="optFull">
        <div class="o-main"><div class="o-title">Kiểm tra cả cấp</div><div class="o-sub">${lv.size} từ xáo trộn · tối đa ${LEVEL_TEST_MIN} phút${estMin(lv.size) > LEVEL_TEST_MIN ? ` (kịp khoảng ${Math.round(LEVEL_TEST_MIN * 60 / SEC_PER_WORD / 10) * 10} từ, còn lại làm tiếp sau)` : ''}</div></div>
        ${scoreTag(st.fullBest)}
      </button>
      <button class="option" id="optQuick">
        <div class="o-main"><div class="o-title">Kiểm tra nhanh 20 từ</div><div class="o-sub">Bốc ngẫu nhiên trong cấp · khoảng ${estMin(20)} phút</div></div>
        ${ICON.chev}
      </button>
    </div>

    <div class="section-title">Hoặc chia nhỏ thành ${lv.chunks.length} chặng</div>
    <div class="chunk-grid">
      ${lv.chunks.map((c) => `<button class="option" data-chunk="${c.n}">
        <div class="o-main"><div class="o-title">Chặng ${c.n}</div><div class="o-sub">Bài ${c.lessonFrom}-${c.lessonTo} · ${c.end - c.start} từ</div></div>
        ${scoreTag(chunkScore(c))}
      </button>`).join('')}
      <button class="option" id="optList">
        <div class="o-main"><div class="o-title">Xem & học trước</div><div class="o-sub">Danh sách ${lv.size} từ, nghe phát âm</div></div>
        ${ICON.book.replace('<svg', '<svg class="chev" style="opacity:.7"')}
      </button>
    </div>

    <div class="section-title">Cách làm bài</div>
    <div class="card">${quickToggles()}</div>
  </div>`;
  bindBack(app);
  bindQuickToggles(app);
  const label = `Cấp ${lv.n} · ${lv.name}`;
  $('#optFull').onclick = () => startTest({ items: shuffle(range(lv.start, lv.end)), title: label, sub: 'Cả cấp', lv: lv.n, kind: 'level', back: ['level', lv.n] });
  $('#optQuick').onclick = () => startTest({ items: shuffle(range(lv.start, lv.end)).slice(0, 20), title: label, sub: '20 từ ngẫu nhiên', lv: lv.n, kind: 'quick', back: ['level', lv.n] });
  app.querySelectorAll('[data-chunk]').forEach((b) => (b.onclick = () => {
    const c = lv.chunks[+b.dataset.chunk - 1];
    startTest({ items: shuffle(range(c.start, c.end)), title: label, sub: `Chặng ${c.n} · bài ${c.lessonFrom}-${c.lessonTo}`, lv: lv.n, kind: 'chunk', chunk: c.n, back: ['level', lv.n] });
  }));
  $('#optList').onclick = () => go('words', lv.n);
};

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

/* ---------- Màn làm bài ---------- */
let T = null;
async function startTest(opts) {
  if (!opts.items.length) return toast('Không có từ nào để kiểm tra.');
  if (useMic()) {
    const m = await ensureMic();
    if (m === 'denied') toast('Bạn chưa cho phép mic. Bài này làm bằng gõ phím.', 4000);
    else if (m === 'nodevice') toast('Không tìm thấy mic. Bài này làm bằng gõ phím.', 4000);
  }
  const limited = opts.kind === 'level' || opts.kind === 'rest';
  T = Object.assign({ pos: 0, results: [], token: 0, paused: false, startedAt: Date.now(), phase: 'idle', cancelTap: null,
    limitMs: limited ? LEVEL_TEST_MIN * 60000 : 0, usedMs: 0, runFrom: null, timeUp: false }, opts);
  go('test');
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
      ${T.limitMs ? `<span class="chip clock" id="tClockChip" title="Thời gian còn lại">${ICON.clock}<span id="tClock">${fmtClock(T.limitMs)}</span></span>` : ''}
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
    if (!T.results.length) return go(...T.back);
    if (confirm('Dừng bài ở đây? Các từ đã làm vẫn được tính và có tổng kết.')) finishTest();
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
    clockStart();
    clockTimer = setInterval(() => {
      if (!T || screen !== 'test') return;
      const left = clockLeft();
      $('#tClock').textContent = fmtClock(left);
      $('#tClockChip').classList.toggle('low', left <= 60000);
      if (left <= 0 && !T.timeUp) { T.timeUp = true; toast(`Hết ${LEVEL_TEST_MIN} phút!`); finishTest(); }
    }, 500);
  }
  cleanup = () => { clearInterval(clockTimer); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); T && (T.token++); };
  runWord();
};

/* Đồng hồ cả bài: chỉ chạy khi đang làm, tạm dừng thì dừng */
function clockLeft() { return T.limitMs - T.usedMs - (T.runFrom != null ? performance.now() - T.runFrom : 0); }
function clockStart() { if (T.limitMs && T.runFrom == null) T.runFrom = performance.now(); }
function clockStop() { if (T.runFrom != null) { T.usedMs += performance.now() - T.runFrom; T.runFrom = null; } }

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
      const start = () => {
        $('#tMic').onclick = null;
        $('#tRing').classList.remove('tap');
        $('#tStatus').textContent = 'Đang mở mic...';
        listenFor(w.en, secs * 1000, {
          onStart: (ms) => { if (!alive()) return; $('#tStatus').textContent = `Nói từ tiếng Anh! (${secs} giây)`; $('#tRing').classList.add('live'); animateRing(ms); },
          onSound: () => { if (alive() && !$('#tHeard').textContent) $('#tHeard').innerHTML = '<span class="muted">Đang nghe...</span>'; },
          onHeard: (h) => { if (alive()) $('#tHeard').innerHTML = `Máy nghe: <b>${esc(h)}</b>`; },
        }).then(resolve);
      };
      T.cancelTap = () => resolve({ verdict: null, heard: '', error: 'cancel' });
      if (S.pushToTalk) {
        $('#tStatus').textContent = `Bấm nút mic rồi nói (${secs} giây)`;
        $('#tRing').classList.add('tap');
        $('#tMic').onclick = start;
      } else start();
    });
    T.cancelTap = null;
    if (!alive()) return;
    if (res.error && !['no-start', 'no-speech', 'aborted', 'cancel'].includes(res.error)) {
      toast('Mic lỗi: ' + micErrorText(res.error) + (micBlocked ? '. Chuyển sang gõ phím.' : ''), 4000);
      if (micBlocked || res.error === 'unsupported') byVoice = false;
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
    const typed = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(inp.value), ms);
      box.onsubmit = (e) => { e.preventDefault(); clearTimeout(t); resolve(inp.value); };
      T.cancelTap = () => { clearTimeout(t); resolve(null); };
    });
    T.cancelTap = null;
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
    recordWord(w.i, isOk, heard);
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
}
function resumeTest() {
  if (!T || !T.paused) return;
  T.paused = false;
  clockStart();
  $('#tPause').innerHTML = ICON.pause;
  runWord();
}

function finishTest() {
  T.token++;
  Voice.stop(); stopListening(); if (T.cancelTap) T.cancelTap(); clockStop();
  const n = T.results.length;
  if (!n) return go(...T.back);
  const c = T.results.filter((r) => r.ok).length;
  const rec = {
    id: Date.now(), t: Date.now(), dur: Math.round((Date.now() - T.startedAt) / 1000),
    lv: T.lv || 0, kind: T.kind, chunk: T.chunk || 0, title: T.title, sub: T.sub,
    n, c, total: T.items.length, typed: T.results.some((r) => r.typed),
    wrong: T.results.filter((r) => !r.ok).map((r) => [r.i, r.heard || '']),
    timeUp: !!T.timeUp, limitMin: T.limitMs ? LEVEL_TEST_MIN : 0,
    left: n < T.items.length ? T.items.slice(n) : [],
  };
  store.history.push(rec);
  if (store.history.length > 400) store.history.splice(0, store.history.length - 400);
  const d = todayKey(); if (!store.days.includes(d)) store.days.push(d);
  if (store.days.length > 400) store.days.splice(0, store.days.length - 400);
  saveStore();
  const back = T.back;
  T = null;
  go('summary', rec.id, back);
}

/* ---------- Màn tổng kết ---------- */
SCREENS.summary = (id, back = ['home']) => {
  const h = store.history.find((x) => x.id === id);
  if (!h) return go('home');
  const p = pct(h.c, h.n);
  const len = 2 * Math.PI * 62;
  const prev = store.history.filter((x) => x.id !== id && x.t < h.t && x.lv === h.lv && x.kind === h.kind && x.chunk === h.chunk && x.title === h.title).pop();
  const diff = prev ? p - pct(prev.c, prev.n) : null;
  const msg = p >= 90 ? 'Xuất sắc!' : p >= 75 ? 'Rất tốt!' : p >= 50 ? 'Khá ổn, cố thêm chút nữa!' : 'Cần ôn thêm, bạn làm được!';
  const wrongIdx = h.wrong.map((x) => x[0]);
  app.innerHTML = `<div>
    ${topbar('Kết quả')}
    <div class="card sum-hero">
      <div class="big-ring">
        <svg viewBox="0 0 150 150"><circle class="ring-bg" cx="75" cy="75" r="62"/><circle class="ring-fg" cx="75" cy="75" r="62" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - p / 100)}" style="stroke:${p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--warn)' : 'var(--bad)'}"/></svg>
        <div class="pct"><div>${p}%<small>đúng</small></div></div>
      </div>
      <h2 class="sum-title">${msg}</h2>
      <div class="muted small">${esc(h.title)} · ${esc(h.sub)}${h.n < h.total ? ` · dừng ở ${h.n}/${h.total}` : ''}${h.typed ? ' · có gõ phím' : ''}</div>
      ${diff != null ? `<div class="small" style="margin-top:6px;font-weight:700;color:${diff >= 0 ? 'var(--ok)' : 'var(--bad)'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}% so với lần trước (${pct(prev.c, prev.n)}%)</div>` : ''}
      <div class="stat-grid">
        <div class="stat ok"><b>${h.c}</b><span>Đúng · ${p}%</span></div>
        <div class="stat bad"><b>${h.n - h.c}</b><span>Sai · ${100 - p}%</span></div>
        <div class="stat"><b>${fmtDur(h.dur)}</b><span>Thời gian</span></div>
      </div>
    </div>
    ${h.left && h.left.length ? `
      <div class="notice ${h.timeUp ? '' : 'info'}" style="margin-top:14px">${h.timeUp ? ICON.clock : ICON.info}<div>${h.timeUp
        ? `<b>Hết ${h.limitMin} phút.</b> Bạn làm được ${h.n}/${h.total} từ, còn ${h.left.length} từ chưa kịp làm (không tính vào điểm).`
        : `Bạn dừng ở ${h.n}/${h.total} từ, còn ${h.left.length} từ chưa làm.`}</div></div>
      <button class="btn block" id="sRest" style="margin-top:10px">${ICON.next}Làm tiếp ${h.left.length} từ còn lại</button>` : ''}
    ${wrongIdx.length ? `
      <div class="btn-row" style="margin-top:14px">
        <button class="btn secondary" id="sStudy">${ICON.book}Học lại từ sai</button>
        <button class="btn" id="sRetest">${ICON.redo}Kiểm tra lại</button>
      </div>
      <div class="section-title">${wrongIdx.length} từ sai</div>
      <div class="word-list">${h.wrong.map(([i, heard]) => wordRow(i, { heard, showHeard: true })).join('')}</div>`
    : `<div class="notice info" style="margin-top:14px">${ICON.check}<div>Không sai từ nào. Thử chặng tiếp theo hoặc cả cấp nhé!</div></div>`}
    <div class="btn-row" style="margin-top:18px">
      <button class="btn ghost" id="sHome">Trang chủ</button>
      <button class="btn ghost" id="sReport">${ICON.chart}Báo cáo</button>
    </div>
  </div>`;
  bindBack(app, () => go(...back));
  bindWordRows(app);
  $('#sHome').onclick = () => go('home');
  $('#sReport').onclick = () => go('report');
  if ($('#sRest')) $('#sRest').onclick = () => startTest({ items: h.left, title: h.title, sub: 'Phần còn lại', lv: h.lv, kind: 'rest', back: ['summary', id, back] });
  if (wrongIdx.length) {
    $('#sStudy').onclick = () => go('study', wrongIdx, { title: 'Học lại từ sai', back: ['summary', id, back], retest: { title: h.title, lv: h.lv } });
    $('#sRetest').onclick = () => startTest({ items: shuffle(wrongIdx), title: h.title, sub: 'Kiểm tra lại từ sai', lv: h.lv, kind: 'retry', back: ['summary', id, back] });
  }
};

function wordRow(i, { heard = '', showHeard = false, count = null } = {}) {
  const w = W(i); const st = stat(i);
  const dotCls = isMastered(i) ? 'ok' : st.w > 0 && st.s === 0 ? 'bad' : '';
  return `<div class="word-row">
    <span class="dot ${dotCls}" title="${isMastered(i) ? 'Đã thuộc' : st.w ? 'Đang sai' : 'Chưa học'}"></span>
    <div class="w-main">
      <div class="w-en">${esc(w.en)}<span class="ipa">${esc(w.ipa)}</span></div>
      <div class="w-vi">${esc(w.vi)}</div>
      ${showHeard ? `<div class="w-heard">${heard ? `Máy nghe: <span class="h">${esc(heard)}</span>` : '<span class="muted">Không nghe thấy / hết giờ</span>'}</div>` : ''}
    </div>
    ${count != null ? `<span class="w-count">sai ${count} lần</span>` : ''}
    <button class="icon-btn" data-say="${i}" aria-label="Nghe ${esc(w.en)}">${ICON.speaker}</button>
  </div>`;
}
function bindWordRows(root) {
  root.querySelectorAll('[data-say]').forEach((b) => (b.onclick = () => speakEn(W(+b.dataset.say).en)));
}

/* ---------- Học lại (thẻ từ + luyện phát âm) ---------- */
SCREENS.study = (items, opts = {}) => {
  let k = 0; let busy = false;
  const render = () => {
    const w = W(items[k]);
    const exEsc = esc(w.ex).replace(new RegExp(`\\b(${w.en.replace(/[^a-z]/gi, '')}\\w*)`, 'i'), '<mark>$1</mark>');
    const canMic = !!getSR() && window.isSecureContext && !micBlocked;
    app.innerHTML = `<div>
      ${topbar(esc(opts.title || 'Học từ'))}
      <div class="card flash">
        <div class="en">${esc(w.en)}</div>
        <div class="ipa">${esc(w.ipa)}</div>
        <div class="vi">${esc(w.vi)}</div>
        <div class="example">${exEsc}<span class="vi" style="font-size:14px;font-weight:400;margin:2px 0 0;color:var(--muted)">${esc(w.exVi)}</span></div>
        <div class="speak-btns" style="margin-top:16px">
          <button class="btn sm secondary" id="fHear">${ICON.speaker}Nghe</button>
          <button class="btn sm ghost" id="fSlow">${ICON.slow}Nghe chậm</button>
          ${canMic ? `<button class="btn sm" id="fSay">${ICON.mic}Thử nói</button>` : ''}
        </div>
        <div class="practice-out" id="fOut">${canMic ? '<span class="muted small">Bấm "Thử nói" rồi đọc to từ này. Máy sẽ cho biết nó nghe được gì.</span>' : '<span class="muted small">Nghe rồi đọc to theo 3 lần.</span>'}</div>
      </div>
      <div class="nav-row">
        <button class="btn ghost" id="fPrev" ${k === 0 ? 'disabled' : ''}>${ICON.prev}Trước</button>
        <div class="count">${k + 1}/${items.length}</div>
        ${k < items.length - 1 ? `<button class="btn ghost" id="fNext">Sau${ICON.next}</button>` : `<button class="btn" id="fDone">Kiểm tra${ICON.next}</button>`}
      </div>
    </div>`;
    bindBack(app, () => go(...(opts.back || ['home'])));
    $('#fHear').onclick = () => speakEn(w.en);
    $('#fSlow').onclick = () => speakEn(w.en, true);
    $('#fPrev').onclick = () => { if (k > 0) { k--; render(); } };
    if ($('#fNext')) $('#fNext').onclick = () => { k++; render(); };
    if ($('#fDone')) $('#fDone').onclick = () => startTest({
      items: shuffle(items), title: opts.retest?.title || 'Ôn từ', sub: 'Kiểm tra lại sau khi học', lv: opts.retest?.lv || 0, kind: 'retry', back: opts.back || ['home'],
    });
    const say = $('#fSay');
    if (say) say.onclick = async () => {
      if (busy) return; busy = true; Voice.stop();
      say.disabled = true; say.innerHTML = `${ICON.mic}Đang nghe...`;
      $('#fOut').innerHTML = '<span class="muted">Nói đi bạn...</span>';
      const res = await listenFor(w.en, 4000, { onHeard: (h) => { const o = $('#fOut'); if (o) o.innerHTML = `Máy nghe: <b>${esc(h)}</b>`; } });
      busy = false;
      if (!$('#fOut') || screen !== 'study') return;
      say.disabled = false; say.innerHTML = `${ICON.mic}Thử lại`;
      if (res.error && micBlocked) { $('#fOut').innerHTML = '<span style="color:var(--bad)">Không dùng được mic trên máy này.</span>'; return; }
      if (res.verdict) {
        recordWord(w.i, true, ''); saveStore();
        $('#fOut').innerHTML = `<span class="verdict ${res.verdict === 'exact' ? 'ok' : 'near'}">${ICON.check}${res.verdict === 'exact' ? 'Chuẩn rồi!' : VERDICT_TEXT[res.verdict]}</span><div>Máy nghe: <b>${esc(res.heard)}</b></div>`;
      } else {
        $('#fOut').innerHTML = `<span class="verdict bad">${ICON.cross}Chưa khớp</span><div>Máy nghe: <b>${esc(res.heard || '(không nghe thấy)')}</b> · Đúng là: <b>${esc(w.en)}</b></div>`;
        speakEn(w.en, true);
      }
    };
    speakEn(w.en);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') $('#fNext')?.click();
    else if (e.key === 'ArrowLeft') $('#fPrev')?.click();
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);
  render();
};

/* ---------- Ôn từ hay sai ---------- */
SCREENS.weak = () => {
  const list = weakWords(50);
  app.innerHTML = `<div>
    ${topbar('Ôn từ hay sai')}
    ${list.length ? `
      <p class="muted small" style="margin:0 2px 12px">Những từ bạn sai nhiều và chưa nói đúng liên tiếp 2 lần. Nói đúng 2 lần liền là từ đó được tính "đã thuộc".</p>
      <div class="btn-row">
        <button class="btn secondary" id="wStudy">${ICON.book}Học ${Math.min(list.length, 20)} từ</button>
        <button class="btn" id="wTest">${ICON.mic}Kiểm tra ${Math.min(list.length, 20)} từ</button>
      </div>
      <div class="section-title">Danh sách (${list.length})</div>
      <div class="word-list">${list.map((s) => wordRow(s.i, { count: s.w })).join('')}</div>`
    : `<div class="card empty">Chưa có từ nào cần ôn.<br>Làm một bài kiểm tra, từ nào sai sẽ hiện ở đây.</div>`}
  </div>`;
  bindBack(app); bindWordRows(app);
  if (list.length) {
    const top = list.slice(0, 20).map((s) => s.i);
    $('#wStudy').onclick = () => go('study', top, { title: 'Ôn từ hay sai', back: ['weak'], retest: { title: 'Ôn từ hay sai' } });
    $('#wTest').onclick = () => startTest({ items: shuffle(top), title: 'Ôn từ hay sai', sub: `${top.length} từ`, lv: 0, kind: 'weak', back: ['weak'] });
  }
};

/* ---------- Danh sách từ ---------- */
SCREENS.words = (lvN) => {
  const lv = lvN ? LEVELS[lvN - 1] : null;
  const all = lv ? range(lv.start, lv.end) : range(0, WORDS.length);
  app.innerHTML = `<div>
    ${topbar(lv ? `Cấp ${lv.n} · ${lv.size} từ` : 'Tra 1.923 từ', { right: lv ? `<button class="icon-btn" id="lStudy" aria-label="Học dạng thẻ">${ICON.book}</button>` : '' })}
    <input class="search" id="lSearch" type="search" placeholder="Tìm tiếng Anh hoặc tiếng Việt..." autocomplete="off">
    <div class="row small muted" style="margin:10px 4px;gap:14px;flex-wrap:wrap"><span class="row" style="gap:6px"><span class="dot ok"></span>Đã thuộc</span><span class="row" style="gap:6px"><span class="dot bad"></span>Đang sai</span><span class="row" style="gap:6px"><span class="dot"></span>Chưa học</span></div>
    <div class="word-list" id="lList"></div>
    <div class="center" style="margin-top:12px"><button class="btn ghost hidden" id="lMore">Xem thêm</button></div>
  </div>`;
  bindBack(app, () => go(lv ? 'level' : 'home', lv?.n));
  if (lv) $('#lStudy').onclick = () => go('study', all, { title: `Học cấp ${lv.n}`, back: ['words', lv.n], retest: { title: `Cấp ${lv.n} · ${lv.name}`, lv: lv.n } });
  let shown = 60, filtered = all;
  const draw = () => {
    $('#lList').innerHTML = filtered.slice(0, shown).map((i) => wordRow(i)).join('') || '<div class="empty">Không tìm thấy từ nào.</div>';
    $('#lMore').classList.toggle('hidden', filtered.length <= shown);
    bindWordRows($('#lList'));
  };
  const q = $('#lSearch');
  q.oninput = () => {
    const sv = q.value.trim().toLowerCase();
    filtered = !sv ? all : all.filter((i) => WORDS[i][0].toLowerCase().startsWith(sv) || WORDS[i][2].toLowerCase().includes(sv));
    shown = 60; draw();
  };
  $('#lMore').onclick = () => { shown += 120; draw(); };
  draw();
};

/* ---------- Báo cáo ---------- */
SCREENS.report = () => {
  const H = store.history;
  const n = H.length;
  const totalWords = H.reduce((a, h) => a + h.n, 0);
  const totalOk = H.reduce((a, h) => a + h.c, 0);
  const recent = H.slice(-10);
  const avgRecent = recent.length ? Math.round(recent.reduce((a, h) => a + pct(h.c, h.n), 0) / recent.length) : 0;
  let mastered = 0; for (const k in store.stats) if (store.stats[k].s >= 2) mastered++;
  const weak = weakWords(15);
  app.innerHTML = `<div>
    ${topbar('Báo cáo tiến bộ')}
    <div class="tiles">
      <div class="tile"><b>${n}</b><span>bài đã làm</span></div>
      <div class="tile"><b>${pct(totalOk, totalWords)}%</b><span>đúng tất cả</span></div>
      <div class="tile"><b>${avgRecent}%</b><span>đúng 10 bài gần nhất</span></div>
      <div class="tile"><b>${mastered}</b><span>/1.923 từ đã thuộc</span></div>
    </div>

    <div class="section-title">Tiến bộ theo thời gian</div>
    <div class="card chart-card" id="rChart">${n ? '' : '<div class="empty">Làm bài đầu tiên để thấy biểu đồ.</div>'}</div>

    <div class="section-title">Theo cấp độ</div>
    <div class="card"><div class="lv-table">
      ${LEVELS.map((lv) => { const st = levelStats(lv); return `<div class="lv-row">
        ${levelBadge(lv)}
        <div><div class="lv-name">${lv.name}<span>${st.mastered}/${lv.size} thuộc</span></div><div class="bar"><i style="width:${pct(st.mastered, lv.size)}%"></i></div></div>
        <div class="lv-best">${st.best == null ? '<span class="muted">-</span>' : st.best + '%'}</div>
      </div>`; }).join('')}
      <div class="small muted" style="text-align:right">Cột phải: điểm cao nhất của cấp</div>
    </div></div>

    <div class="section-title">Từ hay sai nhất</div>
    ${weak.length ? `<div class="word-list">${weak.map((s) => wordRow(s.i, { count: s.w })).join('')}</div>
      <button class="btn block" id="rWeak" style="margin-top:12px">${ICON.redo}Ôn các từ này</button>`
    : '<div class="card empty">Chưa có dữ liệu.</div>'}

    <div class="section-title">Lịch sử bài làm</div>
    ${n ? `<div class="word-list">${H.slice(-40).reverse().map((h) => { const p = pct(h.c, h.n); return `<button class="hist-row" data-h="${h.id}">
      <div class="h-main"><div class="h-title">${esc(h.title)}</div><div class="h-sub">${esc(h.sub)} · ${fmtDate(h.t)} · ${h.c}/${h.n} đúng</div></div>
      <span class="pill ${grade(p)}">${p}%</span></button>`; }).join('')}</div>`
    : '<div class="card empty">Chưa có bài nào.</div>'}

    <div class="section-title">Dữ liệu trên máy này</div>
    <div class="card">
      <p class="small muted" style="margin:0 0 12px">Tiến độ chỉ lưu trong trình duyệt của máy này. Muốn chuyển sang máy khác, hãy xuất file rồi nhập ở máy kia.</p>
      <div class="btn-row">
        <button class="btn ghost sm" id="rExport">${ICON.download}Xuất dữ liệu</button>
        <button class="btn ghost sm" id="rImport">Nhập dữ liệu</button>
      </div>
      <button class="btn ghost sm block" id="rReset" style="margin-top:10px;color:var(--bad)">Xóa toàn bộ tiến độ</button>
      <input type="file" id="rFile" accept="application/json,.json" hidden>
    </div>
  </div>`;
  bindBack(app); bindWordRows(app);
  if (n) { const box = $('#rChart'); box.innerHTML = progressChart(H.slice(-30), Math.max(260, box.clientWidth - 28)); }
  app.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => go('summary', +b.dataset.h, ['report'])));
  if ($('#rWeak')) $('#rWeak').onclick = () => go('weak');
  $('#rExport').onclick = () => {
    const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `tien-do-1923-tu-${todayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#rImport').onclick = () => $('#rFile').click();
  $('#rFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.history) || typeof d.stats !== 'object') throw new Error('bad');
      if (!confirm('Thay tiến độ hiện tại bằng dữ liệu trong file?')) return;
      store.history = d.history; store.stats = d.stats; store.days = d.days || []; Object.assign(S, d.settings || {});
      saveStore(); toast('Đã nhập dữ liệu.'); go('report');
    } catch (err) { toast('File không đúng định dạng.'); }
  };
  $('#rReset').onclick = () => {
    if (!confirm('Xóa toàn bộ lịch sử và tiến độ trên máy này? Không hoàn tác được.')) return;
    store.history = []; store.stats = {}; store.days = []; saveStore(); toast('Đã xóa tiến độ.'); go('report');
  };
};

function progressChart(H, w = 640) {
  const h = 190, pl = 34, pr = 12, pt = 12, pb = 26;
  const iw = w - pl - pr, ih = h - pt - pb;
  const pts = H.map((x, k) => [pl + (H.length === 1 ? iw / 2 : k * iw / (H.length - 1)), pt + ih * (1 - pct(x.c, x.n) / 100), x]);
  const line = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${pt + ih} L${pts[0][0].toFixed(1)} ${pt + ih} Z` : '';
  const grid = [0, 25, 50, 75, 100].map((v) => { const y = pt + ih * (1 - v / 100); return `<line class="grid" x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}"/><text class="axis" x="${pl - 6}" y="${y + 4}" text-anchor="end">${v}%</text>`; }).join('');
  const first = H[0], last = H[H.length - 1];
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Tỉ lệ đúng của ${H.length} bài gần nhất">
    ${grid}
    ${area ? `<path class="area" d="${area}"/>` : ''}
    <path class="line" d="${line}"/>
    ${pts.map((p) => `<circle class="pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5"><title>${esc(p[2].title)} · ${esc(p[2].sub)}: ${pct(p[2].c, p[2].n)}%</title></circle>`).join('')}
    <text class="axis" x="${pl}" y="${h - 6}">${fmtDate(first.t).split(' ')[0]}</text>
    <text class="axis" x="${w - pr}" y="${h - 6}" text-anchor="end">${fmtDate(last.t).split(' ')[0]}</text>
  </svg><div class="small muted center">Tỉ lệ đúng của ${H.length} bài gần nhất</div>`;
}

/* ---------- Cài đặt ---------- */
SCREENS.settings = () => {
  const vVi = Voice.pick('vi-VN'), vEn = Voice.pick(S.accent);
  app.innerHTML = `<div>
    ${topbar('Cài đặt')}
    <div class="card"><div class="toggles">
      <div class="toggle-row">
        <div class="t-main"><div class="t-title">Thời gian trả lời</div><div class="t-sub">Thời gian cho từ ngắn. Mặc định 3 giây, mới học có thể để 5 giây.</div></div>
        <div class="seg" data-set="seconds">${[3, 5, 8].map((s) => `<button data-v="${s}" class="${S.seconds === s ? 'on' : ''}">${s}s</button>`).join('')}</div>
      </div>
      <div class="toggle-row">
        <div class="t-main"><div class="t-title">Từ dài được thêm giờ</div><div class="t-sub">6-8 chữ cái: +1 giây. Từ 9 chữ cái trở lên: +2 giây.</div></div>
        <label class="switch"><input type="checkbox" data-set="byLength" ${S.byLength ? 'checked' : ''}><span></span></label>
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
    <p class="small muted center" style="margin-top:18px">Phiên bản ${APP_VERSION}</p>
  </div>`;
  bindBack(app); bindQuickToggles(app);
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
        <li>1.923 từ chia đúng như file gốc: <b>6 cấp</b>. Cấp 1 Nền tảng (271 từ), cấp 2 Đời sống (273), cấp 3-4 là Thông dụng phần 1 và phần 2 (360 + 360), cấp 5-6 là Mở rộng phần 1 và phần 2 (330 + 329). Tổng <b>192 bài</b>, mỗi bài khoảng 10 từ.</li>
        <li>Mỗi cấp chia tiếp thành các <b>chặng</b>, mỗi chặng gồm khoảng 5 bài (~50 từ) để làm bài ngắn, hoặc làm <b>cả cấp</b> một lượt, giới hạn <b>${LEVEL_TEST_MIN} phút</b> (cấp 1, 2 khoảng 270 từ vừa đủ thời gian). Hết giờ thì bài dừng, từ chưa kịp làm có thể làm tiếp sau.</li>
        <li>Máy hiện và đọc nghĩa tiếng Việt. Bấm nút mic, bạn có <b>${S.seconds} giây</b> để nói từ tiếng Anh, từ dài được thêm 1-2 giây. Quá giờ tính là sai. Máy tự chấm. Không có mic thì gõ từ (8-14 giây tùy độ dài).</li>
        <li>Sau mỗi từ, máy đọc phát âm chuẩn và cho xem máy đã nghe được gì.</li>
        <li>Hết bài có tổng kết: số từ sai, tỉ lệ đúng, danh sách từ sai để <b>học lại</b> hoặc <b>kiểm tra lại</b>.</li>
        <li>Nói đúng một từ <b>2 lần liên tiếp</b> thì từ đó được tính là <b>đã thuộc</b>.</li>
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
      <p>Tiến độ lưu ngay trên máy bạn, không gửi đi đâu. Đổi máy thì vào Báo cáo, xuất dữ liệu rồi nhập ở máy mới.</p>
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
