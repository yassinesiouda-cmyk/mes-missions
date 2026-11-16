/* Entraînement de calcul mental. Récompense l'effort (séance terminée), pas le score.
   Une seule séance rapporte des points par jour ; le parent valide et voit le score.
   La difficulté s'adapte : niveau +1 si très bon score, -1 si trop difficile. */
'use strict';

const CALC_ID = '__calcul__';
const CALC_QUESTIONS = 15;
const CALC_LEVELS = {
  1: 'Additions et soustractions jusqu\'à 100, tables de 2, 5 et 10',
  2: 'Toutes les tables, additions et soustractions jusqu\'à 100',
  3: 'Tables et divisions, calculs avec des dizaines jusqu\'à 1000',
  4: '× et ÷ par 10, 100, 1000, doubles et moitiés',
  5: 'Multiplications (ex. 23 × 4) et divisions (ex. 84 ÷ 4)',
  6: 'Compléments à 100 et 1000, × 11 et × 25',
};

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function genQuestion(level) {
  const q = (text, answer) => ({ text, answer });
  const addSub100 = () => {
    if (Math.random() < 0.5) { const a = rnd(11, 89), b = rnd(5, 99 - a); return q(`${a} + ${b}`, a + b); }
    const a = rnd(20, 99), b = rnd(5, a - 5); return q(`${a} − ${b}`, a - b);
  };
  const table = list => { const a = pickOne(list), b = rnd(2, 10); return Math.random() < 0.5 ? q(`${a} × ${b}`, a * b) : q(`${b} × ${a}`, a * b); };
  const divTable = () => { const a = rnd(2, 10), b = rnd(2, 10); return q(`${a * b} ÷ ${a}`, b); };
  const tens1000 = () => {
    if (Math.random() < 0.5) { const a = rnd(10, 70) * 10, b = rnd(5, 99 - a / 10) * 10; return q(`${a} + ${b}`, a + b); }
    const a = rnd(30, 99) * 10, b = rnd(5, a / 10 - 5) * 10; return q(`${a} − ${b}`, a - b);
  };
  const pow10 = () => {
    const p = pickOne([10, 100, 1000]);
    if (Math.random() < 0.5) { const n = rnd(2, p === 1000 ? 99 : 999); return q(`${n} × ${p}`, n * p); }
    const n = rnd(2, 99); return q(`${n * p} ÷ ${p}`, n);
  };
  const doubleHalf = () => {
    if (Math.random() < 0.5) { const n = rnd(12, 250); return q(`Le double de ${n}`, n * 2); }
    const n = rnd(6, 250) * 2; return q(`La moitié de ${n}`, n / 2);
  };
  const mul2x1 = () => { const a = rnd(12, 49), b = rnd(2, 9); return q(`${a} × ${b}`, a * b); };
  const div2x1 = () => { const b = rnd(2, 9), r = rnd(11, Math.floor(200 / b)); return q(`${b * r} ÷ ${b}`, r); };
  const complement = () => {
    if (Math.random() < 0.5) { const a = rnd(11, 89); return q(`${a} + ? = 100`, 100 - a); }
    const a = rnd(11, 199) * 5; return q(`${a} + ? = 1000`, 1000 - a);
  };
  const special = () => {
    if (Math.random() < 0.5) { const n = rnd(2, 20); return q(`${n} × 25`, n * 25); }
    const n = rnd(12, 45); return q(`${n} × 11`, n * 11);
  };

  const pools = {
    1: [addSub100, () => table([2, 5, 10])],
    2: [addSub100, () => table([2, 3, 4, 5, 6, 7, 8, 9, 10])],
    3: [() => table([3, 4, 6, 7, 8, 9]), divTable, tens1000],
    4: [pow10, doubleHalf, divTable, tens1000],
    5: [mul2x1, div2x1, () => table([6, 7, 8, 9]), pow10],
    6: [complement, special, mul2x1, div2x1],
  };
  return pickOne(pools[level] || pools[2])();
}

/* ---------- Partie en cours (en mémoire, pas enregistrée) ---------- */

let game = null;

function startGame() {
  const level = state.calc.level;
  const seen = new Set();
  const questions = [];
  let guard = 0;
  while (questions.length < CALC_QUESTIONS && guard++ < 500) {
    const qq = genQuestion(level);
    if (seen.has(qq.text)) continue;
    seen.add(qq.text);
    questions.push(qq);
  }
  game = { level, questions, i: 0, input: '', good: 0, start: Date.now(), feedback: null, mood: 'calme', done: false };
  render();
  window.scrollTo(0, 0);
}

function calcTodayCheck() {
  return state.checks.find(c => c.taskId === CALC_ID && c.date === today());
}

function calcCardHTML() {
  if (!state.calc.enabled) return '';
  const c = calcTodayCheck();
  let status;
  if (c && c.status === 'valide') status = `<span class="pill">✓ Fait · +${c.points} gagnés</span>`;
  else if (c && c.status === 'attente') status = `<span class="pill attente">✓ Fait · +${c.points} en attente</span>`;
  else status = `<span class="pill">+${state.calc.points} ⭐ · 15 questions</span>`;
  return `
    <h2>Mon entraînement</h2>
    <button class="task calc-card ${c ? 'fait' : ''}" data-act="game-start">
      <span class="emoji">🧠</span>
      <span class="label">Calcul mental · niveau ${state.calc.level}<span class="meta">${status}</span></span>
      <span class="check">${c ? '✓' : '▶'}</span>
    </button>`;
}

