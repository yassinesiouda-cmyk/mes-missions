/* Ganba! — tout est stocké sur l'appareil (localStorage), rien n'est envoyé ailleurs. */
'use strict';

const APP_VERSION = '10';
const BONUS_ID = '__bonus__';
const STORE_KEY = 'mes-missions-v1';
const KEEP_DAYS = 60; // historique conservé (hors éléments en attente)

const EMOJIS_TACHES = ['📺', '💛', '🧸', '📚', '🎒', '🛏️', '🦷', '🍽️', '👕', '🧹', '🐶', '🌱', '🚿', '🎹', '⚽', '📖', '🧺', '♻️'];
const EMOJIS_RECOMPENSES = ['🏍️', '🍣', '📺', '🎮', '🌳', '🍦', '🍕', '🎬', '🛝', '🎨', '📱', '🧁', '🏊', '🎁'];

/* ---------- Données ---------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function defaultState() {
  return {
    version: 1,
    childName: '',
    mascot: 'mochi',
    mascotChosen: false,
    theme: 'sakura',
    pin: null,
    balance: 0,
    // Bonus « journée complète » : toutes les tâches cochées, y compris en famille. Validé par le parent.
    bonus: { enabled: true, points: 5 },
    // Entraînement de calcul mental (voir games.js)
    calc: { enabled: true, points: 10, level: 2, history: [] },
    tasks: [
      { id: uid(), emoji: '🛏️', title: 'Ranger ma chambre', points: 10, family: false, active: true },
      { id: uid(), emoji: '📚', title: 'Faire mes devoirs', points: 15, family: false, active: true },
      { id: uid(), emoji: '🎒', title: 'Préparer mon cartable', points: 5, family: false, active: true },
      { id: uid(), emoji: '🍽️', title: 'Mettre la table', points: 0, family: true, active: true },
      { id: uid(), emoji: '🦷', title: 'Me brosser les dents', points: 0, family: true, active: true },
    ],
    rewards: [
      { id: uid(), emoji: '🎲', title: 'Soirée jeu de société en famille', cost: 40, active: true },
      { id: uid(), emoji: '🎬', title: 'Choisir le film du week-end', cost: 30, active: true },
      { id: uid(), emoji: '🍦', title: 'Choisir le dessert', cost: 20, active: true },
      { id: uid(), emoji: '📺', title: '30 min d\'écran en plus', cost: 30, active: true },
      { id: uid(), emoji: '🌳', title: 'Une sortie rien que nous deux', cost: 60, active: true },
    ],
    // Coches : status = 'fait' (tâche de famille), 'attente', 'valide', 'refuse'
    checks: [],
    // Demandes de récompense : status = 'attente', 'accepte', 'refuse'
    requests: [],
    // Idées proposées par l'enfant : type = 'tache' | 'recompense', status = 'attente' | 'accepte' | 'refuse'
    proposals: [],
    // Petits mots du parent : { text, at, seen }
    messages: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = Object.assign(defaultState(), JSON.parse(raw));
    return prune(s);
  } catch (e) {
    console.error('Lecture impossible', e);
    return defaultState();
  }
}

function prune(s) {
  const limit = new Date();
  limit.setDate(limit.getDate() - KEEP_DAYS);
  const lim = limit.getTime();
  s.checks = s.checks.filter(c => c.status === 'attente' || c.at >= lim);
  s.requests = s.requests.filter(r => r.status === 'attente' || r.at >= lim);
  s.proposals = s.proposals.filter(r => r.status === 'attente' || r.at >= lim);
  s.messages = s.messages.filter(m => !m.seen || m.at >= lim);
  return s;
}

let state = load();
document.body.dataset.theme = state.theme;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('⚠️ Impossible d\'enregistrer sur ce téléphone');
  }
}

// Demande au navigateur de ne pas effacer les données en cas de manque de place.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

/* ---------- Calculs ---------- */

function checkFor(taskId, date) {
  return state.checks.find(c => c.taskId === taskId && c.date === date);
}
function pendingChecks() {
  return state.checks.filter(c => c.status === 'attente').sort((a, b) => a.at - b.at);
}
function pendingRequests() {
  return state.requests.filter(r => r.status === 'attente').sort((a, b) => a.at - b.at);
}
// Ordre d'affichage : tâches en famille d'abord, puis de celle qui rapporte le plus à celle qui rapporte le moins.
function sortedTasks() {
  return state.tasks.slice().sort((a, b) =>
    (b.family - a.family) || ((b.family ? 0 : b.points) - (a.family ? 0 : a.points)) || a.title.localeCompare(b.title, 'fr'));
}

function pendingProposals() {
  return state.proposals.filter(p => p.status === 'attente').sort((a, b) => a.at - b.at);
}
function pointsWaiting() {
  return pendingChecks().reduce((n, c) => n + c.points, 0);
}
function pointsReserved() {
  return pendingRequests().reduce((n, r) => n + r.cost, 0);
}
function pointsAvailable() {
  return state.balance - pointsReserved();
}

/* ---------- Outils d'affichage ---------- */

