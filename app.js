'use strict';
/* Gerador de QR Code v3 */
const $ = id => document.getElementById(id);
const ECC_FRAC = { L: .07, M: .15, Q: .25, H: .30 };
const F0 = { url:'https://exemplo.com.br', wphone:'', wmsg:'', ssid:'', wpass:'', wsec:'WPA', whid:false, vname:'', vorg:'', vphone:'', vmail:'', vurl:'', mto:'', msubj:'', mbody:'', tphone:'', sphone:'', smsg:'', text:'' };
const DEFAULT = { type:'link', f:{ ...F0 }, fg:'#000000', bg:'#FFFFFF', trans:false, gradOn:false, g2:'#2F6FEB', gdir:'diag', shape:'square', eye:'square', eyeSep:false, eyeColor:'#2F6FEB', frame:'none', ftext:'Escaneie aqui', ec:'H', lSz:25, lPad:true, lRound:false, logo:null, logoName:'', logoW:0, logoH:0 };
const ENUM = { type:['link','whats','wifi','vcard','mail','tel','sms','text'], gdir:['diag','h','v','rad'], shape:['square','rounded','dots','bars'], eye:['square','rounded','circle','leaf'], frame:['none','banner','card'] };
let S = clone(DEFAULT), _matrix = null, _content = '', _svgURL = null, editingId = null, LIB = [], RECENT = [];