function renderGame() {
  const g = game;
  if (g.done) {
    const c = calcTodayCheck();
    const fresh = c && c.at >= g.start;
    const msg = g.good >= 13 ? 'Excellent ! Tu passes au niveau supérieur 🚀'
      : g.good >= 8 ? 'Bien joué, tu t\'es bien entraînée 💪'
      : 'Ce niveau était difficile, on reprend un peu plus facile 🌱';
    const mins = Math.max(1, Math.round((Date.now() - g.start) / 60000));
    view.innerHTML = `
      <div class="game-end">
        <div class="game-buddy">${mascotSVG(state.mascot, g.good >= 8 ? 'fiere' : 'contente')}</div>
        <h2>Séance terminée !</h2>
        <p class="score">${g.good} / ${g.questions.length}</p>
        <p class="sub">${msg}<br>${mins} min d'entraînement</p>
        <p class="sub">${fresh ? `⏳ <b>+${c.points} points</b> attendent la validation de ton parent.` : 'Séance bonus : les points du jour sont déjà comptés. Bravo pour l\'effort !'}</p>
        <p><button class="btn large" data-act="game-close">Retour à ma journée</button></p>
      </div>`;
    return;
  }
  const qq = g.questions[g.i];
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']
    .map(k => `<button data-act="game-key" data-k="${k}" class="${k === 'OK' ? 'ok' : ''}">${k}</button>`).join('');
  let fb = '';
  if (g.feedback === 'bon') fb = '<div class="fb bon">Bravo ! ✨</div>';
  else if (g.feedback) fb = `<div class="fb rate">C'était <b>${g.feedback}</b>, pas grave !</div>`;
  view.innerHTML = `
    <div class="game">
      <div class="game-top">
        <button class="btn gris petit" data-act="game-close">✕ Arrêter</button>
        <span class="game-count">${g.i + 1} / ${g.questions.length}</span>
      </div>
      <div class="bar"><div style="width:${Math.round((g.i / g.questions.length) * 100)}%"></div></div>
      <div class="game-q">
        <div class="game-buddy small">${mascotSVG(state.mascot, g.mood)}</div>
        <div class="question">${esc(qq.text.includes('?') ? qq.text : /^L/.test(qq.text) ? qq.text + ' ?' : qq.text + ' = ?')}</div>
      </div>
      <div class="answer">${g.input ? esc(g.input) : '<span class="ph">…</span>'}</div>
      ${fb}
      <div class="pad game-pad">${keys}</div>
    </div>`;
}

let gameLocked = false;
function gameKey(k) {
  const g = game;
  if (!g || g.done || gameLocked) return;
  if (k === '⌫') { g.input = g.input.slice(0, -1); g.feedback = null; renderGame(); return; }
  if (k !== 'OK') { if (g.input.length < 6) g.input += k; g.feedback = null; renderGame(); return; }
  if (!g.input) return;
  const ok = Number(g.input) === g.questions[g.i].answer;
  if (ok) { g.good++; g.feedback = 'bon'; g.mood = 'contente'; }
  else { g.feedback = String(g.questions[g.i].answer); g.mood = 'calme'; }
  renderGame();
  gameLocked = true;
  setTimeout(() => {
    gameLocked = false;
    if (game !== g) return;
    g.i++; g.input = ''; g.feedback = null;
    if (g.i >= g.questions.length) finishGame();
    else renderGame();
  }, ok ? 600 : 1600);
}

function finishGame() {
  const g = game;
  g.done = true;
  const score = g.good, total = g.questions.length;
  // Niveau suivant adapté au score.
  if (score >= 13) state.calc.level = Math.min(6, g.level + 1);
  else if (score <= 7) state.calc.level = Math.max(1, g.level - 1);
  state.calc.history.push({ date: today(), score, total, level: g.level, at: Date.now() });
  state.calc.history = state.calc.history.slice(-30);
  // Points : seulement pour la première séance du jour, à valider par le parent.
  if (!calcTodayCheck()) {
    state.checks.push({
      id: uid(), taskId: CALC_ID, date: today(), at: Date.now(),
      title: `Calcul mental · ${score}/${total} (niveau ${g.level})`, emoji: '🧠',
      points: state.calc.points, status: 'attente',
    });
  }
  save();
  if (score >= 8) confetti();
  render();
}

function calcSettingsHTML() {
  const hist = state.calc.history.slice(-7).reverse()
    .map(h => `<li>${esc(dateLabel(h.date))} : <b>${h.score}/${h.total}</b> (niveau ${h.level})</li>`).join('');
  const opts = Object.keys(CALC_LEVELS)
    .map(n => `<option value="${n}" ${state.calc.level == n ? 'selected' : ''}>${n}. ${esc(CALC_LEVELS[n])}</option>`).join('');
  return `
    <div class="card">
      <b>🧠 Calcul mental</b>
      <p class="hint">${CALC_QUESTIONS} questions. Les points récompensent la séance terminée, pas le score. Une seule séance rapporte des points par jour. Le niveau s'adapte tout seul.</p>
      <label class="switch"><input type="checkbox" id="calcOn" ${state.calc.enabled ? 'checked' : ''}> Activé</label>
      <label class="f" for="calcPts">Points par séance</label>
      <input type="number" id="calcPts" min="1" max="50" inputmode="numeric" value="${state.calc.points}">
      <label class="f" for="calcLevel">Niveau actuel</label>
      <select id="calcLevel">${opts}</select>
      <p style="margin-top:10px"><button class="btn petit" data-act="save-calc">Enregistrer</button></p>
      ${hist ? `<label class="f">Dernières séances</label><ul class="hist">${hist}</ul>` : ''}
    </div>`;
}