const $ = sel => document.querySelector(sel);
const view = $('#view');
const modal = $('#modal');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function confetti() {
  const items = ['⭐', '🎉', '✨', '💜', '🌟'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = items[i % items.length];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

function dateLabel(d) {
  if (d === today()) return 'aujourd\'hui';
  const [y, m, j] = d.split('-').map(Number);
  return new Date(y, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

let lastPoints = null;
function renderHeader() {
  const name = state.childName.trim();
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#hello').innerHTML = (name ? 'Salut ' + esc(name) + ' 👋' : 'Ganba! ✨') + '<small>' + esc(jour) + '</small>';
  $('#pointsValue').textContent = pointsAvailable();
  if (lastPoints !== null && lastPoints !== pointsAvailable()) {
    const b = $('#pointsBadge');
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }
  lastPoints = pointsAvailable();
}

/* ---------- Navigation ---------- */

let tab = 'jour';
let parentUnlocked = false;
let parentTab = 'valider';

function resetLock() {
  parentUnlocked = false;
  pinMode = 'enter'; // annule un changement de code en cours
  pinBuffer = '';
  pinFirst = null;
}

function setTab(t) {
  if (!(t === 'parent' && tab === 'parent')) resetLock();
  game = null; // quitter un onglet arrête la séance de calcul en cours // on reverrouille dès qu'on quitte l'espace parent
  tab = t;
  render();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

// Reverrouiller quand l'app passe en arrière-plan, et rafraîchir (changement de jour).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetLock();
    if (modal.open) modal.close();
  } else {
    render();
  }
});

function render() {
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', b.dataset.tab === tab);
  });
  renderHeader();
  if (tab === 'jour') { if (game) renderGame(); else renderJour(); }
  else if (tab === 'magasin') renderMagasin();
  else renderParent();
}

/* ---------- Côté enfant : Ma journée ---------- */

function renderJour() {
  const d = today();
  const tasks = sortedTasks().filter(t => t.active);
  const done = tasks.filter(t => isDone(t.id, d)).length;
  const waiting = pointsWaiting();
  const b = checkFor(BONUS_ID, d);
  let bonusLine = '';
  if (b && b.status === 'valide') bonusLine = `<span class="pill">🌟 Bonus +${b.points} gagné</span>`;
  else if (b && b.status === 'attente') bonusLine = `<span class="pill attente">🌟 Bonus +${b.points} en attente</span>`;
  else if (!b && state.bonus.enabled) bonusLine = `<span class="hint">🌟 Tout faire, même en famille = <b>+${state.bonus.points} bonus</b></span>`;

  if (!tasks.length) {
    view.innerHTML = buddyHTML(0, 0) + '<div class="empty"><span class="big">🌈</span>Pas de mission aujourd\'hui.</div>' + proposeBtn('tache');
    return;
  }

  const pct = Math.round((done / tasks.length) * 100);
  let html = buddyHTML(done, tasks.length) + `
    <div class="progress">
      <div class="progress-text"><span>${done === tasks.length ? 'Bravo, tout est fait ! 🎉' : 'Ma progression'}</span><span>${done} / ${tasks.length}</span></div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      ${bonusLine ? `<div style="margin-top:8px">${bonusLine}</div>` : ''}
    </div>`;
  if (waiting > 0) html += `<p class="sub">⏳ <b>${waiting} points</b> attendent la validation de ton parent.</p>`;

  html += '<div class="list">';
  for (const t of tasks) {
    const c = checkFor(t.id, d);
    const st = c ? c.status : '';
    let cls = '', mark = '', meta;
    if (st === 'fait' || st === 'valide') { cls = 'fait'; mark = '✓'; }
    else if (st === 'attente') { cls = 'attente'; mark = '⏳'; }
    else if (st === 'refuse') { cls = 'refuse'; }

    if (t.family) meta = '<span class="pill famille">En famille 💙</span>';
    else if (st === 'valide') meta = `<span class="pill">+${c.points} gagnés ⭐</span>`;
    else if (st === 'attente') meta = `<span class="pill attente">+${c.points} en attente</span>`;
    else if (st === 'refuse') meta = `<span class="pill attente">À refaire 💪</span>`;
    else meta = `<span class="pill">+${t.points} ⭐</span>`;

    html += `
      <button class="task ${cls}" data-act="toggle" data-id="${t.id}">
        <span class="emoji">${esc(t.emoji)}</span>
        <span class="label">${esc(t.title)}<span class="meta">${meta}</span></span>
        <span class="check">${mark}</span>
      </button>`;
  }
  html += '</div>' + calcCardHTML() + proposeBtn('tache');
  view.innerHTML = html;
}

function proposeBtn(type) {
  return `<p style="margin-top:16px"><button class="btn lien large" data-act="propose" data-id="${type}">💡 Proposer ${type === 'tache' ? 'une mission' : 'une récompense'}</button></p>`;
}

/* ---------- Compagnon ---------- */

function unseenMessage() {
  return state.messages.filter(m => !m.seen).sort((a, b) => a.at - b.at)[0];
}

