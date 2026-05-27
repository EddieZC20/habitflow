/* ================================================================
   CONSTANTS
================================================================ */
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAY_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const STORAGE_KEY_HABITS  = 'hf_habits';
const STORAGE_KEY_CHECKS  = 'hf_checks';
const STORAGE_KEY_WEEK    = 'hf_week';
const STORAGE_KEY_HISTORY = 'hf_history';

const EMOJIS = [
  '💪','📚','🏋️','🧹','🪮','🚿','💻','🧘','🏃','🎯','✍️','🥗','💤','🎸','🧠',
  '🚫','❤️','🌿','☀️','🌙','⚡','🎨','🏊','🚴','🤸','🍎','💊','📝','🔥','⭐',
  '🌟','🧩','🎵','🕐','📖','🛏','🪥','💧','🧴','🏡','👟','🎓','🌈','🤝','🫀',
  '🧘‍♂️','🎯','📊','💡','🎭','🛡️','🌸','🍀'
];

const DEFAULT_HABITS = [
  { id: uid(), emoji: '🚫', name: 'No masturbarme' },
  { id: uid(), emoji: '📚', name: 'Leer un libro' },
  { id: uid(), emoji: '🏋️', name: 'Ir al gimnasio' },
  { id: uid(), emoji: '🧹', name: 'Arreglar mi cuarto' },
  { id: uid(), emoji: '🪮', name: 'Peinarme' },
  { id: uid(), emoji: '🚿', name: 'Bañarme' },
  { id: uid(), emoji: '💻', name: 'Avanzar en Udemy' },
];

/* ================================================================
   STATE
================================================================ */
let habits  = [];
let checks  = {}; // { habitId: { 0:bool, 1:bool, ... 6:bool } }
let weekKey = '';
let history = [];
let selectedEmoji = '⭐';
let editingHabitId = null;

/* ================================================================
   UTILITIES
================================================================ */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getMonday(d) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function formatDate(d) {
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' });
}

function getWeekKey(monday) {
  return monday.toISOString().slice(0, 10);
}