/* ───── utilidades ───── */
function clone(o) { return JSON.parse(JSON.stringify(o)); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function normHex(h) { h = String(h || '').trim(); if (/^[0-9a-f]{6}$/i.test(h)) h = '#' + h; if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join(''); return /^#[0-9a-f]{6}$/i.test(h) ? h.toUpperCase() : null; }
function lum(hex) { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'qr-code'; }
const uid = () => 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ff = n => +n.toFixed(3);
const svgURI = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function cleanState(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, o = clone(DEFAULT);
  if (ENUM.type.includes(r.type)) o.type = r.type;
  if (r.f && typeof r.f === 'object') Object.keys(F0).forEach(k => { if (k in r.f) o.f[k] = typeof F0[k] === 'boolean' ? !!r.f[k] : String(r.f[k] ?? '').slice(0, 4000); });
  if (!['WPA', 'WEP', 'nopass'].includes(o.f.wsec)) o.f.wsec = 'WPA';
  ['fg', 'bg', 'g2', 'eyeColor'].forEach(k => { o[k] = normHex(r[k]) || DEFAULT[k]; });
  ['trans', 'gradOn', 'eyeSep', 'lRound'].forEach(k => { o[k] = !!r[k]; }); o.lPad = r.lPad === undefined ? true : !!r.lPad;
  ['gdir', 'shape', 'eye', 'frame'].forEach(k => { if (ENUM[k].includes(r[k])) o[k] = r[k]; });
  o.ftext = typeof r.ftext === 'string' ? r.ftext.slice(0, 28) : DEFAULT.ftext;
  o.ec = 'LMQH'.includes(r.ec) && r.ec ? r.ec : 'H'; o.lSz = Math.min(40, Math.max(10, +r.lSz || 25));
  if (typeof r.logo === 'string' && r.logo.startsWith('data:image/')) { o.logo = r.logo; o.logoName = String(r.logoName || '').slice(0, 80); o.logoW = +r.logoW || 0; o.logoH = +r.logoH || 0; }
  return o;
}

/* ───── conteúdo ───── */
const digits = s => String(s || '').replace(/\D/g, '');
function waPhone(p) { let d = digits(p); if (d.length === 10 || d.length === 11) d = '55' + d; return d; }
function contentOf(s) {
  const f = s.f, T = x => String(x).trim();
  switch (s.type) {
    case 'link': { let u = T(f.url); if (!u) return ''; if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && /^\S+\.\S{2,}/.test(u)) u = 'https://' + u; return u; }
    case 'whats': { const p = waPhone(f.wphone); if (!p) return ''; const m = T(f.wmsg); return 'https://wa.me/' + p + (m ? '?text=' + encodeURIComponent(m) : ''); }
    case 'wifi': { if (!T(f.ssid)) return ''; const e = x => String(x).replace(/([\;,:"])/g, '\\$1'), nop = f.wsec === 'nopass'; return `WIFI:T:${nop ? 'nopass' : f.wsec};S:${e(f.ssid)};${nop ? '' : 'P:' + e(f.wpass) + ';'}${f.whid ? 'H:true;' : ''};`; }
    case 'vcard': { if (!T(f.vname) && !T(f.vphone)) return ''; const e = x => String(x).replace(/([\\,;])/g, '\\$1').replace(/\r?\n/g, '\\n'); const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:;${e(T(f.vname))};;;`, `FN:${e(T(f.vname))}`]; if (T(f.vorg)) L.push('ORG:' + e(T(f.vorg))); if (T(f.vphone)) L.push('TEL;TYPE=CELL:' + T(f.vphone)); if (T(f.vmail)) L.push('EMAIL:' + T(f.vmail)); if (T(f.vurl)) L.push('URL:' + T(f.vurl)); L.push('END:VCARD'); return L.join('\n'); }
    case 'mail': { if (!T(f.mto)) return ''; const q = []; if (T(f.msubj)) q.push('subject=' + encodeURIComponent(T(f.msubj))); if (T(f.mbody)) q.push('body=' + encodeURIComponent(T(f.mbody))); return 'mailto:' + T(f.mto) + (q.length ? '?' + q.join('&') : ''); }
    case 'tel': { const p = T(f.tphone).replace(/[^\d+]/g, ''); return p ? 'tel:' + p : ''; }
    case 'sms': { const p = digits(f.sphone); return p ? 'SMSTO:' + p + ':' + T(f.smsg) : ''; }
    default: return T(f.text);
  }
}
const TYPE_NAME = { link:'Link', whats:'WhatsApp', wifi:'Wi-Fi', vcard:'Contato', mail:'E-mail', tel:'Telefone', sms:'SMS', text:'Texto' };

/* ───── geometria: um só desenho em SVG serve para tela, PNG, SVG e impressão ───── */
function rrect(x, y, w, h, r) {
  let [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r]; const m = Math.min(w, h) / 2; a = Math.min(a, m); b = Math.min(b, m); c = Math.min(c, m); d = Math.min(d, m);
  const A = (k, X, Y) => k ? `A${ff(k)} ${ff(k)} 0 0 1 ${ff(X)} ${ff(Y)}` : '';
  return `M${ff(x + a)} ${ff(y)}H${ff(x + w - b)}${A(b, x + w, y + b)}V${ff(y + h - c)}${A(c, x + w - c, y + h)}H${ff(x + d)}${A(d, x, y + h - d)}V${ff(y + a)}${A(a, x + a, y)}Z`;
}
const EYE = { square:[0, 0, 0], rounded:[1.9, 1.1, 1], circle:[3.5, 2.5, 1.5], leaf:[[3.2, 0, 3.2, 0], [2.2, 0, 2.2, 0], [1.3, 0, 1.3, 0]] };
function eyePath(style, x, y) { const [o, i, c] = EYE[style] || EYE.square; return rrect(x, y, 7, 7, o) + rrect(x + 1, y + 1, 5, 5, i) + rrect(x + 2, y + 2, 3, 3, c); }
const inEye = (x, y, n) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
function modPath(shape, get, n, ox, oy, skipEyes) {
  let d = '';
  const on = (x, y) => x >= 0 && y >= 0 && x < n && y < n && get(x, y) && !(skipEyes && inEye(x, y, n));
  if (shape === 'bars') {
    for (let x = 0; x < n; x++) { let y = 0; while (y < n) { if (!on(x, y)) { y++; continue; } let y2 = y; while (y2 < n && on(x, y2)) y2++; d += rrect(ox + x + .08, oy + y, .84, y2 - y, .42); y = y2; } }
    return d;
  }
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!on(x, y)) { x++; continue; }
      if (shape === 'square') { let x2 = x; while (x2 < n && on(x2, y)) x2++; d += `M${ox + x} ${oy + y}h${x2 - x}v1h-${x2 - x}z`; x = x2; continue; }
      if (shape === 'dots') { const cx = ox + x + .5, cy = oy + y + .5, r = .46; d += `M${ff(cx - r)} ${ff(cy)}a${r} ${r} 0 1 0 ${ff(2 * r)} 0a${r} ${r} 0 1 0 ${ff(-2 * r)} 0z`; }
      else d += rrect(ox + x, oy + y, 1, 1, .32);
      x++;
    }
  }
  return d;
}
function layout(st, n) {
  const T = n + 8; let fm = 0, lh = 0;
  if (st.frame !== 'none') { fm = Math.max(2, Math.round(T * .06)); lh = Math.max(7, Math.round(T * .2)); }
  return { T, fm, lh, W: T + 2 * fm, H: st.frame === 'none' ? T : T + 2 * fm + lh };
}
function logoBox(st, n) {
  if (!st.logo || !(st.logoW > 0) || !(st.logoH > 0)) return null;
  const L = n * st.lSz / 100, r = st.logoW / st.logoH, w = r >= 1 ? L : L * r, h = r >= 1 ? L / r : L, pad = st.lPad ? L * .10 : 0;
  return { w, h, pad, x: (n - w) / 2, y: (n - h) / 2, frac: ((w + 2 * pad) * (h + 2 * pad)) / (n * n) };
}
/* devolve { svg, W, H }; px = largura em pixels desejada no atributo width */
function buildSVG(st, m, px) {
  const n = m.size, get = (x, y) => m.modules[y][x], { T, fm, lh, W, H } = layout(st, n), bgc = st.trans ? null : st.bg;
  const main = st.gradOn ? 'url(#g)' : st.fg, eyec = st.eyeSep ? st.eyeColor : main, o = fm + 4;
  const lb = logoBox(st, n), X = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let defs = '';
  if (st.gradOn) {
    const a = fm + 4, b = fm + 4 + n, mid = fm + 4 + n / 2;
    defs += st.gdir === 'rad' ? `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${mid}" cy="${mid}" r="${ff(n * .72)}"><stop offset="0" stop-color="${st.fg}"/><stop offset="1" stop-color="${st.g2}"/></radialGradient>`
      : `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${a}" y1="${st.gdir === 'v' ? a : st.gdir === 'h' ? mid : a}" x2="${st.gdir === 'v' ? a : b}" y2="${st.gdir === 'h' ? mid : b}"><stop offset="0" stop-color="${st.fg}"/><stop offset="1" stop-color="${st.g2}"/></linearGradient>`;
  }
  let body = '';
  if (bgc) body += `<rect width="${W}" height="${H}" fill="${bgc}"${st.frame !== 'none' ? ` rx="${ff(fm * 1.3)}"` : ''}/>`;
  if (st.frame === 'card') body += `<rect x=".45" y=".45" width="${W - .9}" height="${H - .9}" rx="${ff(fm * 1.3)}" fill="none" stroke="${st.fg}" stroke-width=".9"/>`;
  body += `<path d="${modPath(st.shape, get, n, o, o, true)}" fill="${main}"/>`;
  const eo = [[0, 0], [n - 7, 0], [0, n - 7]].map(([x, y]) => eyePath(st.eye, o + x, o + y)).join('');
  body += `<path d="${eo}" fill="${eyec}" fill-rule="evenodd"/>`;
  if (lb) {
    const x = o + lb.x, y = o + lb.y, rad = st.lRound ? Math.min(lb.w, lb.h) / 2 : Math.min(lb.w, lb.h) * .1;
    if (st.lPad) { const pr = st.lRound ? Math.min(lb.w, lb.h) / 2 + lb.pad : rad + lb.pad; body += `<rect x="${ff(x - lb.pad)}" y="${ff(y - lb.pad)}" width="${ff(lb.w + 2 * lb.pad)}" height="${ff(lb.h + 2 * lb.pad)}" rx="${ff(pr)}" fill="${st.trans ? '#FFFFFF' : st.bg}"/>`; }
    defs += `<clipPath id="lc"><rect x="${ff(x)}" y="${ff(y)}" width="${ff(lb.w)}" height="${ff(lb.h)}" rx="${ff(rad)}"/></clipPath>`;
    body += `<image href="${st.logo}" x="${ff(x)}" y="${ff(y)}" width="${ff(lb.w)}" height="${ff(lb.h)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#lc)"/>`;
  }
  if (st.frame !== 'none') {
    const txt = (st.ftext || '').trim(), by = fm + T, bh = lh - fm * .2; let fs = lh * .42; const est = txt.length * fs * .62, avail = T * .9; if (est > avail) fs = fs * avail / est;
    const cy = by + bh / 2 + fs * .35, dark = lum(st.fg) < .45;
    if (st.frame === 'banner') {
      body += `<rect x="${fm}" y="${ff(by)}" width="${T}" height="${ff(bh)}" rx="${ff(bh * .3)}" fill="${st.fg}"/>`;
      if (txt) body += `<text x="${W / 2}" y="${ff(cy)}" text-anchor="middle" font-family="Inter,Arial,Helvetica,sans-serif" font-weight="800" font-size="${ff(fs)}" fill="${dark ? '#FFFFFF' : '#000000'}">${X(txt)}</text>`;
    } else if (txt) body += `<text x="${W / 2}" y="${ff(cy)}" text-anchor="middle" font-family="Inter,Arial,Helvetica,sans-serif" font-weight="800" font-size="${ff(fs)}" fill="${st.fg}">${X(txt)}</text>`;
  }
  const pw = px || W * 10, ph = Math.round(pw * H / W * 100) / 100;
  const cr = st.shape === 'square' && st.eye === 'square' ? ' shape-rendering="crispEdges"' : '';
  return { W, H, svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${pw}" height="${ph}"${cr}>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>` };
}
const memo = new Map();
function getMatrix(text, ec) { text = String(text || ''); if (!text.trim()) return null; const k = ec + '|' + text; if (memo.has(k)) return memo.get(k); const m = QR.encode(text, ec); if (memo.size > 60) memo.clear(); memo.set(k, m); return m; }
function entryFor(st) { const t = contentOf(st); try { const m = getMatrix(t, st.ec); return m ? { m, t } : null; } catch { return null; } }
function thumbURI(st) { const e = entryFor(st); return e ? svgURI(buildSVG(st, e.m, 400).svg) : ''; }
async function rasterize(st, m, sz) {
  const { W, H } = layout(st, m.size), k = Math.max(1, Math.round(sz / W)), w = W * k, h = H * k;
  const img = await loadImage(svgURI(buildSVG(st, m, w).svg)), c = $('cv'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); return c;
}

/* ───── armazenamento (IndexedDB, com reserva em memória) ───── */
const DB = {
  db: null, mem: { lib: new Map(), kv: new Map() },
  open() { return new Promise(res => { try { const r = indexedDB.open('qrgen', 1); r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('lib', { keyPath: 'id' }); d.createObjectStore('kv', { keyPath: 'k' }); }; r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = r.onblocked = () => res(false); } catch { res(false); } }); },
  tx(store, mode, fn) { return new Promise((res, rej) => { try { const t = this.db.transaction(store, mode), s = t.objectStore(store), q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => rej(t.error); } catch (e) { rej(e); } }); },
  async all(store) { if (!this.db) return [...this.mem[store].values()]; return (await this.tx(store, 'readonly', s => s.getAll())) || []; },
  async put(store, v) { const key = store === 'kv' ? v.k : v.id; if (!this.db) { this.mem[store].set(key, v); return; } await this.tx(store, 'readwrite', s => s.put(v)); },
  async del(store, key) { if (!this.db) { this.mem[store].delete(key); return; } await this.tx(store, 'readwrite', s => s.delete(key)); },
  async get(store, key) { if (!this.db) return this.mem[store].get(key); return await this.tx(store, 'readonly', s => s.get(key)); }
};
let saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => DB.put('kv', { k:'state', v:S, name:$('qrName').value, tag:$('qrTag').value, editingId }).catch(() => {}), 300); }

/* ───── avisos e janelas ───── */
function toast(msg, opt = {}) {
  const z = $('toasts'), e = document.createElement('div'); e.className = 'toast';
  e.innerHTML = `<span>${esc(msg)}</span>${opt.action ? `<button type="button">${esc(opt.action)}</button>` : ''}`;
  if (opt.action) e.querySelector('button').addEventListener('click', () => { opt.fn && opt.fn(); e.remove(); });
  while (z.children.length >= 2) z.firstChild.remove();
  z.appendChild(e); setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 260); }, opt.ms || (opt.action ? 7000 : 3200));
}
function openDlg(id) { const d = $(id); if (!d.open) d.showModal(); }
function closeDlg(id) { const d = $(id); if (d.open) d.close(); }
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
/* ask({title,msg,inputs:[{key,label,value}],buttons:[{label,value,primary}]}) → {value, inputs} */
function ask({ title, msg = '', inputs = [], buttons }) {
  return new Promise(res => {
    $('askTitle').textContent = title; $('askMsg').textContent = msg; $('askMsg').style.display = msg ? '' : 'none';
    $('askInputs').innerHTML = inputs.map((i, k) => `<div><label for="ai${k}">${esc(i.label)}</label><input type="text" id="ai${k}" data-k="${esc(i.key)}" value="${esc(i.value || '')}" maxlength="${i.max || 60}" autocomplete="off"></div>`).join('');
    const bx = $('askBtns'); bx.innerHTML = '';
    let out = { value: null };
    (buttons || [{ label:'Cancelar', value:null }, { label:'OK', value:'ok', primary:true }]).forEach(b => { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label; el.addEventListener('click', () => { out = { value: b.value, inputs: Object.fromEntries([...$('askInputs').querySelectorAll('input')].map(i => [i.dataset.k, i.value.trim()])) }; $('askDlg').close(); }); bx.appendChild(el); });
    $('askDlg').addEventListener('close', () => res(out), { once: true });
    openDlg('askDlg'); const f = $('askInputs').querySelector('input'); if (f) { f.focus(); f.select(); }
  });
}

/* ───── mensagens de qualidade ───── */
function computeMessages(st, m, err) {
  const out = []; if (err) return [{ t:'err', m:err }]; if (!m) return out;
  const bg = st.trans ? '#FFFFFF' : st.bg, cols = st.gradOn ? [st.fg, st.g2] : [st.fg];
  const worst = Math.min(...cols.map(c => contrast(c, bg)));
  if (!st.trans && lum(st.fg) >= lum(st.bg)) out.push({ t:'warn', m:'Os módulos estão mais claros que o fundo. Alguns leitores não leem QR invertido. Prefira módulos escuros sobre fundo claro.' });
  else if (worst < 4) out.push({ t:'warn', m:`Contraste baixo (${worst.toFixed(1)}:1). Escureça os módulos ou clareie o fundo para o QR ler bem.` });
  if (st.trans) out.push({ t:'warn', m:'Fundo transparente: o QR só lê bem sobre um fundo claro e liso. Teste depois de aplicar.' });
  if (st.eyeSep && contrast(st.eyeColor, bg) < 4) out.push({ t:'warn', m:'A cor dos olhos tem pouco contraste com o fundo. Os leitores usam os 3 cantos para achar o QR.' });
  const lb = logoBox(st, m.size);
  if (lb && lb.frac > ECC_FRAC[st.ec] * .75) out.push({ t:'warn', m:`A logo cobre ${(lb.frac * 100).toFixed(0)}% do QR, acima do que o nível ${st.ec} tolera com folga. Diminua a logo ou use o nível H.` });
  if ((st.shape !== 'square') && (st.ec === 'L' || st.ec === 'M')) out.push({ t:'warn', m:'Formatos arredondados leem um pouco pior. Use correção Q ou H.' });
  if (m.version >= 15) out.push({ t:'warn', m:'QR muito denso (muito texto). Pode ser difícil de ler em tamanhos pequenos. Use um link mais curto.' });
  return out;
}
let msgsOpen = false;
function renderMsgs(list) {
  const errs = list.filter(x => x.t === 'err'), warns = list.filter(x => x.t === 'warn'), pill = $('statusBtn'), det = $('msgs'), empty = !_matrix && !errs.length;
  pill.className = 'pill ' + (errs.length ? 'err' : warns.length ? 'warn' : 'ok');
  $('statusTxt').textContent = empty ? 'Aguardando conteúdo' : errs.length ? 'Não coube' : warns.length ? `Atenção (${warns.length})` : 'Lê bem';
  pill.style.visibility = empty ? 'hidden' : 'visible';
  $('verTxt').textContent = _matrix ? `versão ${_matrix.version} · ${_matrix.size}×${_matrix.size}` : '';
  const det2 = [...errs, ...warns]; det.innerHTML = det2.map(x => `<div class="msg ${x.t}">${esc(x.m)}</div>`).join('');
  det.hidden = !det2.length || !(errs.length || msgsOpen); pill.setAttribute('aria-expanded', String(!det.hidden));
}
$('statusBtn').addEventListener('click', () => { msgsOpen = !msgsOpen; renderMsgs(computeMessages(S, _matrix, null)); });

/* ───── atualização principal ───── */
let GEN = 0;
function renderStats() {
  $('stSaved').textContent = LIB.length; $('stGen').textContent = GEN;
  const cap = QR.capacity(S.ec), used = new TextEncoder().encode(_content || '').length, p = cap ? Math.min(100, Math.round(used / cap * 100)) : 0;
  $('stArc').setAttribute('stroke-dasharray', (201 * p / 100).toFixed(1) + ' 201'); $('stPct').textContent = p + '%'; $('stCap').textContent = used + ' de ' + cap + ' bytes';
  $('stRead').textContent = !_matrix ? '—' : $('statusTxt').textContent;
  const bg = S.trans ? '#FFFFFF' : S.bg; $('stSub').textContent = _matrix ? `versão ${_matrix.version} · contraste ${(S.gradOn ? Math.min(contrast(S.fg, bg), contrast(S.g2, bg)) : contrast(S.fg, bg)).toFixed(1)}:1` : '';
}
function bump() { GEN++; DB.put('kv', { k:'stats', v:{ gen:GEN } }).catch(() => {}); renderStats(); }
let lastKey = '';
function refresh(save = true) {
  _content = contentOf(S); _matrix = null; let err = null;
  try { _matrix = getMatrix(_content, S.ec); } catch { err = `Conteúdo grande demais para o nível ${S.ec} (máximo ${QR.capacity(S.ec)} caracteres simples). Reduza o texto ou escolha um nível menor.`; }
  const img = $('qrImg');
  if (_matrix) {
    const uri = svgURI(buildSVG(S, _matrix, 0).svg); img.src = uri; $('mImg').src = uri;
    const k = _content + '|' + S.ec; if (k !== lastKey) { lastKey = k; img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop'); }
  } else { img.removeAttribute('src'); $('mImg').removeAttribute('src'); }
  $('qrWrap').classList.toggle('is-empty', !_matrix);
  $('checker').style.display = S.trans && _matrix ? 'block' : 'none';
  img.alt = _matrix ? `QR Code de: ${_content.slice(0, 80)}` : 'Nenhum QR Code gerado';
  ['dlMain', 'dlMore', 'copyBtn', 'shareBtn', 'testBtn', 'saveBtn', 'saveNewBtn', 'mDl', 'mCopy', 'mShare'].forEach(id => $(id).disabled = !_matrix);
  renderMsgs(computeMessages(S, _matrix, err));
  const used = new TextEncoder().encode(_content).length;
  $('capHint').textContent = used ? `${used} de ${QR.capacity(S.ec)} bytes (nível ${S.ec})` : '';
  const fin = $('finalTxt'); if (S.type !== 'link' && S.type !== 'text' && _content) { fin.textContent = _content; fin.classList.remove('hidden'); } else fin.classList.add('hidden');
  renderStats();
  if (save) persist();
}

/* ───── painel: sincroniza controles com o estado ───── */
function svgIcon(inner, vb = '0 0 24 24') { return `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`; }
function buildOpts() {
  const sample = [[1,1,1,0,1,1],[1,0,1,1,0,1],[0,1,1,1,1,0],[1,1,0,1,0,1],[1,0,1,0,1,1],[0,1,1,1,0,1]], g = (x, y) => !!sample[y][x];
  const names = { square:'Quadrado', rounded:'Arredondado', dots:'Pontos', bars:'Traços' };
  $('shapeOpts').innerHTML = ENUM.shape.map(s => `<button class="opt" data-shape="${s}" aria-pressed="false">${svgIcon(`<path d="${modPath(s, g, 6, 0, 0, false)}"/>`, '-.5 -.5 7 7')}${names[s]}</button>`).join('');
  const en = { square:'Reto', rounded:'Suave', circle:'Redondo', leaf:'Folha' };
  $('eyeOpts').innerHTML = ENUM.eye.map(s => `<button class="opt" data-eye="${s}" aria-pressed="false">${svgIcon(`<path fill-rule="evenodd" d="${eyePath(s, 0, 0)}"/>`, '-.5 -.5 8 8')}${en[s]}</button>`).join('');
  $('frameOpts').innerHTML = [['none', 'Sem moldura', '<rect x="9" y="6" width="30" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="3"/>'], ['banner', 'Faixa', '<rect x="6" y="4" width="36" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="8" y="34" width="32" height="9" rx="3"/>'], ['card', 'Cartão', '<rect x="5" y="3" width="38" height="42" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="11" y="9" width="26" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="14" y="36" width="20" height="3.5" rx="1.7"/>']]
    .map(([k, n, p]) => `<button class="opt" data-frame="${k}" aria-pressed="false">${svgIcon(p, '0 0 48 48')}${n}</button>`).join('');
}
function syncUI() {
  document.querySelectorAll('.type').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === S.type)));
  document.querySelectorAll('.fields').forEach(f => { f.hidden = f.dataset.for !== S.type; });
  document.querySelectorAll('[data-f]').forEach(i => { const v = S.f[i.dataset.f]; if (i.type === 'checkbox') i.checked = !!v; else if (document.activeElement !== i) i.value = v; });
  [['fg', 'fg'], ['bg', 'bg'], ['g2', 'g2'], ['eye', 'eyeColor']].forEach(([id, k]) => { $(id + 'Picker').value = S[k].toLowerCase(); $(id + 'Hex').value = S[k]; $(id + 'Face').style.background = S[k]; });
  $('transToggle').checked = S.trans; $('gradToggle').checked = S.gradOn; $('gradBox').hidden = !S.gradOn; $('gdir').value = S.gdir;
  $('eyeToggle').checked = S.eyeSep; $('eyeBox').hidden = !S.eyeSep; $('ftext').value = S.ftext; $('frameBox').hidden = S.frame === 'none';
  document.querySelectorAll('.ec-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ec === S.ec)));
  document.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fg === S.fg && b.dataset.bg === S.bg && !S.trans && !S.gradOn)));
  document.querySelectorAll('[data-shape]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shape === S.shape)));
  document.querySelectorAll('[data-eye]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.eye === S.eye)));
  document.querySelectorAll('[data-frame]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frame === S.frame)));
  $('logoSize').value = S.lSz; $('sizeVal').textContent = S.lSz + '%'; $('lPad').checked = S.lPad; $('lRound').checked = S.lRound;
  if (S.logo) { $('logoThumb').src = S.logo; $('logoName').textContent = S.logoName || 'logo'; $('logoExtra').classList.remove('hidden'); } else $('logoExtra').classList.add('hidden');
  const ed = editingId && LIB.find(x => x.id === editingId);
  $('saveLbl').textContent = ed ? 'Atualizar “' + ed.name.slice(0, 18) + '”' : 'Salvar na biblioteca'; $('saveNewBtn').classList.toggle('hidden', !ed);
}
const upd = (save = true) => { syncUI(); refresh(save); };
document.querySelectorAll('.type').forEach(b => b.addEventListener('click', () => { S.type = b.dataset.type; upd(); }));
document.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { S.f[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; refresh(); }));
document.querySelectorAll('[data-f]').forEach(i => { if (i.type === 'checkbox' || i.tagName === 'SELECT') i.addEventListener('change', () => { S.f[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; refresh(); }); });
document.querySelectorAll('.ec-btn').forEach(b => b.addEventListener('click', () => { S.ec = b.dataset.ec; upd(); }));
document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => { S.fg = b.dataset.fg; S.bg = b.dataset.bg; S.trans = false; S.gradOn = false; upd(); }));
[['fg', 'fg'], ['bg', 'bg'], ['g2', 'g2'], ['eye', 'eyeColor']].forEach(([id, k]) => {
  $(id + 'Picker').addEventListener('input', e => { S[k] = e.target.value.toUpperCase(); upd(); });
  $(id + 'Hex').addEventListener('input', e => { const h = normHex(e.target.value); if (h) { S[k] = h; $(id + 'Picker').value = h.toLowerCase(); $(id + 'Face').style.background = h; refresh(); syncUI(); } });
  $(id + 'Hex').addEventListener('blur', e => { e.target.value = S[k]; });
});
$('transToggle').addEventListener('change', e => { S.trans = e.target.checked; upd(); });
$('gradToggle').addEventListener('change', e => { S.gradOn = e.target.checked; upd(); });
$('gdir').addEventListener('change', e => { S.gdir = e.target.value; refresh(); });
$('eyeToggle').addEventListener('change', e => { S.eyeSep = e.target.checked; upd(); });
$('ftext').addEventListener('input', e => { S.ftext = e.target.value; refresh(); });
$('shapeOpts').addEventListener('click', e => { const b = e.target.closest('[data-shape]'); if (b) { S.shape = b.dataset.shape; upd(); } });
$('eyeOpts').addEventListener('click', e => { const b = e.target.closest('[data-eye]'); if (b) { S.eye = b.dataset.eye; upd(); } });
$('frameOpts').addEventListener('click', e => { const b = e.target.closest('[data-frame]'); if (b) { S.frame = b.dataset.frame; upd(); } });
$('logoSize').addEventListener('input', e => { S.lSz = parseInt(e.target.value); $('sizeVal').textContent = S.lSz + '%'; refresh(); });
$('lPad').addEventListener('change', e => { S.lPad = e.target.checked; refresh(); });
$('lRound').addEventListener('change', e => { S.lRound = e.target.checked; refresh(); });
$('qrName').addEventListener('input', persist); $('qrTag').addEventListener('input', persist);