function buddyHTML(done, total) {
  const h = new Date().getHours();
  const msg = unseenMessage();
  let mood = 'calme', from = MASCOTS[state.mascot] ? MASCOTS[state.mascot].name : 'Mochi', text, extra = '';
  if (msg) {
    mood = 'fiere';
    from = '💌 Un mot de ton parent';
    text = esc(msg.text);
    extra = `<br><button class="btn petit" data-act="msg-seen" data-id="${msg.id}">Merci 💜</button>`;
  } else if (h >= 21 || h < 6) {
    mood = 'dodo';
    text = 'Il est tard… On se repose, demain est un nouveau jour 🌙';
  } else if (total && done === total) {
    mood = 'fiere';
    text = 'Tout est fait ! Tu t\'es organisée comme une cheffe ✨';
  } else if (done > 0) {
    mood = 'contente';
    const l = ['Une de plus ! Tu avances bien 💪', 'Pas à pas, c\'est comme ça qu\'on y arrive 🌸', 'Continue, tu gères ✨'];
    text = l[done % l.length];
  } else {
    text = 'Ganba ! Par quoi tu commences aujourd\'hui ?';
  }
  if (!state.mascotChosen && !msg) text += '<br><small>(Touche-moi pour choisir ton compagnon)</small>';
  return `
    <div class="buddy">
      <button class="buddy-btn" data-act="buddy" aria-label="Changer de compagnon">${mascotSVG(state.mascot, mood)}</button>
      <div class="bubble"><span class="from">${esc(from)}</span>${text}${extra}</div>
    </div>`;
}

function chooseBuddy() {
  const themes = [
    ['sakura', 'Sakura', 'linear-gradient(120deg,#ffd6e7,#e9dcff)'],
    ['lavande', 'Lavande', 'linear-gradient(120deg,#e3dbff,#d6f0ff)'],
    ['menthe', 'Menthe', 'linear-gradient(120deg,#d3f5ea,#fff0c9)'],
    ['nuit', 'Nuit', 'linear-gradient(120deg,#2c2550,#3d2a55)'],
  ];
  const draw = () => `
    <h3>Mon compagnon</h3>
    <div class="pick-grid">${Object.keys(MASCOTS).map(k =>
      `<button data-mascot="${k}" class="${state.mascot === k ? 'on' : ''}">${mascotSVG(k, 'contente')}${MASCOTS[k].name}</button>`).join('')}</div>
    <label class="f">Mes couleurs</label>
    <div class="pick-grid">${themes.map(([k, n, g]) =>
      `<button data-theme-pick="${k}" class="${state.theme === k ? 'on' : ''}"><span class="swatch" style="background:${g}"></span>${n}</button>`).join('')}</div>
    <div class="actions"><button class="btn" data-m="close">C'est parfait !</button></div>`;
  openModal(draw(), {
    redraw() { modal.innerHTML = draw(); },
  });
}

function propose(type) {
  const list = type === 'tache' ? EMOJIS_TACHES : EMOJIS_RECOMPENSES;
  openModal(`
    <h3>💡 ${type === 'tache' ? 'Proposer une mission' : 'Proposer une récompense'}</h3>
    <p class="hint">${type === 'tache' ? 'Une chose que tu veux faire chaque jour.' : 'Ce qui te ferait plaisir.'} Ton parent choisira les points.</p>
    <label class="f">Image</label>
    ${emojiPicker(list, list[0])}
    <label class="f" for="fTitle">Ton idée</label>
    <input type="text" id="fTitle" maxlength="40" placeholder="${type === 'tache' ? 'ex. Lire 20 minutes' : 'ex. Faire des crêpes ensemble'}">
    <div class="actions">
      <button class="btn gris" data-m="close">Annuler</button>
      <button class="btn vert" data-m="ok">Envoyer</button>
    </div>`, {
    ok() {
      const title = $('#fTitle').value.trim();
      if (!title) { $('#fTitle').focus(); return; }
      state.proposals.push({ id: uid(), type, title, emoji: pickedEmoji(list[0]), status: 'attente', at: Date.now() });
      save(); closeModal();
      toast('Idée envoyée à ton parent 💡');
      render();
    },
  });
}

function isDone(taskId, d) {
  const c = checkFor(taskId, d);
  return !!c && c.status !== 'refuse';
}

// Crée ou retire le bonus du jour selon que tout est coché. Renvoie true s'il vient d'être créé.
function syncBonus() {
  const d = today();
  const tasks = state.tasks.filter(t => t.active);
  const complete = tasks.length > 0 && tasks.every(t => isDone(t.id, d));
  const b = checkFor(BONUS_ID, d);
  if (complete && state.bonus.enabled && !b) {
    state.checks.push({
      id: uid(), taskId: BONUS_ID, date: d, at: Date.now(),
      title: 'Journée complète', emoji: '🌟', points: state.bonus.points, status: 'attente',
    });
    return true;
  }
  if ((!complete || !state.bonus.enabled) && b && b.status === 'attente') {
    state.checks = state.checks.filter(x => x !== b);
  }
  return false;
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  const d = today();
  const c = checkFor(id, d);
  if (!c) {
    state.checks.push({
      id: uid(), taskId: t.id, date: d, at: Date.now(),
      title: t.title, emoji: t.emoji,
      points: t.family ? 0 : t.points,
      status: t.family ? 'fait' : 'attente',
    });
    toast(t.family ? 'Merci, ça aide toute la famille 💙' : 'Bien joué ! Ton parent va valider ⏳');
  } else if (c.status === 'valide') {
    toast('Déjà validée par ton parent 👍');
    return;
  } else if (c.status === 'refuse') {
    c.status = 'attente';
    c.at = Date.now();
    toast('C\'est noté, ton parent va revérifier ⏳');
  } else {
    state.checks = state.checks.filter(x => x !== c); // décocher
  }
  if (syncBonus()) {
    confetti();
    toast('Journée complète ! +' + state.bonus.points + ' bonus en attente 🌟');
  }
  save();
  render();
}

/* ---------- Côté enfant : Magasin ---------- */