function getTodayDayIndex() {
  // 0=Mon … 6=Sun
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/* ================================================================
   STORAGE
================================================================ */
function load() {
  const storedHabits  = localStorage.getItem(STORAGE_KEY_HABITS);
  const storedChecks  = localStorage.getItem(STORAGE_KEY_CHECKS);
  const storedWeek    = localStorage.getItem(STORAGE_KEY_WEEK);
  const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);

  habits  = storedHabits  ? JSON.parse(storedHabits)  : DEFAULT_HABITS;
  history = storedHistory ? JSON.parse(storedHistory) : [];

  const monday = getMonday(new Date());
  weekKey = getWeekKey(monday);

  if (storedWeek !== weekKey) {
    // New week detected automatically
    if (storedChecks && storedWeek) {
      archiveWeek(storedWeek, JSON.parse(storedChecks));
    }
    checks = {};
    localStorage.setItem(STORAGE_KEY_WEEK, weekKey);
    save();
  } else {
    checks = storedChecks ? JSON.parse(storedChecks) : {};
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY_HABITS,  JSON.stringify(habits));
  localStorage.setItem(STORAGE_KEY_CHECKS,  JSON.stringify(checks));
  localStorage.setItem(STORAGE_KEY_WEEK,    weekKey);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

function archiveWeek(wKey, wChecks) {
  const total     = habits.length * 7;
  const completed = countChecked(wChecks);
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  history.unshift({ week: wKey, pct, completed, total });
  if (history.length > 12) history.pop();
  save();
}

/* ================================================================
   COUNT
================================================================ */
function countChecked(ch = checks) {
  let n = 0;
  for (const hid in ch) for (const d in ch[hid]) if (ch[hid][d]) n++;
  return n;
}

function countHabitChecked(habitId) {
  if (!checks[habitId]) return 0;
  return Object.values(checks[habitId]).filter(Boolean).length;
}

function totalPossible() { return habits.length * 7; }

/* ================================================================
   RENDER HEADER
================================================================ */
function renderHeader() {
  const monday = getMonday(new Date());
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  document.getElementById('weekRange').textContent =
    `${formatDate(monday)} – ${formatDate(sunday)}`;
}

/* ================================================================
   RENDER TABLE HEAD
================================================================ */
function renderTableHead() {
  const monday  = getMonday(new Date());
  const dates   = getWeekDates(monday);
  const todayI  = getTodayDayIndex();

  let html = '<tr>';
  html += '<th class="col-habit">Hábito</th>';
  dates.forEach((d, i) => {
    const isToday = (i === todayI);
    const dayNum  = d.getDate();
    html += `<th class="col-day${isToday ? ' is-today' : ''}">
      <span class="day-name">${DAYS[i]}</span>
      ${isToday
        ? `<span class="day-num"><span>${dayNum}</span></span>`
        : `<span class="day-num day-num-plain">${dayNum}</span>`
      }
    </th>`;
  });
  html += '</tr>';
  document.getElementById('tableHead').innerHTML = html;
}

/* ================================================================
   RENDER TABLE BODY
================================================================ */
function renderTableBody() {
  const todayI = getTodayDayIndex();
  const tbody  = document.getElementById('tableBody');

  if (habits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-icon">🌱</div>
      <p>No tienes hábitos aún.<br>Agrega tu primer hábito abajo.</p>
    </div></td></tr>`;
    return;
  }

  let html = '';
  habits.forEach(h => {
    const streak = countHabitChecked(h.id);
    html += `<tr data-habit-id="${h.id}">`;
    html += `<td>
      <div class="habit-row-name">
        <span class="habit-emoji">${h.emoji}</span>
        <span class="habit-name-text" id="name-${h.id}">${escHtml(h.name)}</span>
        ${streak > 0 ? `<span class="habit-streak" title="${streak} días esta semana">🔥${streak}</span>` : ''}
        <div class="habit-row-actions">
          <button class="habit-action-btn edit" data-habit-id="${h.id}" title="Editar" aria-label="Editar hábito ${escHtml(h.name)}">✏️</button>
          <button class="habit-action-btn delete" data-habit-id="${h.id}" title="Eliminar" aria-label="Eliminar hábito ${escHtml(h.name)}">🗑</button>
        </div>
      </div>
    </td>`;
    for (let d = 0; d < 7; d++) {
      const checked = checks[h.id]?.[d] ?? false;
      const isFuture = d > todayI;
      html += `<td class="check-cell${isFuture ? ' is-future' : ''}">
        <input
          type="checkbox"
          class="habit-checkbox"
          id="cb-${h.id}-${d}"
          data-habit="${h.id}"
          data-day="${d}"
          ${checked ? 'checked' : ''}
          aria-label="${escHtml(h.name)} – ${DAY_FULL[d]}"
        />
      </td>`;
    }
    html += '</tr>';
  });

  tbody.innerHTML = html;

  // Bind checkbox events
  tbody.querySelectorAll('.habit-checkbox').forEach(cb => {
    cb.addEventListener('change', onCheckChange);
  });

  // Bind edit/delete
  tbody.querySelectorAll('.habit-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => startEditHabit(btn.dataset.habitId));
  });
  tbody.querySelectorAll('.habit-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteHabit(btn.dataset.habitId));
  });

  document.getElementById('habitCountBadge').textContent = `${habits.length} hábito${habits.length !== 1 ? 's' : ''}`;
}

/* ================================================================
   CHECKBOX HANDLER
================================================================ */
function onCheckChange(e) {
  const hid = e.target.dataset.habit;
  const day = parseInt(e.target.dataset.day, 10);
  if (!checks[hid]) checks[hid] = {};
  checks[hid][day] = e.target.checked;
  save();
  updateProgress();
  updateAnalysis();
  updateStreaks();

  if (e.target.checked) {
    const total = totalPossible();
    const done  = countChecked();
    if (done === total && total > 0) {
      showConfetti();
      showToast('🎉 ¡Semana perfecta! ¡Eres increíble!', 'success');
    } else {
      showCheckPop(e.target);
    }
  }
}

/* ================================================================
   PROGRESS
================================================================ */
function updateProgress() {
  const total  = totalPossible();
  const done   = countChecked();
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
  const CIRC   = 289.02;

  document.getElementById('heroPercent').textContent  = `${pct}%`;
  document.getElementById('heroFraction').textContent = `${done} / ${total} hábitos completados`;
  document.getElementById('heroBar').style.width      = `${pct}%`;
  document.getElementById('ringText').textContent     = `${pct}%`;
  document.getElementById('ringArc').style.strokeDashoffset = CIRC - (CIRC * pct / 100);
}

/* ================================================================
   STREAKS (this week consecutive check per habit)
================================================================ */
function updateStreaks() {
  const todayI = getTodayDayIndex();
  const row    = document.getElementById('streakRow');

  let best = null, worst = null, bestCount = -1, worstCount = 8;

  habits.forEach(h => {
    const cnt = countHabitChecked(h.id);
    if (cnt > bestCount)  { bestCount = cnt; best = h; }
    if (cnt < worstCount) { worstCount = cnt; worst = h; }
  });

  const totalDone  = countChecked();
  const todayDone  = habits.filter(h => checks[h.id]?.[todayI]).length;
  const todayTotal = habits.length;

  let html = '';
  html += `<div class="streak-pill"><span class="streak-dot green"></span> Hoy: ${todayDone}/${todayTotal}</div>`;
  if (best && bestCount > 0) html += `<div class="streak-pill"><span class="streak-dot indigo"></span> Top: ${best.emoji} ${best.name}</div>`;
  if (worst && worstCount < todayI) html += `<div class="streak-pill"><span class="streak-dot amber"></span> Mejorar: ${worst.emoji} ${worst.name}</div>`;
  html += `<div class="streak-pill"><span class="streak-dot green"></span> Total semana: ${totalDone}</div>`;
  row.innerHTML = html;
}

/* ================================================================
   ANALYSIS
================================================================ */
function updateAnalysis() {
  const grid = document.getElementById('analysisGrid');
  const insights = document.getElementById('analysisInsights');

  if (habits.length === 0) {
    grid.innerHTML = '';
    insights.innerHTML = '<h4>💡 Insights</h4><p class="insight-line" style="color:var(--text-muted)">Agrega hábitos para ver tu análisis.</p>';
    return;
  }

  const todayI = getTodayDayIndex();
  const daysElapsed = todayI + 1;

  let gridHTML = '';
  const habitStats = habits.map(h => {
    const done = countHabitChecked(h.id);
    const pct  = daysElapsed > 0 ? Math.round((done / daysElapsed) * 100) : 0;
    return { h, done, pct };
  }).sort((a, b) => b.pct - a.pct);

  habitStats.forEach(({ h, done, pct }) => {
    const cls  = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'bad';
    const fill = `fill-${cls}`, pctCls = `pct-${cls}`;
    gridHTML += `
      <div class="analysis-habit-item">
        <span class="analysis-habit-icon">${h.emoji}</span>
        <div class="analysis-habit-info">
          <div class="analysis-habit-name">${escHtml(h.name)}</div>
          <div class="analysis-habit-mini-bar">
            <div class="analysis-habit-mini-fill ${fill}" style="width:${pct}%"></div>
          </div>
        </div>
        <span class="analysis-habit-pct ${pctCls}">${done}/${daysElapsed} <small style="font-size:10px;opacity:.7">${pct}%</small></span>
      </div>`;
  });

  grid.innerHTML = gridHTML || '<p style="color:var(--text-muted);font-size:14px">Empieza a marcar hábitos para ver tu análisis.</p>';

  // Generate insights
  const great  = habitStats.filter(s => s.pct >= 80);
  const ok     = habitStats.filter(s => s.pct >= 50 && s.pct < 80);
  const bad    = habitStats.filter(s => s.pct < 50);
  const totalP = totalPossible();
  const totalD = countChecked();
  const overallPct = totalP > 0 ? Math.round((totalD / totalP) * 100) : 0;

  let lines = [];

  // Overall
  if (overallPct === 0) {
    lines.push(`📌 Aún no has marcado ningún hábito esta semana. ¡Empieza hoy! El primer paso es el más importante.`);
  } else if (overallPct === 100) {
    lines.push(`🏆 ¡Semana PERFECTA! Completaste el ${overallPct}% de tus hábitos. ¡Eres una máquina!`);
  } else if (overallPct >= 80) {
    lines.push(`🌟 ¡Excelente semana! Llevas un ${overallPct}% de cumplimiento. Sigue así.`);
  } else if (overallPct >= 50) {
    lines.push(`📈 Vas por buen camino con un ${overallPct}% de progreso. Todavía hay margen para mejorar.`);
  } else {
    lines.push(`⚠️ Esta semana llevas solo un ${overallPct}%. No te rindas, cada check cuenta.`);
  }

  // Best habits
  if (great.length > 0) {
    const names = great.slice(0,2).map(s => `${s.h.emoji} ${s.h.name}`).join(', ');
    lines.push(`✅ ¡Vas muy bien con: ${names}! Mantén esa constancia.`);
  }

  // Worst habits
  if (bad.length > 0 && daysElapsed > 1) {
    const worst = bad[bad.length - 1];
    lines.push(`🔴 "${worst.h.name}" es donde más estás fallando (${worst.pct}%). Intenta hacerlo mañana en cuanto te despiertes.`);
  }

  // Mid habits
  if (ok.length > 0) {
    const okNames = ok.slice(0,1).map(s => `${s.h.emoji} ${s.h.name}`).join(', ');
    lines.push(`🟡 Puedes mejorar en: ${okNames}. ¡Estás cerca de la consistencia!`);
  }

  // Day motivation
  if (daysElapsed <= 3) {
    lines.push(`🚀 La semana apenas comienza. Es el momento perfecto para establecer el ritmo.`);
  } else if (daysElapsed >= 6) {
    lines.push(`⏳ ¡Últimos días de la semana! Aprovecha para cerrar con fuerza.`);
  }

  insights.innerHTML = `<h4>💡 Insights Personalizados</h4>` +
    lines.map(l => `<p class="insight-line">${l}</p>`).join('');
}

/* ================================================================
   HISTORY
================================================================ */
function renderHistory() {
  const container = document.getElementById('historyList');
  const clearBtn  = document.getElementById('clearHistoryBtn');

  if (history.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:8px 0">No hay semanas anteriores aún.</p>';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'flex';

  container.innerHTML = history.map(item => {
    const d = new Date(item.week + 'T12:00:00');
    const label = `Semana del ${formatDate(d)}`;
    return `<div class="history-item">
      <div class="history-week-label">${label}</div>
      <div class="history-score-bar">
        <div class="history-score-fill" style="width:${item.pct}%"></div>
      </div>
      <div class="history-score-text" style="color:${item.pct>=80?'var(--emerald)':item.pct>=50?'var(--amber)':'var(--rose)'}">${item.pct}%</div>
    </div>`;
  }).join('');
}

/* ================================================================
   ADD HABIT
================================================================ */
function addHabit() {
  const input = document.getElementById('newHabitInput');
  const name  = input.value.trim();
  if (!name) { showToast('⚠️ Escribe el nombre del hábito', 'warning'); return; }

  const habit = { id: uid(), emoji: selectedEmoji, name };
  habits.push(habit);
  input.value = '';
  selectedEmoji = '⭐';
  document.getElementById('emojiToggleBtn').textContent = '➕';
  save();
  renderAll();
  showToast(`${habit.emoji} Hábito "${habit.name}" agregado`, 'info');
}

/* ================================================================
   DELETE HABIT
================================================================ */
function deleteHabit(id) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  habits = habits.filter(h => h.id !== id);
  delete checks[id];
  save();
  renderAll();
  showToast(`🗑 "${h.name}" eliminado`, 'warning');
}

/* ================================================================
   EDIT HABIT (inline)
================================================================ */
function startEditHabit(id) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  const nameEl = document.getElementById(`name-${id}`);
  if (!nameEl) return;

  const input = document.createElement('input');
  input.className = 'habit-name-edit-input';
  input.value = h.name;
  input.setAttribute('aria-label', `Editar nombre del hábito`);
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = () => {
    const newName = input.value.trim();
    if (newName) h.name = newName;
    save();
    renderAll();
  };
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(); }
    if (e.key === 'Escape') { renderAll(); }
  });
}

/* ================================================================
   EMOJI PICKER
================================================================ */
function renderEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = EMOJIS.map(em =>
    `<button class="emoji-picker-btn" data-emoji="${em}" role="option" aria-label="Emoji ${em}">${em}</button>`
  ).join('');
  picker.querySelectorAll('.emoji-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEmoji = btn.dataset.emoji;
      document.getElementById('emojiToggleBtn').textContent = selectedEmoji;
      picker.classList.add('hidden');
    });
  });
}

/* ================================================================
   RESET WEEK
================================================================ */
function resetWeek() {
  archiveWeek(weekKey, checks);
  checks = {};
  save();
  renderAll();
  showToast('🔄 ¡Nueva semana comenzada! Tus checks están en cero.', 'success');
}

/* ================================================================
   TOAST
================================================================ */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, 3200);
}

/* ================================================================
   CHECK POP ANIMATION
================================================================ */
function showCheckPop(checkbox) {
  checkbox.style.transform = 'scale(1.3)';
  setTimeout(() => { checkbox.style.transform = ''; }, 200);
}

/* ================================================================
   CONFETTI
================================================================ */
function showConfetti() {
  const wrap = document.getElementById('confettiWrap');
  const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#f43f5e','#0ea5e9','#a78bfa'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = (1 + Math.random() * 0.8) + 's';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.width  = (6 + Math.random() * 8) + 'px';
    p.style.height = (6 + Math.random() * 8) + 'px';
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    wrap.appendChild(p);
  }
  setTimeout(() => { wrap.innerHTML = ''; }, 2400);
}

/* ================================================================
   ESCAPE HTML
================================================================ */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ================================================================
   RENDER ALL
================================================================ */
function renderAll() {
  renderHeader();
  renderTableHead();
  renderTableBody();
  updateProgress();
  updateAnalysis();
  updateStreaks();
  renderHistory();
}

/* ================================================================
   INIT
================================================================ */
function init() {
  load();
  renderEmojiPicker();
  renderAll();

  // Add habit button
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);
  document.getElementById('newHabitInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addHabit();
  });

  // Emoji toggle
  const emojiBtn = document.getElementById('emojiToggleBtn');
  const picker   = document.getElementById('emojiPicker');
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = emojiBtn.getBoundingClientRect();
    picker.style.top  = (emojiBtn.offsetTop - picker.offsetHeight - 8) + 'px';
    picker.style.left = emojiBtn.offsetLeft + 'px';
    picker.style.position = 'absolute';
    picker.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!picker.contains(e.target) && e.target !== emojiBtn) picker.classList.add('hidden');
  });

  // Reset modal
  document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('resetModal').classList.add('open');
  });
  document.getElementById('cancelReset').addEventListener('click', () => {
    document.getElementById('resetModal').classList.remove('open');
  });
  document.getElementById('confirmReset').addEventListener('click', () => {
    document.getElementById('resetModal').classList.remove('open');
    resetWeek();
  });
  document.getElementById('resetModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });

  // Clear history
  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    history = [];
    save();
    renderHistory();
    showToast('🗑 Historial borrado', 'warning');
  });
}

document.addEventListener('DOMContentLoaded', init);