/* ───── logo ───── */
async function shrinkLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url); let w = img.naturalWidth || 300, h = img.naturalHeight || 300;
    const k = Math.min(1, 480 / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    return { data: c.toDataURL('image/png'), w, h };
  } finally { URL.revokeObjectURL(url); }
}
async function setLogoFromFile(f) {
  if (!f || !/^image\//.test(f.type)) { toast('Escolha um arquivo de imagem.'); return; }
  try {
    const r = await shrinkLogo(f); S.logo = r.data; S.logoW = r.w; S.logoH = r.h; S.logoName = f.name || 'logo';
    if (S.ec !== 'H') { S.ec = 'H'; toast('Correção ajustada para H, o melhor nível para QR com logo.'); }
    upd();
  } catch { toast('Não consegui ler essa imagem.'); }
}
$('logoInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; setLogoFromFile(f); });
const dz = $('dropZone');
['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', e => setLogoFromFile(e.dataTransfer.files[0]));
document.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); setLogoFromFile(f); } });
$('removeLogo').addEventListener('click', () => { S.logo = null; S.logoName = ''; S.logoW = S.logoH = 0; upd(); });

/* ───── exportar ───── */
const baseName = () => 'qr-' + slug($('qrName').value.trim() || (S.type === 'link' ? _content : TYPE_NAME[S.type]));
function saveBlob(blob, name) { const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const toBlob = c => new Promise(res => c.toBlob(b => res(b), 'image/png'));
async function makePNG(sz, st = S, m = _matrix) { try { const c = await rasterize(st, m, sz), b = await toBlob(c); const dim = c.width + '×' + c.height; c.width = c.height = 1; if (!b) throw 0; b.dim = dim; return b; } catch { toast(`Seu aparelho não conseguiu gerar ${sz} px. Tente um tamanho menor.`); return null; } }
const FMT = { png512:['Baixar PNG', '512 px'], png1024:['Baixar PNG', '1024 px'], png2048:['Baixar PNG', '2048 px'], png4096:['Baixar PNG', '4096 px'], svg:['Baixar SVG', 'vetor'] };
let dlFmt = 'png1024'; try { const v = localStorage.getItem('qr_dlfmt'); if (FMT[v]) dlFmt = v; } catch {}
function renderDl() { $('dlLabel').textContent = FMT[dlFmt][0]; $('dlSub').textContent = FMT[dlFmt][1]; }
async function doDownload(fmt) {
  if (!_matrix) return;
  if (fmt === 'copysvg') { try { await navigator.clipboard.writeText(buildSVG(S, _matrix, 0).svg); toast('Código SVG copiado.'); } catch { toast('Não consegui copiar. Use Baixar SVG.'); } return; }
  if (FMT[fmt]) { dlFmt = fmt; try { localStorage.setItem('qr_dlfmt', fmt); } catch {} renderDl(); }
  const base = baseName();
  if (fmt === 'svg') { saveBlob(new Blob([buildSVG(S, _matrix, 0).svg], { type:'image/svg+xml' }), base + '.svg'); toast('SVG baixado (vetor).'); }
  else { const b = await makePNG(parseInt(fmt.slice(3))); if (b) { saveBlob(b, base + '.png'); toast(`PNG baixado (${b.dim} px).`); } }
  addRecent(); bump();
}
$('dlMain').addEventListener('click', () => doDownload(dlFmt)); $('mDl').addEventListener('click', () => doDownload(dlFmt));
$('dlMore').addEventListener('click', e => { e.stopPropagation(); const m = $('dlMenu'); m.classList.toggle('hidden'); $('dlMore').setAttribute('aria-expanded', String(!m.classList.contains('hidden'))); });
$('dlMenu').addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (b) { $('dlMenu').classList.add('hidden'); doDownload(b.dataset.fmt); } });
document.addEventListener('click', e => { if (!e.target.closest('.split')) $('dlMenu').classList.add('hidden'); });
async function doCopy() {
  if (!_matrix) return;
  try { if (!navigator.clipboard || !window.ClipboardItem) throw 0; const b = await makePNG(1024); if (!b) return; await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('QR copiado. Cole onde quiser.'); addRecent(); bump(); }
  catch { toast('Seu navegador não permitiu copiar a imagem. Use Baixar PNG.'); }
}
async function doShare() {
  if (!_matrix) return; const b = await makePNG(1024); if (!b) return; const f = new File([b], baseName() + '.png', { type:'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files:[f] })) { await navigator.share({ files:[f], title:'QR Code' }); addRecent(); bump(); } else { saveBlob(b, f.name); toast('Compartilhar não está disponível aqui; baixei o PNG.'); } }
  catch (e) { if (e && e.name !== 'AbortError') toast('Não consegui compartilhar.'); }
}
$('copyBtn').addEventListener('click', doCopy); $('mCopy').addEventListener('click', doCopy); $('shareBtn').addEventListener('click', doShare); $('mShare').addEventListener('click', doShare);
$('mThumb').addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
$('testBtn').addEventListener('click', async () => {
  if (!_matrix) return;
  if (!('BarcodeDetector' in window)) { toast('Este navegador não tem leitor de QR embutido. Aponte a câmera do celular para a tela para conferir.', { ms:5500 }); return; }
  try {
    const det = new BarcodeDetector({ formats:['qr_code'] }), c = await rasterize(S, _matrix, 700), r = await det.detect(c);
    if (r.length && r[0].rawValue === _content) toast('✔ Leitura confirmada: o QR abre exatamente o conteúdo certo.');
    else if (r.length) toast('O QR foi lido, mas com conteúdo diferente. Revise as opções.', { ms:5000 });
    else toast('Não consegui ler este QR. Aumente o contraste, reduza a logo ou use correção H.', { ms:5000 });
  } catch { toast('Não foi possível testar a leitura neste aparelho.'); }
});

/* ───── recentes ───── */
function addRecent() {
  if (!_content) return; const snap = clone(S), key = _content + '|' + S.type;
  RECENT = [{ key, label: _content.replace(/\s+/g, ' ').slice(0, 40), s: snap }, ...RECENT.filter(r => r.key !== key)].slice(0, 8);
  DB.put('kv', { k:'recent', v:RECENT }).catch(() => {}); renderRecent();
}
function renderRecent() {
  $('recentBox').classList.toggle('hidden', !RECENT.length);
  $('recentList').innerHTML = RECENT.map((r, i) => `<button class="chip" data-r="${i}" title="${esc(r.key)}">${esc(r.label)}</button>`).join('');
}
$('recentList').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; S = cleanState(RECENT[+b.dataset.r].s); editingId = null; upd(); });