function renderMagasin() {
  const rewards = state.rewards.filter(r => r.active);
  const avail = pointsAvailable();
  let html = '<h2>La boutique</h2><p class="sub">Échange tes points. Ton parent confirme l\'échange.</p>';

  if (!rewards.length) {
    html += '<div class="empty"><span class="big">🛍️</span>Le magasin est vide pour l\'instant.</div>';
  } else {
    html += '<div class="list">';
    for (const r of rewards) {
      const ok = avail >= r.cost;
      const missing = r.cost - avail;
      html += `
        <div class="reward">
          <span class="emoji">${esc(r.emoji)}</span>
          <span class="label">${esc(r.title)}<span class="cost">${r.cost} ⭐</span></span>
          <button class="btn petit" data-act="buy" data-id="${r.id}" ${ok ? '' : 'disabled'}>${ok ? 'Échanger' : 'Encore ' + missing}</button>
        </div>`;
    }
    html += '</div>';
  }

  html += proposeBtn('recompense');
  const pend = pendingRequests();
  const recent = state.requests.filter(r => r.status !== 'attente').sort((a, b) => b.at - a.at).slice(0, 5);
  if (pend.length || recent.length) {
    html += '<h2>Mes demandes</h2><div class="list">';
    for (const r of pend) {
      html += `
        <div class="item">
          <span class="emoji">${esc(r.emoji)}</span>
          <span class="label">${esc(r.title)}<small>⏳ En attente · ${r.cost} points réservés</small></span>
          <button class="btn gris petit" data-act="cancel-req" data-id="${r.id}">Annuler</button>
        </div>`;
    }
    for (const r of recent) {
      html += `
        <div class="item">
          <span class="emoji">${esc(r.emoji)}</span>
          <span class="label">${esc(r.title)}<small>${r.status === 'accepte' ? '✅ Acceptée' : '❌ Pas cette fois'}</small></span>
        </div>`;
    }
    html += '</div>';
  }
  view.innerHTML = html;
}

function buyReward(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r || pointsAvailable() < r.cost) return;
  openModal(`
    <h3>${esc(r.emoji)} ${esc(r.title)}</h3>
    <p>Tu veux échanger <b>${r.cost} points</b> ? Ton parent devra confirmer.</p>
    <div class="actions">
      <button class="btn gris" data-m="close">Non</button>
      <button class="btn vert" data-m="ok">Oui, je demande !</button>
    </div>`, {
    ok() {
      state.requests.push({ id: uid(), rewardId: r.id, title: r.title, emoji: r.emoji, cost: r.cost, status: 'attente', at: Date.now() });
      save();
      closeModal();
      toast('Demande envoyée à ton parent 🎁');
      render();
    },
  });
}

function cancelRequest(id) {
  state.requests = state.requests.filter(r => !(r.id === id && r.status === 'attente'));
  save();
  render();
}

/* ---------- Code PIN ---------- */

async function hashPin(pin, salt) {
  const data = salt + ':' + pin;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Repli si la page n'est pas en HTTPS (crypto.subtle indisponible).
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'f' + (h >>> 0).toString(16);
}

let pinBuffer = '';
let pinFirst = null; // pour la confirmation lors de la création
let pinMode = 'enter'; // 'enter' | 'create' | 'confirm' | 'change'
let pinFails = 0;
let pinLockedUntil = 0;

function renderPin() {
  if (!state.pin && pinMode === 'enter') pinMode = 'create';
  const titles = {
    enter: 'Espace parent',
    create: 'Crée ton code parent',
    confirm: 'Confirme le code',
    change: 'Nouveau code parent',
  };
  const subs = {
    enter: 'Tape ton code à 4 chiffres',
    create: '4 chiffres, à garder secret 🤫',
    confirm: 'Tape le même code une 2ᵉ fois',
    change: '4 chiffres',
  };
  const dots = [0, 1, 2, 3].map(i => `<span class="${i < pinBuffer.length ? 'on' : ''}"></span>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    .map(k => k === '' ? '<span></span>' : `<button data-act="pin" data-k="${k}" aria-label="${k === '⌫' ? 'effacer' : k}">${k}</button>`).join('');
  view.innerHTML = `
    <div class="pin-box">
      <div class="lock">🔒</div>
      <h2>${titles[pinMode]}</h2>
      <p class="sub">${subs[pinMode]}</p>
      <div class="pin-dots" id="pinDots">${dots}</div>
      <div class="pad">${keys}</div>
      <div class="pin-msg" id="pinMsg"></div>
    </div>`;
}

function pinMessage(msg, shake) {
  const m = $('#pinMsg');
  if (m) m.textContent = msg;
  if (shake) {
    const d = $('#pinDots');
    if (d) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
  }
}

async function pinKey(k) {
  if (Date.now() < pinLockedUntil) {
    pinMessage('Trop d\'essais. Attends ' + Math.ceil((pinLockedUntil - Date.now()) / 1000) + ' s.');
    return;
  }
  if (k === '⌫') pinBuffer = pinBuffer.slice(0, -1);
  else if (pinBuffer.length < 4) pinBuffer += k;
  renderPin();
  if (pinBuffer.length < 4) return;

  const code = pinBuffer;
  pinBuffer = '';

  if (pinMode === 'create' || pinMode === 'change') {
    pinFirst = code;
    pinMode = 'confirm';
    renderPin();
    return;
  }
  if (pinMode === 'confirm') {
    if (code !== pinFirst) {
      pinFirst = null;
      pinMode = state.pin ? 'change' : 'create';
      renderPin();
      pinMessage('Les deux codes sont différents, recommence.', true);
      return;
    }
    const salt = uid();
    state.pin = { salt, hash: await hashPin(code, salt) };
    save();
    pinFirst = null;
    pinMode = 'enter';
    parentUnlocked = true;
    toast('Code parent enregistré 🔐');
    render();
    return;
  }
  // pinMode === 'enter'
  const h = await hashPin(code, state.pin.salt);
  if (h === state.pin.hash) {
    pinFails = 0;
    parentUnlocked = true;
    render();
  } else {
    pinFails++;
    renderPin();
    if (pinFails >= 3) {
      pinLockedUntil = Date.now() + 30000;
      pinFails = 0;
      pinMessage('Code incorrect. Attends 30 secondes.', true);
    } else {
      pinMessage('Code incorrect.', true);
    }
  }
}

/* ---------- Côté parent ---------- */

function renderParent() {
  if (!parentUnlocked) { renderPin(); return; }

  const nb = pendingChecks().length + pendingRequests().length + pendingProposals().length;
  const sub = (id, label, n) =>
    `<button class="subtab ${parentTab === id ? 'on' : ''}" data-act="ptab" data-id="${id}">${label}${n ? `<span class="n">${n}</span>` : ''}</button>`;
  let html = `
    <div class="subtabs">
      ${sub('valider', '✅ À valider', nb)}
      ${sub('taches', '📋 Tâches')}
      ${sub('recompenses', '🎁 Récompenses')}
      ${sub('reglages', '⚙️ Réglages')}
    </div>`;

  if (parentTab === 'valider') html += parentValider();
  else if (parentTab === 'taches') html += parentTaches();
  else if (parentTab === 'recompenses') html += parentRecompenses();
  else html += parentReglages();

  html += '<p style="margin-top:20px"><button class="btn gris large" data-act="lock">🔒 Verrouiller</button></p>';
  view.innerHTML = html;
}

function parentValider() {
  const checks = pendingChecks();
  const reqs = pendingRequests();
  let html = '<h2>Tâches cochées</h2>';
  if (!checks.length) {
    html += '<div class="empty"><span class="big">👌</span>Rien à valider.</div>';
  } else {
    if (checks.length > 1) html += `<p><button class="btn vert large" data-act="validate-all">Tout valider (${checks.length})</button></p>`;
    html += '<div class="list">';
    for (const c of checks) {
      html += `
        <div class="item">
          <span class="emoji">${esc(c.emoji)}</span>
          <span class="label">${esc(c.title)}<small>+${c.points} pts · ${esc(dateLabel(c.date))}</small></span>
          <button class="btn rouge petit" data-act="refuse" data-id="${c.id}" aria-label="Pas encore">✗</button>
          <button class="btn vert petit" data-act="validate" data-id="${c.id}" aria-label="Valider">✓</button>
        </div>`;
    }
    html += '</div>';
  }

  html += '<h2>Demandes de récompense</h2>';
  if (!reqs.length) {
    html += '<div class="empty"><span class="big">🎁</span>Aucune demande.</div>';
  } else {
    html += '<div class="list">';
    for (const r of reqs) {
      html += `
        <div class="item">
          <span class="emoji">${esc(r.emoji)}</span>
          <span class="label">${esc(r.title)}<small>${r.cost} pts · ${esc(dateLabel(dateOf(r.at)))}</small></span>
          <button class="btn rouge petit" data-act="req-refuse" data-id="${r.id}" aria-label="Refuser">✗</button>
          <button class="btn vert petit" data-act="req-accept" data-id="${r.id}" aria-label="Accepter">✓</button>
        </div>`;
    }
    html += '</div>';
  }
  const props = pendingProposals();
  if (props.length) {
    html += `<h2>Ses idées</h2><div class="list">`;
    for (const p of props) {
      html += `
        <div class="item">
          <span class="emoji">${esc(p.emoji)}</span>
          <span class="label">${esc(p.title)}<small>${p.type === 'tache' ? 'Mission proposée' : 'Récompense proposée'}</small></span>
          <button class="btn rouge petit" data-act="prop-refuse" data-id="${p.id}" aria-label="Refuser">✗</button>
          <button class="btn vert petit" data-act="prop-accept" data-id="${p.id}">Ajouter</button>
        </div>`;
    }
    html += '</div>';
  }
  html += `<p class="sub" style="margin-top:14px">Solde actuel : <b>${state.balance} pts</b>${pointsReserved() ? ` (dont ${pointsReserved()} réservés)` : ''}</p>`;
  return html;
}

function dateOf(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function validateCheck(id) {
  const c = state.checks.find(x => x.id === id && x.status === 'attente');
  if (!c) return;
  c.status = 'valide';
  state.balance += c.points;
}

function parentTaches() {
  let html = '<h2>Les missions du jour</h2><p class="sub">Elles reviennent chaque jour, rangées automatiquement : en famille d\'abord, puis de la plus à la moins payée.</p><div class="list">';
  for (const t of sortedTasks()) {
    html += `
      <div class="item ${t.active ? '' : 'off'}">
        <span class="emoji">${esc(t.emoji)}</span>
        <span class="label">${esc(t.title)}<small>${t.family ? 'En famille · sans points' : t.points + ' pts'}${t.active ? '' : ' · en pause'}</small></span>
        <button class="btn gris petit" data-act="edit-task" data-id="${t.id}">Modifier</button>
      </div>`;
  }
  html += '</div><p><button class="btn large" data-act="edit-task" data-id="">＋ Ajouter une tâche</button></p>';
  return html;
}

function parentRecompenses() {
  let html = '<h2>La boutique</h2><p class="tip">💡 Les moments partagés (jeu, sortie, cuisine ensemble) motivent plus durablement que les objets.</p><div class="list">';
  for (const r of state.rewards) {
    html += `
      <div class="item ${r.active ? '' : 'off'}">
        <span class="emoji">${esc(r.emoji)}</span>
        <span class="label">${esc(r.title)}<small>${r.cost} pts${r.active ? '' : ' · cachée'}</small></span>
        <button class="btn gris petit" data-act="edit-reward" data-id="${r.id}">Modifier</button>
      </div>`;
  }
  html += '</div><p><button class="btn large" data-act="edit-reward" data-id="">＋ Ajouter une récompense</button></p>';
  return html;
}

function parentReglages() {
  return backupHTML() + calcSettingsHTML() + `
    <div class="card">
      <b>🌟 Bonus journée complète</b>
      <p class="hint">Quand toutes les tâches du jour sont cochées, y compris en famille, un bonus arrive dans « À valider ». Garde-le petit.</p>
      <label class="switch"><input type="checkbox" id="bonusOn" ${state.bonus.enabled ? 'checked' : ''}> Activé</label>
      <div class="row" style="margin-top:10px;flex-wrap:nowrap">
        <input type="number" id="bonusPts" min="1" max="50" inputmode="numeric" value="${state.bonus.points}">
        <button class="btn petit" data-act="save-bonus">OK</button>
      </div>
    </div>
    <div class="card">
      <label class="f" for="childName">Prénom affiché</label>
      <div class="row" style="flex-wrap:nowrap">
        <input type="text" id="childName" maxlength="20" value="${esc(state.childName)}" placeholder="Prénom">
        <button class="btn petit" data-act="save-name">OK</button>
      </div>
    </div>
    <div class="card">
      <b>Points</b>
      <p class="hint">Solde : ${state.balance} pts. Pour corriger une erreur ou donner un bonus.</p>
      <div class="row" style="margin-top:10px;flex-wrap:nowrap">
        <input type="number" id="adjust" inputmode="numeric" placeholder="ex. 10 ou -5">
        <button class="btn petit" data-act="adjust">Appliquer</button>
      </div>
    </div>
    <div class="card">
      <b>Code parent</b>
      <p class="hint">Si tu l'oublies, il faudra effacer les données de l'app dans Chrome (tout sera perdu).</p>
      <p><button class="btn gris" data-act="change-pin">Changer le code</button></p>
    </div>
    <p class="hint" style="text-align:center">Version ${APP_VERSION}</p>`;
}

/* ---------- Formulaires (modale) ---------- */

let modalHandlers = {};
function openModal(html, handlers) {
  modal.innerHTML = html;
  modalHandlers = handlers || {};
  modal.showModal();
}
function closeModal() { if (modal.open) modal.close(); }

modal.addEventListener('click', e => {
  if (e.target === modal) { closeModal(); return; } // clic à côté
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    modal.querySelectorAll('[data-chip]').forEach(b => b.classList.toggle('on', b === chip));
    const ta = modal.querySelector('#fMsg');
    if (ta) ta.value = chip.dataset.chip;
    return;
  }
  const mas = e.target.closest('[data-mascot]');
  if (mas) {
    state.mascot = mas.dataset.mascot; state.mascotChosen = true;
    save(); render(); modalHandlers.redraw();
    return;
  }
  const th = e.target.closest('[data-theme-pick]');
  if (th) {
    state.theme = th.dataset.themePick; state.mascotChosen = true;
    document.body.dataset.theme = state.theme;
    save(); render(); modalHandlers.redraw();
    return;
  }
  const pick = e.target.closest('[data-emoji]');
  if (pick) {
    modal.querySelectorAll('[data-emoji]').forEach(b => b.classList.toggle('on', b === pick));
    return;
  }
  const b = e.target.closest('[data-m]');
  if (!b) return;
  if (b.dataset.m === 'close') closeModal();
  else if (modalHandlers[b.dataset.m]) modalHandlers[b.dataset.m]();
});

function emojiPicker(list, current) {
  const all = list.includes(current) ? list : [current, ...list];
  return '<div class="emojis">' + all.map(e => `<button type="button" data-emoji="${esc(e)}" class="${e === current ? 'on' : ''}">${esc(e)}</button>`).join('') + '</div>';
}
function pickedEmoji(fallback) {
  const on = modal.querySelector('[data-emoji].on');
  return on ? on.dataset.emoji : fallback;
}

function editTask(id, prefill, onSaved) {
  const t = state.tasks.find(x => x.id === id) || Object.assign({ id: '', emoji: EMOJIS_TACHES[0], title: '', points: 10, family: false, active: true }, prefill);
  openModal(`
    <h3>${t.id ? 'Modifier la tâche' : 'Nouvelle tâche'}</h3>
    <label class="f">Image</label>
    ${emojiPicker(EMOJIS_TACHES, t.emoji)}
    <label class="f" for="fTitle">Nom</label>
    <input type="text" id="fTitle" maxlength="40" value="${esc(t.title)}" placeholder="ex. Ranger mes jouets">
    <label class="switch"><input type="checkbox" id="fFamily" ${t.family ? 'checked' : ''}> Tâche de famille (sans points)</label>
    <p class="hint">Elle se coche simplement, sans validation ni points.</p>
    <div id="pointsWrap" ${t.family ? 'hidden' : ''}>
      <label class="f" for="fPoints">Points</label>
      <input type="number" id="fPoints" min="1" max="999" inputmode="numeric" value="${t.points || 10}">
    </div>
    <label class="switch"><input type="checkbox" id="fActive" ${t.active ? 'checked' : ''}> Visible chaque jour</label>
    <div class="actions">
      ${t.id ? '<button class="btn rouge" data-m="del">Supprimer</button>' : ''}
      <button class="btn gris" data-m="close">Annuler</button>
      <button class="btn vert" data-m="ok">Enregistrer</button>
    </div>`, {
    ok() {
      const title = $('#fTitle').value.trim();
      if (!title) { $('#fTitle').focus(); return; }
      const family = $('#fFamily').checked;
      const points = Math.max(1, Math.min(999, parseInt($('#fPoints').value, 10) || 1));
      const data = { emoji: pickedEmoji(t.emoji), title, family, points: family ? 0 : points, active: $('#fActive').checked };
      if (t.id) Object.assign(state.tasks.find(x => x.id === t.id), data);
      else state.tasks.push(Object.assign({ id: uid() }, data));
      if (onSaved) onSaved();
      syncBonus();
      save(); closeModal(); render();
    },
    del() {
      if (!confirm('Supprimer « ' + t.title + ' » ?')) return;
      state.tasks = state.tasks.filter(x => x.id !== t.id);
      save(); closeModal(); render();
    },
  });
  $('#fFamily').addEventListener('change', e => { $('#pointsWrap').hidden = e.target.checked; });
}

function editReward(id, prefill, onSaved) {
  const r = state.rewards.find(x => x.id === id) || Object.assign({ id: '', emoji: EMOJIS_RECOMPENSES[0], title: '', cost: 30, active: true }, prefill);
  openModal(`
    <h3>${r.id ? 'Modifier la récompense' : 'Nouvelle récompense'}</h3>
    <label class="f">Image</label>
    ${emojiPicker(EMOJIS_RECOMPENSES, r.emoji)}
    <label class="f" for="fTitle">Nom</label>
    <input type="text" id="fTitle" maxlength="40" value="${esc(r.title)}" placeholder="ex. 30 min de jeu vidéo">
    <label class="f" for="fCost">Prix en points</label>
    <input type="number" id="fCost" min="1" max="9999" inputmode="numeric" value="${r.cost}">
    <label class="switch"><input type="checkbox" id="fActive" ${r.active ? 'checked' : ''}> Visible dans le magasin</label>
    <div class="actions">
      ${r.id ? '<button class="btn rouge" data-m="del">Supprimer</button>' : ''}
      <button class="btn gris" data-m="close">Annuler</button>
      <button class="btn vert" data-m="ok">Enregistrer</button>
    </div>`, {
    ok() {
      const title = $('#fTitle').value.trim();
      if (!title) { $('#fTitle').focus(); return; }
      const cost = Math.max(1, Math.min(9999, parseInt($('#fCost').value, 10) || 1));
      const data = { emoji: pickedEmoji(r.emoji), title, cost, active: $('#fActive').checked };
      if (r.id) Object.assign(state.rewards.find(x => x.id === r.id), data);
      else state.rewards.push(Object.assign({ id: uid() }, data));
      if (onSaved) onSaved();
      syncBonus();
      save(); closeModal(); render();
    },
    del() {
      if (!confirm('Supprimer « ' + r.title + ' » ?')) return;
      state.rewards = state.rewards.filter(x => x.id !== r.id);
      save(); closeModal(); render();
    },
  });
}

/* ---------- Sauvegarde ---------- */

function backupHTML() {
  return `
    <div class="card">
      <b>💾 Sauvegarde</b>
      <p class="hint">Télécharge un fichier avec toutes les données (tâches, points, réglages, code). À faire avant de réinstaller l'app ou de changer de téléphone. Garde-le pour toi : il contient ses données.</p>
      <div class="row" style="margin-top:10px">
        <button class="btn petit" data-act="backup">Télécharger une sauvegarde</button>
        <button class="btn gris petit" data-act="restore">Restaurer</button>
      </div>
      <input type="file" id="restoreFile" accept=".json,application/json" hidden>
    </div>`;
}

function downloadBackup() {
  const data = JSON.stringify({ app: 'ganba', savedAt: new Date().toISOString(), state }, null, 1);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ganba-sauvegarde-' + today() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Sauvegarde téléchargée 💾');
}

document.addEventListener('change', e => {
  if (e.target.id !== 'restoreFile' || !e.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const s = parsed && parsed.app === 'ganba' ? parsed.state : null;
      if (!s || !Array.isArray(s.tasks) || !Array.isArray(s.rewards) || typeof s.balance !== 'number') throw new Error('format');
      if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
      state = Object.assign(defaultState(), s);
      document.body.dataset.theme = state.theme;
      save();
      toast('Sauvegarde restaurée ✅');
      render();
    } catch (err) {
      toast('⚠️ Ce fichier n\'est pas une sauvegarde Ganba!');
    }
  };
  reader.readAsText(e.target.files[0]);
  e.target.value = '';
});

/* ---------- Petit mot du parent ---------- */

// Féliciter l'effort et l'organisation plutôt que « tu es intelligente ».
const PRAISES = [
  'Tu t\'es organisée toute seule, bravo !',
  'J\'ai vu tes efforts, merci 💜',
  'Tu n\'as rien lâché, quelle persévérance ! 💪',
  'Merci, ça aide toute la famille 🏡',
  'Tu progresses de jour en jour 🌱',
];

function askPraise(onValidate) {
  openModal(`
    <h3>Un petit mot ? 💌</h3>
    <p class="hint">Il s'affichera sur son écran. Féliciter l'effort motive plus que les points.</p>
    <div class="chips" style="margin-top:10px">${PRAISES.map(p => `<button type="button" data-chip="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <label class="f" for="fMsg">Ton message</label>
    <textarea id="fMsg" maxlength="140" placeholder="Écris ce que tu veux…"></textarea>
    <div class="actions">
      <button class="btn gris" data-m="skip">Valider sans mot</button>
      <button class="btn vert" data-m="ok">Valider ✓</button>
    </div>`, {
    ok() { const m = $('#fMsg').value.trim(); closeModal(); onValidate(m); save(); confetti(); render(); },
    skip() { closeModal(); onValidate(''); save(); confetti(); render(); },
  });
}

function addMessage(text) {
  if (text) state.messages.push({ id: uid(), text: text.slice(0, 140), at: Date.now(), seen: false });
}

/* ---------- Actions (délégation des clics) ---------- */

view.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.act) {
    case 'toggle': toggleTask(id); break;
    case 'buy': buyReward(id); break;
    case 'cancel-req': cancelRequest(id); break;
    case 'pin': pinKey(b.dataset.k); break;
    case 'ptab': parentTab = id; render(); break;
    case 'lock': setTab('jour'); break;
    case 'validate':
      askPraise(msg => { validateCheck(id); addMessage(msg); }); break;
    case 'validate-all':
      askPraise(msg => { pendingChecks().forEach(c => validateCheck(c.id)); addMessage(msg); }); break;
    case 'buddy': chooseBuddy(); break;
    case 'msg-seen': {
      const m = state.messages.find(x => x.id === id);
      if (m) m.seen = true;
      save(); render(); break;
    }
    case 'propose': propose(id); break;
    case 'prop-accept': {
      const p = state.proposals.find(x => x.id === id);
      if (!p) break;
      const done = () => { p.status = 'accepte'; addMessage('Ton idée « ' + p.title + ' » est ajoutée, merci ! 💡'); };
      if (p.type === 'tache') editTask('', { title: p.title, emoji: p.emoji }, done);
      else editReward('', { title: p.title, emoji: p.emoji }, done);
      break;
    }
    case 'prop-refuse': {
      const p = state.proposals.find(x => x.id === id);
      if (p) p.status = 'refuse';
      save(); render(); break;
    }
    case 'refuse': {
      const c = state.checks.find(x => x.id === id);
      if (c) c.status = 'refuse';
      if (c && c.taskId !== BONUS_ID) syncBonus();
      save(); render(); break;
    }
    case 'req-accept': {
      const r = state.requests.find(x => x.id === id && x.status === 'attente');
      if (r) {
        if (state.balance < r.cost) { toast('Pas assez de points'); break; }
        r.status = 'accepte';
        state.balance -= r.cost;
        save(); confetti(); render();
      }
      break;
    }
    case 'req-refuse': {
      const r = state.requests.find(x => x.id === id);
      if (r) r.status = 'refuse';
      save(); render(); break;
    }
    case 'edit-task': editTask(id); break;
    case 'edit-reward': editReward(id); break;
    case 'save-name':
      state.childName = $('#childName').value.trim().slice(0, 20);
      save(); toast('Prénom enregistré'); render(); break;
    case 'game-start': startGame(); break;
    case 'game-key': gameKey(b.dataset.k); break;
    case 'game-close': game = null; render(); window.scrollTo(0, 0); break;
    case 'save-calc':
      state.calc.enabled = $('#calcOn').checked;
      state.calc.points = Math.max(1, Math.min(50, parseInt($('#calcPts').value, 10) || 10));
      state.calc.level = Math.max(1, Math.min(6, parseInt($('#calcLevel').value, 10) || 2));
      save(); toast('Calcul mental enregistré'); render(); break;
    case 'backup': downloadBackup(); break;
    case 'restore': $('#restoreFile').click(); break;
    case 'save-bonus':
      state.bonus = { enabled: $('#bonusOn').checked, points: Math.max(1, Math.min(50, parseInt($('#bonusPts').value, 10) || 5)) };
      syncBonus(); save(); toast('Bonus enregistré'); render(); break;
    case 'adjust': {
      const n = parseInt($('#adjust').value, 10);
      if (!n) break;
      state.balance = Math.max(0, state.balance + n);
      save(); toast((n > 0 ? '+' : '') + n + ' points'); render(); break;
    }
    case 'change-pin':
      pinMode = 'change'; pinBuffer = ''; parentUnlocked = false; renderParentPinOnly(); break;
  }
});

function renderParentPinOnly() {
  renderHeader();
  renderPin();
}

/* ---------- Démarrage ---------- */

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker non enregistré', err));
  });
}