/* ───── biblioteca ───── */
let libQ = '', libTag = '';
const libEntry = (name, tag) => ({ id: uid(), name, tag, s: clone(S), ts: Date.now() });
async function libPut(e) { try { await DB.put('lib', e); return true; } catch { toast('Sem espaço para salvar. Exclua itens ou exporte um backup.'); return false; } }
async function saveEntry(asNew) {
  if (!_matrix) return;
  const name = $('qrName').value.trim() || (S.type === 'link' ? slug(_content).replace(/-/g, ' ').slice(0, 30) : TYPE_NAME[S.type]) || 'QR Code', tag = $('qrTag').value.trim();
  const ed = !asNew && editingId && LIB.find(x => x.id === editingId);
  if (ed) { Object.assign(ed, { name, tag, s: clone(S), ts: Date.now() }); if (await libPut(ed)) toast('Atualizado: ' + name); }
  else {
    const dup = LIB.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      const r = await ask({ title:'Já existe “' + dup.name + '”', msg:'Quer substituir o salvo ou guardar este como outro item?', buttons:[{ label:'Cancelar', value:null }, { label:'Guardar como novo', value:'new' }, { label:'Substituir', value:'rep', primary:true }] });
      if (!r.value) return;
      if (r.value === 'rep') { Object.assign(dup, { tag, s: clone(S), ts: Date.now() }); await libPut(dup); editingId = dup.id; toast('Substituído: ' + name); }
      else { const e = libEntry(name + ' (2)', tag); LIB.unshift(e); await libPut(e); editingId = e.id; toast('Salvo: ' + e.name); }
    } else { const e = libEntry(name, tag); LIB.unshift(e); if (await libPut(e)) { editingId = e.id; toast('Salvo na biblioteca: ' + name); } }
  }
  addRecent(); renderLib(); syncUI(); persist();
}
$('saveBtn').addEventListener('click', () => saveEntry(false)); $('saveNewBtn').addEventListener('click', () => saveEntry(true));
function renderLib() {
  $('stSaved').textContent = LIB.length;
  $('libCount').textContent = LIB.length ? `(${LIB.length})` : '';
  const tags = [...new Set(LIB.map(e => e.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (libTag && !tags.includes(libTag)) libTag = '';
  $('tagChips').innerHTML = tags.length ? [['', 'Todas'], ...tags.map(t => [t, t])].map(([v, l]) => `<button class="chip" data-tag="${esc(v)}" aria-pressed="${v === libTag}">${esc(l)}</button>`).join('') : '';
  const q = libQ.toLowerCase(), list = LIB.filter(e => (!libTag || e.tag === libTag) && (!q || (e.name + ' ' + (e.tag || '') + ' ' + contentOf(e.s)).toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts);
  const grid = $('libGrid');
  if (!LIB.length) { grid.innerHTML = '<p class="lib-empty">Nada salvo ainda. Monte um QR, dê um nome e clique em “Salvar na biblioteca”.</p>'; return; }
  if (!list.length) { grid.innerHTML = '<p class="lib-empty">Nenhum QR encontrado para essa busca.</p>'; return; }
  grid.innerHTML = list.map(e => `<div class="lc ${e.id === editingId ? 'cur' : ''}" data-id="${esc(e.id)}"><div class="th">${(() => { const u = thumbURI(e.s); return u ? `<img src="${u}" alt="QR ${esc(e.name)}" loading="lazy">` : ''; })()}</div>
    <div class="ln" title="${esc(e.name)}">${esc(e.name)}</div>${e.tag ? `<span class="lb">${esc(e.tag)}</span>` : ''}<div class="lt" title="${esc(contentOf(e.s))}">${esc(contentOf(e.s).replace(/\s+/g, ' '))}</div>
    <div class="la"><button class="btn" data-a="open">Abrir</button><button class="btn" data-a="info">Editar info</button><button class="btn" data-a="dup">Duplicar</button><button class="btn" data-a="dl">PNG</button><button class="btn danger" data-a="del" style="grid-column:1/-1">Excluir</button></div></div>`).join('');
}
$('libSearch').addEventListener('input', e => { libQ = e.target.value; renderLib(); });
$('tagChips').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (b) { libTag = b.dataset.tag; renderLib(); } });
$('libGrid').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const id = b.closest('.lc').dataset.id, e = LIB.find(x => x.id === id); if (!e) return;
  const a = b.dataset.a;
  if (a === 'open') { S = cleanState(e.s); editingId = e.id; $('qrName').value = e.name; $('qrTag').value = e.tag || ''; upd(); renderLib(); setTab('conteudo'); window.scrollTo({ top:0, behavior:'smooth' }); toast('Aberto: ' + e.name); }
  else if (a === 'dup') { const c = { id: uid(), name: e.name + ' (cópia)', tag: e.tag, s: clone(e.s), ts: Date.now() }; LIB.unshift(c); await libPut(c); renderLib(); toast('Duplicado.'); }
  else if (a === 'info') { const r = await ask({ title:'Editar informações', inputs:[{ key:'name', label:'Nome', value:e.name }, { key:'tag', label:'Etiqueta', value:e.tag || '', max:24 }], buttons:[{ label:'Cancelar', value:null }, { label:'Salvar', value:'ok', primary:true }] }); if (r.value && r.inputs.name) { e.name = r.inputs.name; e.tag = r.inputs.tag; await libPut(e); if (editingId === e.id) { $('qrName').value = e.name; $('qrTag').value = e.tag; } renderLib(); syncUI(); } }
  else if (a === 'del') {
    LIB = LIB.filter(x => x.id !== id); await DB.del('lib', id).catch(() => {}); if (editingId === id) editingId = null; renderLib(); syncUI(); persist();
    toast('Excluído: ' + e.name, { action:'Desfazer', fn: async () => { LIB.unshift(e); await libPut(e); renderLib(); } });
  } else if (a === 'dl') { const x = entryFor(e.s); if (!x) { toast('Esse QR não cabe mais.'); return; } const bl = await makePNG(1024, e.s, x.m); if (bl) saveBlob(bl, 'qr-' + slug(e.name) + '.png'); }
});
$('libExport').addEventListener('click', () => { if (!LIB.length) { toast('A biblioteca está vazia.'); return; } saveBlob(new Blob([JSON.stringify({ app:'Gerador de QR Code', versao:3, itens:LIB }, null, 1)], { type:'application/json' }), 'biblioteca-qr-' + new Date().toISOString().slice(0, 10) + '.json'); });
$('libImport').addEventListener('click', () => $('libFile').click());
$('libFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), arr = Array.isArray(j) ? j : j.itens; if (!Array.isArray(arr)) throw 0; let add = 0; const ids = new Set(LIB.map(x => x.id));
    for (const x of arr) {
      if (!x || !x.name || ids.has(x.id)) continue; let s;
      if (x.s) s = cleanState(x.s); else s = await legacyState(x);
      if (!s) continue; const en = { id: x.id || uid(), name: String(x.name).slice(0, 60), tag: String(x.tag || '').slice(0, 24), s, ts: x.ts || Date.now() }; LIB.push(en); await libPut(en); add++;
    }
    renderLib(); toast(`${add} QR importado(s).`);
  } catch { toast('Arquivo inválido. Use um backup exportado por aqui.'); }
});
/* converte itens das versões antigas (texto livre) */
async function legacyState(x) {
  if (typeof x.text !== 'string') return null;
  const o = { type: /^https?:\/\//i.test(x.text) ? 'link' : 'text', f: { ...F0, url: x.text, text: x.text }, fg: x.fg, bg: x.bg, trans: x.trans, ec: x.ec, lSz: x.lSz };
  if (typeof x.logo === 'string' && x.logo.startsWith('data:image/')) { try { const i = await loadImage(x.logo); o.logo = x.logo; o.logoName = x.logoName; o.logoW = i.naturalWidth; o.logoH = i.naturalHeight; } catch {} }
  return cleanState(o);
}

/* ───── ZIP, lote e folha de impressão ───── */
function crc32(buf) { if (!crc32.t) { crc32.t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc32.t[n] = c >>> 0; } } let c = ~0; for (let i = 0; i < buf.length; i++) c = crc32.t[(c ^ buf[i]) & 255] ^ (c >>> 8); return ~c >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(), parts = [], cen = [], now = new Date(); let off = 0;
  const dt = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), dd = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length, lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, dt, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(lh.buffer), nm, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + sz;
  }
  let csz = 0; cen.forEach(c => csz += c.length);
  const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(end.buffer)], { type:'application/zip' });
}
function parseBatch(txt) {
  const out = [], used = new Set();
  txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
    let name = '', c = l; const i = l.search(/[;\t]/); if (i > 0) { name = l.slice(0, i).trim().replace(/^"|"$/g, ''); c = l.slice(i + 1).trim().replace(/^"|"$/g, ''); }
    if (!c) return; let base = slug(name || c), n = base, k = 2; while (used.has(n)) n = base + '-' + k++; used.add(n); out.push({ name: name || c.slice(0, 40), file: n, content: c });
  });
  return out;
}
const batchStatus = () => { const n = parseBatch($('batchText').value).length; $('batchInfo').textContent = n ? `${n} QR Code${n > 1 ? 's' : ''} na lista${n > 300 ? ' (máximo 300: os demais serão ignorados)' : ''}.` : ''; };
$('batchBtn').addEventListener('click', () => { batchStatus(); openDlg('batchDlg'); });
$('batchText').addEventListener('input', batchStatus);
$('batchFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const t = await f.text(); $('batchText').value = ($('batchText').value.trim() ? $('batchText').value.trim() + '\n' : '') + t.replace(/^﻿/, '').trim(); batchStatus(); });
$('batchGo').addEventListener('click', async () => {
  const items = parseBatch($('batchText').value).slice(0, 300); if (!items.length) { toast('Escreva ao menos uma linha.'); return; }
  const fmt = $('batchFmt').value, files = [], enc = new TextEncoder(), bad = []; $('batchGo').disabled = true;
  try {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; let m; try { m = getMatrix(it.content, S.ec); } catch { m = null; } if (!m) { bad.push(it.name); continue; }
      if (fmt === 'svg') files.push({ name: it.file + '.svg', data: enc.encode(buildSVG(S, m, 0).svg) });
      else { const b = await makePNG(parseInt(fmt.slice(3)), S, m); if (b) files.push({ name: it.file + '.png', data: new Uint8Array(await b.arrayBuffer()) }); else bad.push(it.name); }
      $('batchInfo').textContent = `Gerando ${i + 1} de ${items.length}…`;
      if (i % 4 === 3) await new Promise(r => setTimeout(r));
    }
    if (!files.length) { toast('Nenhum QR pôde ser gerado.'); return; }
    saveBlob(makeZip(files), 'qr-codes-' + new Date().toISOString().slice(0, 10) + '.zip');
    toast(`ZIP com ${files.length} QR Code${files.length > 1 ? 's' : ''} baixado.` + (bad.length ? ` ${bad.length} não couberam.` : ''), { ms:4500 }); batchStatus();
  } finally { $('batchGo').disabled = false; }
});
function printSheet(items, cols, title) {
  const cells = items.map(it => `<div class="pcell"><img src="${it.uri}" alt=""><span>${esc(it.name)}</span></div>`).join('');
  $('printDoc').innerHTML = `<h1>${esc(title)}</h1><div class="pgrid" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
  setTimeout(() => window.print(), 60);
}
async function askCols() { const r = await ask({ title:'Folha para imprimir', msg:'Quantos QR Codes por linha?', buttons:[{ label:'Cancelar', value:null }, { label:'2', value:2 }, { label:'3', value:3, primary:true }, { label:'4', value:4 }] }); return r.value; }
$('libSheet').addEventListener('click', async () => {
  const q = libQ.toLowerCase(), list = LIB.filter(e => (!libTag || e.tag === libTag) && (!q || (e.name + ' ' + (e.tag || '')).toLowerCase().includes(q)));
  if (!list.length) { toast('A biblioteca está vazia.'); return; } const cols = await askCols(); if (!cols) return;
  printSheet(list.map(e => ({ name: e.name, uri: thumbURI(e.s) })).filter(x => x.uri), cols, 'Biblioteca de QR Codes' + (libTag ? ' · ' + libTag : ''));
});
$('batchPrint').addEventListener('click', async () => {
  const items = parseBatch($('batchText').value).slice(0, 300); if (!items.length) { toast('Escreva ao menos uma linha.'); return; }
  const cols = await askCols(); if (!cols) return;
  const list = items.map(it => { let m = null; try { m = getMatrix(it.content, S.ec); } catch {} return m ? { name: it.name, uri: svgURI(buildSVG(S, m, 400).svg) } : null; }).filter(Boolean);
  closeDlg('batchDlg'); printSheet(list, cols, 'QR Codes');
});

/* ───── abas, tema, atalhos ───── */
function setTab(t) {
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  ['conteudo', 'estilo', 'logo', 'lib'].forEach(x => { $('p-' + x).hidden = x !== t; });
}
document.querySelectorAll('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('p-lib').previousElementSibling && document.querySelector('.tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = [...document.querySelectorAll('.tabs [data-tab]')], i = tabs.findIndex(b => b.getAttribute('aria-selected') === 'true'), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; setTab(n.dataset.tab); n.focus();
});
$('helpBtn').addEventListener('click', () => openDlg('helpDlg'));
document.addEventListener('keydown', e => {
  const ae = document.activeElement, typing = ae && (/TEXTAREA|SELECT/.test(ae.tagName) || (ae.tagName === 'INPUT' && !/checkbox|radio|button|range|color/.test(ae.type))), mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveEntry(false); return; }
  if (mod && e.key === 'Enter') { e.preventDefault(); doDownload(dlFmt); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); doCopy(); return; }
  if (typing || mod || document.querySelector('dialog[open]')) return;
  if (e.key === '/') { e.preventDefault(); setTab('conteudo'); const f = document.querySelector('.fields:not([hidden]) input,.fields:not([hidden]) textarea'); if (f) f.focus(); }
  else if (e.key === '?') { e.preventDefault(); openDlg('helpDlg'); }
});

/* ───── início ───── */
(async function boot() {
  buildOpts();
  const ok = await DB.open(); if (!ok) toast('Armazenamento do navegador indisponível: nada será guardado ao fechar.', { ms:5000 });
  try {
    LIB = (await DB.all('lib')).filter(e => e && e.s); const st = await DB.get('kv', 'state'), rc = await DB.get('kv', 'recent'), sg = await DB.get('kv', 'stats'); if (sg && sg.v) GEN = +sg.v.gen || 0;
    if (rc && Array.isArray(rc.v)) RECENT = rc.v.filter(r => r && r.s);
    if (st && st.v) { S = cleanState(st.v); $('qrName').value = st.name || ''; $('qrTag').value = st.tag || ''; editingId = LIB.some(e => e.id === st.editingId) ? st.editingId : null; }
    else await migrateOld();
  } catch {}
  syncUI(); refresh(false); renderLib(); renderRecent();
  addEventListener('resize', () => {}); setTimeout(() => { const sp = $('splash'); if (sp) { sp.classList.add('out'); setTimeout(() => sp.remove(), 500); } }, 350);
})();
/* traz a biblioteca e o último QR da versão antiga (mesmo endereço) */
async function migrateOld() {
  try {
    const old = JSON.parse(localStorage.getItem('qr_state_v2') || 'null'), lib = JSON.parse(localStorage.getItem('qr_lib_v2') || 'null');
    if (old && typeof old.text === 'string') { const s = await legacyState(old); if (s) S = s; }
    if (Array.isArray(lib)) for (const x of lib) { const s = await legacyState(x); if (!s || !x.name) continue; const e = { id: x.id || uid(), name: String(x.name).slice(0, 60), tag: '', s, ts: x.ts || Date.now() }; LIB.push(e); await libPut(e); }
    if (LIB.length) toast(`${LIB.length} QR da versão anterior foram trazidos para a biblioteca.`, { ms:4500 });
  } catch {}
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão disponível.', { action:'Atualizar', fn: () => nw.postMessage({ type:'SKIP' }), ms:15000 }); }); })).catch(() => {});
  let rl = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (rl || !had) return; rl = true; location.reload(); });
}
window.__qr = { S: () => S, contentOf, buildSVG, makeZip, parseBatch, cleanState };
