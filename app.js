/**
 * Task Planner for Day-to-Day Office Work
 * Comprehensive client application logic
 */

// --- Category & Priority Configurations ---
const CATEGORIES = {
  discussions: {
    id: 'discussions',
    title: 'Ongoing discussions',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    colorClass: 'cat-discussions',
    desc: 'Meetings, stakeholder syncs, alignments, 1-on-1s'
  },
  issues: {
    id: 'issues',
    title: 'Issues handling',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    colorClass: 'cat-issues',
    desc: 'Blockers, production bugs, customer defects, escalations'
  },
  research: {
    id: 'research',
    title: 'Research work',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
    colorClass: 'cat-research',
    desc: 'Spikes, architectural evaluations, benchmarks, feasibility'
  },
  additional: {
    id: 'additional',
    title: 'Additional work',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    colorClass: 'cat-additional',
    desc: 'Ad-hoc tasks, admin, documentation, team support'
  }
};

const PRIORITY_WEIGHTS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

// --- State Management ---
const STATE = {
  tasks: [],
  activeTaskId: null,
  expandedTaskIds: new Set(),
  allDetailsExpanded: false,
  timerInterval: null,
  reminderInterval: null,
  currentView: 'categories', // 'categories' | 'kanban' | 'analytics'
  sortBy: 'priority',       // 'priority' | 'due' | 'estimate' | 'recent'
  filters: {
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all'
  },
  theme: localStorage.getItem('theme') || 'dark',
  audioContext: null
};

// --- Web Audio Synthesizer (Chimes & Notifications) ---
function initAudio() {
  if (!STATE.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      STATE.audioContext = new AudioCtx();
    }
  }
  if (STATE.audioContext && STATE.audioContext.state === 'suspended') {
    STATE.audioContext.resume();
  }
}

function playNotificationChime() {
  try {
    initAudio();
    if (!STATE.audioContext) return;
    const ctx = STATE.audioContext;
    const now = ctx.currentTime;

    // Harmonic bell sequence
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.15);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn('Audio play prevented', e);
  }
}

function playCompletionChime() {
  try {
    initAudio();
    if (!STATE.audioContext) return;
    const ctx = STATE.audioContext;
    const now = ctx.currentTime;

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    chords.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.6);
    });
  } catch (e) {
    console.warn('Audio play error', e);
  }
}

// --- Formatting Helpers ---
function formatMinutes(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatSeconds(totalSecs) {
  if (!totalSecs || totalSecs <= 0) return '0s';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function formatStopwatch(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatDateTimePretty(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Today at ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

// --- Persistence (LocalStorage + REST Server Sync) ---
const isLocalNodeServer = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.protocol.startsWith('http');

async function loadTasks() {
  // 1. Load from local storage
  const local = localStorage.getItem('office_tasks_data');
  if (local !== null) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        // Strip out any legacy hardcoded sample tasks (IDs starting with task-init-)
        STATE.tasks = parsed.filter(t => !t.id || !t.id.startsWith('task-init-'));
      }
    } catch (e) {
      console.error('Failed to parse local storage tasks', e);
      STATE.tasks = [];
    }
  } else {
    STATE.tasks = [];
  }

  // 2. Sync from backend server API if running on local Node server
  if (isLocalNodeServer) {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const serverTasks = await res.json();
        if (Array.isArray(serverTasks)) {
          const cleanServerTasks = serverTasks.filter(t => !t.id || !t.id.startsWith('task-init-'));
          // If local was empty or server has newer tasks
          if (cleanServerTasks.length > 0 || local === null) {
            STATE.tasks = cleanServerTasks;
          }
        }
      }
    } catch (err) {
      console.log('Running in standalone mode (backend sync unavailable)');
    }
  }

  // Save the cleaned tasks back to storage
  saveTasks();

  // Check if any task was in progress and restore timer
  const runningTask = STATE.tasks.find(t => t.status === 'in_progress' && t.isTimerRunning);
  if (runningTask) {
    STATE.activeTaskId = runningTask.id;
  }

  render();
}

function saveTasks() {
  localStorage.setItem('office_tasks_data', JSON.stringify(STATE.tasks));

  // Sync to local server if running with node server.js
  if (isLocalNodeServer) {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(STATE.tasks)
    }).catch(() => {
      // Non-blocking in standalone/offline mode
    });
  }
}

// --- Active Task Timer Engine ---
function getTaskCurrentDurationSeconds(task) {
  let seconds = task.timeSpentSeconds || 0;
  if (task.isTimerRunning && task.timerStartedAt) {
    const elapsed = Math.floor((Date.now() - task.timerStartedAt) / 1000);
    seconds += Math.max(0, elapsed);
  }
  return seconds;
}

function startTimerForTask(taskId) {
  initAudio();
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  // If another task is running, pause it first
  if (STATE.activeTaskId && STATE.activeTaskId !== taskId) {
    pauseTimerForTask(STATE.activeTaskId);
  }

  task.status = 'in_progress';
  task.isTimerRunning = true;
  task.timerStartedAt = Date.now();
  task.completedAt = null;
  task.updatedAt = new Date().toISOString();
  STATE.activeTaskId = taskId;

  saveTasks();
  render();
  updateTimerHud();
}

function pauseTimerForTask(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.isTimerRunning && task.timerStartedAt) {
    const elapsed = Math.floor((Date.now() - task.timerStartedAt) / 1000);
    task.timeSpentSeconds = (task.timeSpentSeconds || 0) + Math.max(0, elapsed);
    task.timerStartedAt = null;
  }
  task.isTimerRunning = false;
  task.updatedAt = new Date().toISOString();

  if (STATE.activeTaskId === taskId) {
    STATE.activeTaskId = null;
  }

  saveTasks();
  render();
  updateTimerHud();
}

function completeAndCloseTask(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Finalize active timer if currently running
  if (task.isTimerRunning && task.timerStartedAt) {
    const elapsed = Math.floor((Date.now() - task.timerStartedAt) / 1000);
    task.timeSpentSeconds = (task.timeSpentSeconds || 0) + Math.max(0, elapsed);
    task.timerStartedAt = null;
    task.isTimerRunning = false;
  }

  if (STATE.activeTaskId === taskId) {
    STATE.activeTaskId = null;
  }

  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  const totalTimeTakenSecs = task.timeSpentSeconds || 0;
  const estimatedSecs = (task.estimatedMinutes || 0) * 60;
  const varianceSecs = totalTimeTakenSecs - estimatedSecs;

  playCompletionChime();
  saveTasks();
  render();
  updateTimerHud();

  // Show detailed completion calculation modal
  showCompletionModal(task, totalTimeTakenSecs, estimatedSecs, varianceSecs);
}

function reopenTask(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = 'todo';
  task.completedAt = null;
  task.isTimerRunning = false;
  task.timerStartedAt = null;
  task.updatedAt = new Date().toISOString();

  saveTasks();
  render();
}

// --- Live Timer HUD updates ---
function updateTimerHud() {
  const hud = document.getElementById('activeTimerHud');
  if (!hud) return;

  if (!STATE.activeTaskId) {
    hud.classList.remove('active');
    return;
  }

  const task = STATE.tasks.find(t => t.id === STATE.activeTaskId);
  if (!task || task.status !== 'in_progress') {
    hud.classList.remove('active');
    return;
  }

  hud.classList.add('active');

  const categoryConfig = CATEGORIES[task.category] || CATEGORIES.additional;
  document.getElementById('hudCategoryBadge').textContent = categoryConfig.title;
  document.getElementById('hudTaskTitle').textContent = task.title;

  const currentDuration = getTaskCurrentDurationSeconds(task);
  document.getElementById('hudStopwatch').textContent = formatStopwatch(currentDuration);

  // Estimate progress
  const estimatedSeconds = (task.estimatedMinutes || 0) * 60;
  const progressFill = document.getElementById('hudProgressFill');
  const progressText = document.getElementById('hudProgressMeta');

  if (estimatedSeconds > 0) {
    const pct = Math.min(100, Math.round((currentDuration / estimatedSeconds) * 100));
    progressFill.style.width = `${pct}%`;
    const isOvertime = currentDuration > estimatedSeconds;
    if (isOvertime) {
      progressFill.classList.add('overtime');
      const overSecs = currentDuration - estimatedSeconds;
      progressText.textContent = `${formatMinutes(task.estimatedMinutes)} est. (${formatSeconds(overSecs)} overtime)`;
    } else {
      progressFill.classList.remove('overtime');
      progressText.textContent = `${pct}% of ${formatMinutes(task.estimatedMinutes)} est.`;
    }
  } else {
    progressFill.style.width = '100%';
    progressFill.classList.remove('overtime');
    progressText.textContent = 'No estimate provided';
  }
}

// Start master 1-second interval
function startTimerLoop() {
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  STATE.timerInterval = setInterval(() => {
    if (STATE.activeTaskId) {
      updateTimerHud();
      // Also update running card stopwatch if visible
      const activeCardTimer = document.querySelector(`.card-live-timer[data-task-id="${STATE.activeTaskId}"]`);
      if (activeCardTimer) {
        const task = STATE.tasks.find(t => t.id === STATE.activeTaskId);
        if (task) {
          activeCardTimer.textContent = formatStopwatch(getTaskCurrentDurationSeconds(task));
        }
      }
    }
  }, 1000);
}

// --- Reminders Engine ---
function checkReminders() {
  const now = new Date();

  STATE.tasks.forEach(task => {
    if (task.reminderTime && !task.reminderTriggered && task.status !== 'completed') {
      const reminderDate = new Date(task.reminderTime);
      if (now >= reminderDate) {
        triggerReminder(task);
      }
    }
  });
}

function triggerReminder(task) {
  task.reminderTriggered = true;
  saveTasks();
  playNotificationChime();

  // Desktop Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`⏰ Reminder: ${task.title}`, {
        body: `Category: ${CATEGORIES[task.category]?.title || 'Task'} | Priority: ${task.priority.toUpperCase()}`,
        icon: '/favicon.ico'
      });
    } catch (e) {
      console.warn('Desktop notification failed', e);
    }
  }

  // In-app Alert Toast
  showReminderToast(task);
  render();
}

function showReminderToast(task) {
  const container = document.getElementById('reminderToastContainer');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'reminder-alert-card';
  card.id = `reminder-toast-${task.id}`;

  const categoryName = CATEGORIES[task.category]?.title || 'Task';
  const estimateStr = task.estimatedMinutes ? `• Est: ${formatMinutes(task.estimatedMinutes)}` : '';

  card.innerHTML = `
    <div class="reminder-alert-header">
      <div class="reminder-alert-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span>TASK REMINDER</span>
      </div>
      <button class="btn btn-ghost btn-icon" onclick="dismissReminderToast('${task.id}')" title="Dismiss" style="padding: 2px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="reminder-task-heading">${escapeHtml(task.title)}</div>
    <div style="font-size: 0.8rem; color: #cbd5e1;">${categoryName} ${estimateStr}</div>
    <div class="reminder-actions">
      <button class="btn btn-primary" style="flex: 1;" onclick="startFromReminder('${task.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Start Task Now
      </button>
      <button class="btn btn-secondary" onclick="snoozeReminder('${task.id}', 10)">
        Snooze 10m
      </button>
    </div>
  `;

  container.appendChild(card);
}

function dismissReminderToast(taskId) {
  const card = document.getElementById(`reminder-toast-${taskId}`);
  if (card) {
    card.remove();
  }
}

function snoozeReminder(taskId, minutes) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  const snoozedTime = new Date(Date.now() + minutes * 60 * 1000);
  task.reminderTime = snoozedTime.toISOString().slice(0, 16);
  task.reminderTriggered = false;
  saveTasks();
  dismissReminderToast(taskId);
  render();
}

function startFromReminder(taskId) {
  dismissReminderToast(taskId);
  startTimerForTask(taskId);
}

function requestNotificationPermission() {
  initAudio();
  if ('Notification' in window) {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        alert('Browser desktop notifications enabled successfully!');
      } else {
        alert('Desktop notifications were not enabled. In-app alerts will continue to work.');
      }
    });
  } else {
    alert('Desktop notifications are not supported in this browser.');
  }
}

// --- Completion Modal ---
function showCompletionModal(task, actualSecs, estSecs, varianceSecs) {
  const modal = document.getElementById('completionModal');
  const body = document.getElementById('completionModalBody');
  if (!modal || !body) return;

  const isAhead = varianceSecs <= 0;
  const varianceFormatted = formatSeconds(Math.abs(varianceSecs));
  const varianceText = isAhead 
    ? `<span style="color: var(--success); font-weight: 700;">Ahead of estimate by ${varianceFormatted} (${Math.round((actualSecs / (estSecs || 1)) * 100)}% of budget)</span>`
    : `<span style="color: var(--danger); font-weight: 700;">Over estimate by ${varianceFormatted}</span>`;

  body.innerHTML = `
    <div style="text-align: center; margin-bottom: 0.5rem;">
      <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">🎉</div>
      <h3 style="font-size: 1.25rem; font-weight: 700;">Task Completed & Closed!</h3>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(task.title)}</p>
    </div>

    <div class="completion-summary-box">
      <div class="summary-stat-row">
        <span class="stat-label">Category:</span>
        <span class="stat-val">${CATEGORIES[task.category]?.title || 'Task'}</span>
      </div>
      <div class="summary-stat-row">
        <span class="stat-label">Estimated Time:</span>
        <span class="stat-val">${task.estimatedMinutes ? formatMinutes(task.estimatedMinutes) : 'None'}</span>
      </div>
      <div class="summary-stat-row">
        <span class="stat-label">Actual Time Taken:</span>
        <span class="stat-val" style="color: var(--accent-primary);">${formatSeconds(actualSecs)}</span>
      </div>
      <div class="summary-stat-row" style="border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
        <span class="stat-label">Time Variance:</span>
        <span class="stat-val">${estSecs > 0 ? varianceText : 'Calculated and logged'}</span>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function closeCompletionModal() {
  const modal = document.getElementById('completionModal');
  if (modal) modal.classList.remove('open');
}

// --- Standup Summary Generator ---
function openStandupModal() {
  const modal = document.getElementById('standupModal');
  const preview = document.getElementById('standupPreview');
  if (!modal || !preview) return;

  const today = new Date().toDateString();
  const completedToday = STATE.tasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === today);
  const inProgress = STATE.tasks.filter(t => t.status === 'in_progress');
  const urgentOrHighTodo = STATE.tasks.filter(t => t.status === 'todo' && (t.priority === 'urgent' || t.priority === 'high'));

  let totalSecsToday = 0;
  completedToday.forEach(t => totalSecsToday += (t.timeSpentSeconds || 0));

  let md = `### 📋 Daily Office Standup Report (${new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })})\n\n`;

  md += `**⏱ Total Time Tracked Today:** ${formatSeconds(totalSecsToday)}\n\n`;

  md += `**✅ Completed Today (${completedToday.length}):**\n`;
  if (completedToday.length === 0) {
    md += `• None yet\n`;
  } else {
    completedToday.forEach(t => {
      const cat = CATEGORIES[t.category]?.title || t.category;
      md += `• [${cat}] ${t.title} — Time taken: ${formatSeconds(t.timeSpentSeconds || 0)} (Est: ${formatMinutes(t.estimatedMinutes)})\n`;
    });
  }

  md += `\n**🔄 Currently In Progress (${inProgress.length}):**\n`;
  if (inProgress.length === 0) {
    md += `• No active task in progress\n`;
  } else {
    inProgress.forEach(t => {
      const cat = CATEGORIES[t.category]?.title || t.category;
      const currentDuration = getTaskCurrentDurationSeconds(t);
      md += `• [${cat}] ${t.title} — Active elapsed: ${formatSeconds(currentDuration)} (Est: ${formatMinutes(t.estimatedMinutes)})\n`;
    });
  }

  md += `\n**🎯 Next Priorities (${urgentOrHighTodo.length}):**\n`;
  if (urgentOrHighTodo.length === 0) {
    md += `• Backlog clear\n`;
  } else {
    urgentOrHighTodo.forEach(t => {
      md += `• [${t.priority.toUpperCase()}] ${t.title} (Est: ${formatMinutes(t.estimatedMinutes)})\n`;
    });
  }

  preview.textContent = md;
  modal.classList.add('open');
}

function copyStandupReport() {
  const preview = document.getElementById('standupPreview');
  if (!preview) return;
  navigator.clipboard.writeText(preview.textContent).then(() => {
    const btn = document.getElementById('copyStandupBtn');
    if (btn) {
      const oldHtml = btn.innerHTML;
      btn.innerHTML = `✓ Copied to Clipboard!`;
      setTimeout(() => btn.innerHTML = oldHtml, 2000);
    }
  });
}

function closeStandupModal() {
  const modal = document.getElementById('standupModal');
  if (modal) modal.classList.remove('open');
}

// --- Task Filter and Sort Functions ---
function getFilteredAndSortedTasks(categoryFilter = null) {
  let list = [...STATE.tasks];

  // 1. Text Search Filter
  if (STATE.filters.search.trim()) {
    const q = STATE.filters.search.toLowerCase().trim();
    list = list.filter(t => 
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // 2. Global Category Filter (if selected in toolbar)
  if (STATE.filters.category !== 'all') {
    list = list.filter(t => t.category === STATE.filters.category);
  }

  // If specific column category is requested
  if (categoryFilter) {
    list = list.filter(t => t.category === categoryFilter);
  }

  // 3. Priority Filter
  if (STATE.filters.priority !== 'all') {
    list = list.filter(t => t.priority === STATE.filters.priority);
  }

  // 4. Status Filter
  if (STATE.filters.status !== 'all') {
    list = list.filter(t => t.status === STATE.filters.status);
  }

  // 5. Sorting
  list.sort((a, b) => {
    if (STATE.sortBy === 'priority') {
      // Primary: Priority descending (Urgent -> High -> Medium -> Low)
      const pDiff = (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      // Secondary: In progress tasks rise to top
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;

      // Tertiary: Due date / reminder
      if (a.reminderTime && b.reminderTime) {
        return new Date(a.reminderTime) - new Date(b.reminderTime);
      }
      if (a.reminderTime) return -1;
      if (b.reminderTime) return 1;

      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }

    if (STATE.sortBy === 'due') {
      if (a.reminderTime && b.reminderTime) return new Date(a.reminderTime) - new Date(b.reminderTime);
      if (a.reminderTime) return -1;
      if (b.reminderTime) return 1;
      return (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0);
    }

    if (STATE.sortBy === 'estimate') {
      return (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
    }

    if (STATE.sortBy === 'recent') {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }

    return 0;
  });

  return list;
}

// --- Render Methods ---
function render() {
  const container = document.getElementById('viewContainer');
  if (!container) return;

  if (STATE.currentView === 'categories') {
    renderCategoriesView(container);
  } else if (STATE.currentView === 'kanban') {
    renderKanbanView(container);
  } else if (STATE.currentView === 'analytics') {
    renderAnalyticsView(container);
  }

  updateTimerHud();
}

function renderCategoriesView(container) {
  let html = `<div class="categories-grid">`;

  Object.values(CATEGORIES).forEach(cat => {
    const tasks = getFilteredAndSortedTasks(cat.id);
    const openTasks = tasks.filter(t => t.status !== 'completed');
    const totalEstMins = openTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

    html += `
      <div class="category-column ${cat.colorClass}" 
           ondragover="handleDragOver(event)" 
           ondrop="handleCategoryDrop(event, '${cat.id}')">
        <div class="column-header">
          <div class="column-header-title">
            <div class="column-icon">${cat.icon}</div>
            <div>
              <div class="column-title-text">${cat.title}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${formatMinutes(totalEstMins)} est. pending</div>
            </div>
          </div>
          <div class="column-stats">
            <span class="task-count-badge">${tasks.length}</span>
            <button class="btn btn-ghost btn-icon" onclick="openCreateModal('${cat.id}')" title="Add task to ${cat.title}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        <div class="column-body">
          ${tasks.length === 0 ? `
            <div class="column-empty-state">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <div>No tasks in this section</div>
              <button class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; margin-top: 0.25rem;" onclick="openCreateModal('${cat.id}')">+ Add Task</button>
            </div>
          ` : tasks.map(t => renderTaskCard(t)).join('')}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderKanbanView(container) {
  const allFiltered = getFilteredAndSortedTasks();
  const stages = [
    { id: 'todo', title: 'To Do', icon: '📝', tasks: allFiltered.filter(t => t.status === 'todo') },
    { id: 'in_progress', title: 'In Progress', icon: '⚡️', tasks: allFiltered.filter(t => t.status === 'in_progress') },
    { id: 'completed', title: 'Closed & Completed', icon: '✅', tasks: allFiltered.filter(t => t.status === 'completed') }
  ];

  let html = `<div class="kanban-grid">`;

  stages.forEach(stage => {
    html += `
      <div class="category-column" 
           ondragover="handleDragOver(event)" 
           ondrop="handleKanbanDrop(event, '${stage.id}')">
        <div class="column-header">
          <div class="column-header-title">
            <span style="font-size: 1.1rem;">${stage.icon}</span>
            <div class="column-title-text">${stage.title}</div>
          </div>
          <span class="task-count-badge">${stage.tasks.length}</span>
        </div>
        <div class="column-body">
          ${stage.tasks.length === 0 ? `
            <div class="column-empty-state">
              <div>No tasks in ${stage.title}</div>
            </div>
          ` : stage.tasks.map(t => renderTaskCard(t)).join('')}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderAnalyticsView(container) {
  const totalTasks = STATE.tasks.length;
  const completedTasks = STATE.tasks.filter(t => t.status === 'completed');
  const inProgressTasks = STATE.tasks.filter(t => t.status === 'in_progress');
  const todoTasks = STATE.tasks.filter(t => t.status === 'todo');

  let totalTrackedSecs = 0;
  STATE.tasks.forEach(t => {
    totalTrackedSecs += getTaskCurrentDurationSeconds(t);
  });

  // Category distribution
  const catStats = {};
  Object.keys(CATEGORIES).forEach(k => {
    catStats[k] = { count: 0, seconds: 0, title: CATEGORIES[k].title };
  });

  STATE.tasks.forEach(t => {
    if (catStats[t.category]) {
      catStats[t.category].count += 1;
      catStats[t.category].seconds += getTaskCurrentDurationSeconds(t);
    }
  });

  // Calculate efficiency on completed tasks
  let totalEstSecsCompleted = 0;
  let totalActualSecsCompleted = 0;
  completedTasks.forEach(t => {
    if (t.estimatedMinutes) {
      totalEstSecsCompleted += t.estimatedMinutes * 60;
      totalActualSecsCompleted += (t.timeSpentSeconds || 0);
    }
  });

  const accuracyPct = totalEstSecsCompleted > 0 
    ? Math.round((Math.min(totalActualSecsCompleted, totalEstSecsCompleted) / Math.max(totalActualSecsCompleted, totalEstSecsCompleted)) * 100) 
    : 100;

  let html = `
    <div class="analytics-view">
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-label">Total Time Tracked</div>
          <div class="metric-value" style="color: var(--accent-primary);">${formatSeconds(totalTrackedSecs)}</div>
          <div class="metric-desc">Across all office work sessions</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Tasks Completed</div>
          <div class="metric-value" style="color: var(--success);">${completedTasks.length} / ${totalTasks}</div>
          <div class="metric-desc">${totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}% completion rate</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">In Progress Now</div>
          <div class="metric-value" style="color: var(--warning);">${inProgressTasks.length}</div>
          <div class="metric-desc">${todoTasks.length} queued in backlog</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Estimation Accuracy</div>
          <div class="metric-value">${accuracyPct}%</div>
          <div class="metric-desc">Estimated vs actual time precision</div>
        </div>
      </div>

      <div class="analytics-cards-grid">
        <div class="analytics-card">
          <div class="analytics-card-header">
            <h3 class="analytics-card-title">Time Spent by Category</h3>
          </div>
          <div class="breakdown-list">
            ${Object.keys(CATEGORIES).map(k => {
              const stat = catStats[k];
              const pct = totalTrackedSecs > 0 ? Math.round((stat.seconds / totalTrackedSecs) * 100) : 0;
              return `
                <div class="breakdown-item">
                  <div class="breakdown-meta">
                    <span style="font-weight: 600;">${stat.title} (${stat.count} tasks)</span>
                    <span style="font-family: var(--font-mono);">${formatSeconds(stat.seconds)} (${pct}%)</span>
                  </div>
                  <div class="breakdown-bar-bg">
                    <div class="breakdown-bar-fill" style="width: ${pct}%; background: var(--${CATEGORIES[k].colorClass});"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-header">
            <h3 class="analytics-card-title">Priority Breakdown</h3>
          </div>
          <div class="breakdown-list">
            ${['urgent', 'high', 'medium', 'low'].map(prio => {
              const count = STATE.tasks.filter(t => t.priority === prio).length;
              const completedCount = completedTasks.filter(t => t.priority === prio).length;
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return `
                <div class="breakdown-item">
                  <div class="breakdown-meta">
                    <span class="priority-badge ${prio}">${prio.toUpperCase()}</span>
                    <span>${count} tasks (${completedCount} closed)</span>
                  </div>
                  <div class="breakdown-bar-bg">
                    <div class="breakdown-bar-fill" style="width: ${pct}%; background: var(--prio-${prio});"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// --- Interactive Card Actions & Helpers ---
function cycleTaskPriority(taskId, event) {
  if (event) event.stopPropagation();
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;
  const sequence = ['urgent', 'high', 'medium', 'low'];
  const currentIndex = sequence.indexOf(task.priority);
  const nextIndex = (currentIndex + 1) % sequence.length;
  task.priority = sequence[nextIndex];
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
}

function quickMoveTaskCategory(taskId, newCategory, event) {
  if (event) event.stopPropagation();
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task || task.category === newCategory) return;
  task.category = newCategory;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
}

function quickAddEstimatedMinutes(taskId, minutesToAdd, event) {
  if (event) event.stopPropagation();
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.estimatedMinutes = Math.max(5, (task.estimatedMinutes || 0) + minutesToAdd);
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
  updateTimerHud();
}

function toggleTaskCompletion(taskId, event) {
  if (event) event.stopPropagation();
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.status === 'completed') {
    reopenTask(taskId);
  } else {
    completeAndCloseTask(taskId);
  }
}

function toggleTaskDetails(taskId, event) {
  if (event) event.stopPropagation();
  if (STATE.expandedTaskIds.has(taskId)) {
    STATE.expandedTaskIds.delete(taskId);
  } else {
    STATE.expandedTaskIds.add(taskId);
  }

  const detailsEl = document.getElementById(`card-details-${taskId}`);
  const chevronEl = document.getElementById(`details-chevron-${taskId}`);
  const labelEl = document.getElementById(`details-label-${taskId}`);
  const isExpanded = STATE.expandedTaskIds.has(taskId);

  if (detailsEl) {
    detailsEl.classList.toggle('collapsed', !isExpanded);
  }
  if (chevronEl) {
    chevronEl.classList.toggle('rotated', isExpanded);
  }
  if (labelEl) {
    labelEl.textContent = isExpanded ? 'Hide Details' : 'Show Details';
  }
}

function toggleAllDetails() {
  STATE.allDetailsExpanded = !STATE.allDetailsExpanded;
  if (STATE.allDetailsExpanded) {
    STATE.tasks.forEach(t => STATE.expandedTaskIds.add(t.id));
  } else {
    STATE.expandedTaskIds.clear();
  }
  const btnText = document.getElementById('toggleAllDetailsText');
  if (btnText) {
    btnText.textContent = STATE.allDetailsExpanded ? 'Collapse Details' : 'Expand Details';
  }
  render();
}

function clearSearch() {
  STATE.filters.search = '';
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (clearBtn) {
    clearBtn.classList.remove('visible');
  }
  render();
}

function toggleNoteChecklist(taskId, lineIndex) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task || !task.notes) return;
  const lines = task.notes.split('\n');
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (line.includes('[ ]')) {
      lines[lineIndex] = line.replace('[ ]', '[x]');
    } else if (line.includes('[x]') || line.includes('[X]')) {
      lines[lineIndex] = line.replace(/\[[xX]\]/, '[ ]');
    } else if (line.match(/^([-*•])\s+/)) {
      lines[lineIndex] = line.replace(/^([-*•])\s+/, '- [x] ');
    }
    task.notes = lines.join('\n');
    task.updatedAt = new Date().toISOString();
    saveTasks();
    render();
  }
}

function renderInteractiveNotes(taskId, rawNotes) {
  if (!rawNotes) return { html: '', totalItems: 0, doneItems: 0 };
  const lines = rawNotes.split('\n');
  let totalItems = 0;
  let doneItems = 0;

  const renderedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    // Checklist pattern: - [ ] or - [x]
    const checkMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      totalItems++;
      const isChecked = checkMatch[1].toLowerCase() === 'x';
      if (isChecked) doneItems++;
      return `
        <label class="checklist-item" onclick="event.stopPropagation()">
          <input type="checkbox" class="checklist-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleNoteChecklist('${taskId}', ${idx})">
          <span class="checklist-text ${isChecked ? 'done' : ''}">${escapeHtml(checkMatch[2])}</span>
        </label>
      `;
    }
    // Bullet pattern: - or * or •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      totalItems++;
      return `
        <label class="checklist-item" onclick="event.stopPropagation()">
          <input type="checkbox" class="checklist-checkbox" onchange="toggleNoteChecklist('${taskId}', ${idx})">
          <span class="checklist-text">${escapeHtml(bulletMatch[1])}</span>
        </label>
      `;
    }
    return `<div>${escapeHtml(line)}</div>`;
  }).join('');

  return { html: renderedLines, totalItems, doneItems };
}

function renderTaskCard(task) {
  const isRunning = task.status === 'in_progress' && task.isTimerRunning;
  const isCompleted = task.status === 'completed';
  const isExpanded = STATE.expandedTaskIds.has(task.id);
  const currentDurationSecs = getTaskCurrentDurationSeconds(task);

  // Reminder status
  let reminderHtml = '';
  if (task.reminderTime) {
    const isOverdue = new Date(task.reminderTime) < new Date() && !isCompleted;
    const pillClass = isOverdue ? 'reminder-overdue' : 'reminder-active';
    reminderHtml = `
      <div class="meta-pill ${pillClass}" title="Reminder Set">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span>${formatDateTimePretty(task.reminderTime)}</span>
      </div>
    `;
  }

  // Time metrics pill
  let timeMetricsHtml = '';
  if (isCompleted) {
    const estSecs = (task.estimatedMinutes || 0) * 60;
    const actualSecs = task.timeSpentSeconds || 0;
    const diff = actualSecs - estSecs;
    const varianceClass = diff <= 0 ? 'time-variance-ahead' : 'time-variance-over';
    const varianceLabel = diff <= 0 ? `-${formatSeconds(Math.abs(diff))} ahead` : `+${formatSeconds(diff)} over`;

    timeMetricsHtml = `
      <div class="meta-pill ${varianceClass}" title="Actual time taken vs Estimate">
        <span>⏱ Took: ${formatSeconds(actualSecs)}</span>
        ${estSecs > 0 ? `<span>(${varianceLabel})</span>` : ''}
      </div>
    `;
  } else if (isRunning) {
    timeMetricsHtml = `
      <div class="meta-pill" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; font-family: var(--font-mono); font-weight: 700;">
        <span class="pulse-indicator" style="width: 6px; height: 6px;"></span>
        <span class="card-live-timer" data-task-id="${task.id}">${formatStopwatch(currentDurationSecs)}</span>
      </div>
    `;
  } else if (task.timeSpentSeconds > 0) {
    timeMetricsHtml = `
      <div class="meta-pill" title="Time spent so far">
        <span>⏱ ${formatSeconds(task.timeSpentSeconds)} logged</span>
      </div>
    `;
  }

  // Parse notes and checklist items
  const notesParsed = renderInteractiveNotes(task.id, task.notes);
  const hasDetails = Boolean(task.notes || (task.tags && task.tags.length > 0));

  let checklistPill = '';
  if (notesParsed.totalItems > 0) {
    checklistPill = `<span class="details-badge-pill" title="Action items">${notesParsed.doneItems}/${notesParsed.totalItems} done</span>`;
  } else if (task.notes) {
    checklistPill = `<span class="details-badge-pill">Notes</span>`;
  }

  // Action buttons
  let actionButtonsHtml = '';
  if (isCompleted) {
    actionButtonsHtml = `
      <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="reopenTask('${task.id}')">
        Re-open Task
      </button>
    `;
  } else if (isRunning) {
    actionButtonsHtml = `
      <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="pauseTimerForTask('${task.id}')" title="Pause Timer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        Pause
      </button>
      <button class="btn btn-success" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="completeAndCloseTask('${task.id}')" title="Close Task & Calculate Time Taken">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Close & Calculate
      </button>
    `;
  } else {
    actionButtonsHtml = `
      <button class="btn btn-primary" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;" onclick="startTimerForTask('${task.id}')" title="Move to In Progress and Start Timer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Start Task
      </button>
      <button class="btn btn-ghost" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="completeAndCloseTask('${task.id}')" title="Mark Closed Directly">
        Done
      </button>
    `;
  }

  return `
    <div class="task-card ${isRunning ? 'is-active-running' : ''} ${isCompleted ? 'is-completed' : ''}" 
         id="task-card-${task.id}" 
         draggable="true" 
         ondragstart="handleDragStart(event, '${task.id}')">
      
      <!-- Card Top: Interactive Priority & Quick Category Mover -->
      <div class="card-top-meta">
        <div class="card-top-left">
          <span class="priority-badge ${task.priority}" 
                onclick="cycleTaskPriority('${task.id}', event)" 
                title="Priority: ${task.priority.toUpperCase()} (Click to change)">
            ${task.priority.toUpperCase()}
          </span>
          <span class="status-badge ${task.status}">
            ${task.status === 'in_progress' ? '⚡️ In Progress' : task.status === 'completed' ? '✓ Closed' : 'To Do'}
          </span>
        </div>

        <div class="card-top-right">
          <select class="card-cat-mover" onchange="quickMoveTaskCategory('${task.id}', this.value, event)" title="Quick change category" onclick="event.stopPropagation()">
            <option value="discussions" ${task.category === 'discussions' ? 'selected' : ''}>💬 Discussions</option>
            <option value="issues" ${task.category === 'issues' ? 'selected' : ''}>🚨 Issues</option>
            <option value="research" ${task.category === 'research' ? 'selected' : ''}>🔬 Research</option>
            <option value="additional" ${task.category === 'additional' ? 'selected' : ''}>📋 Additional</option>
          </select>
        </div>
      </div>

      <!-- Card Title Row with Quick Completion Checkbox -->
      <div class="card-title-row">
        <button class="card-complete-toggle ${isCompleted ? 'is-checked' : ''}" 
                onclick="toggleTaskCompletion('${task.id}', event)" 
                title="${isCompleted ? 'Click to reopen task' : 'Click to complete and close task'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <div class="card-title ${isCompleted ? 'is-done' : ''}" onclick="openEditModal('${task.id}')">
          ${escapeHtml(task.title)}
        </div>
      </div>

      <!-- Card Meta Row (Estimate + Reminder + Variance + Quick Extend) -->
      <div class="card-meta-row">
        <div class="meta-pill" title="Estimated Time">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Est: ${formatMinutes(task.estimatedMinutes)}</span>
        </div>
        ${!isCompleted ? `
          <button class="btn-quick-extend" onclick="quickAddEstimatedMinutes('${task.id}', 15, event)" title="Add +15 minutes to estimate">+15m</button>
        ` : ''}
        ${reminderHtml}
        ${timeMetricsHtml}
      </div>

      <!-- Hideable Details Section -->
      ${hasDetails ? `
        <button class="card-details-toggle" onclick="toggleTaskDetails('${task.id}', event)">
          <span class="details-chevron ${isExpanded ? 'rotated' : ''}" id="details-chevron-${task.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
          <span id="details-label-${task.id}">${isExpanded ? 'Hide Details' : 'Show Details'}</span>
          ${checklistPill}
        </button>

        <div class="card-details-collapsible ${isExpanded ? '' : 'collapsed'}" id="card-details-${task.id}">
          ${task.notes ? `<div class="card-notes">${notesParsed.html}</div>` : ''}
          ${task.tags && task.tags.length > 0 ? `
            <div class="tags-row">
              ${task.tags.map(tag => `<span class="tag-badge">#${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Card Bottom Actions -->
      <div class="card-actions">
        <div class="action-btns-left">
          ${actionButtonsHtml}
        </div>
        <div class="action-btns-right">
          <button class="btn btn-ghost btn-icon" onclick="openEditModal('${task.id}')" title="Edit Task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-ghost btn-icon" onclick="deleteTask('${task.id}')" title="Delete Task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// --- Task CRUD Modals ---
let currentEditingTaskId = null;

function openCreateModal(defaultCategory = 'discussions') {
  currentEditingTaskId = null;
  document.getElementById('modalTitle').textContent = 'Create New Office Task';
  document.getElementById('taskForm').reset();
  document.getElementById('formCategory').value = defaultCategory;
  document.getElementById('formPriority').value = 'urgent';
  document.getElementById('formEstimatedMinutes').value = 45;
  document.getElementById('formReminderTime').value = '';
  document.getElementById('deleteTaskBtn').style.display = 'none';

  document.getElementById('taskModal').classList.add('open');
}

function openEditModal(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  currentEditingTaskId = taskId;
  document.getElementById('modalTitle').textContent = 'Edit Office Task';
  document.getElementById('formTitle').value = task.title || '';
  document.getElementById('formCategory').value = task.category || 'discussions';
  document.getElementById('formPriority').value = task.priority || 'medium';
  document.getElementById('formEstimatedMinutes').value = task.estimatedMinutes || 30;
  document.getElementById('formReminderTime').value = task.reminderTime ? task.reminderTime.slice(0, 16) : '';
  document.getElementById('formNotes').value = task.notes || '';
  document.getElementById('formTags').value = task.tags ? task.tags.join(', ') : '';
  document.getElementById('deleteTaskBtn').style.display = 'inline-flex';

  document.getElementById('taskModal').classList.add('open');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('open');
  currentEditingTaskId = null;
}

function setQuickEstimate(mins) {
  document.getElementById('formEstimatedMinutes').value = mins;
}

function setQuickReminder(type) {
  const now = new Date();
  let target = new Date();

  if (type === '30m') {
    target = new Date(now.getTime() + 30 * 60 * 1000);
  } else if (type === '1h') {
    target = new Date(now.getTime() + 60 * 60 * 1000);
  } else if (type === 'today_eod') {
    target.setHours(17, 30, 0, 0);
    if (target < now) {
      target.setDate(target.getDate() + 1);
    }
  } else if (type === 'tomorrow_morning') {
    target.setDate(target.getDate() + 1);
    target.setHours(10, 0, 0, 0);
  }

  // Format to YYYY-MM-DDTHH:mm local
  const pad = n => String(n).padStart(2, '0');
  const formatted = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
  document.getElementById('formReminderTime').value = formatted;
}

function handleTaskFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('formTitle').value.trim();
  if (!title) {
    alert('Please enter a task title');
    return;
  }

  const category = document.getElementById('formCategory').value;
  const priority = document.getElementById('formPriority').value;
  const estimatedMinutes = parseInt(document.getElementById('formEstimatedMinutes').value, 10) || 0;
  const reminderTime = document.getElementById('formReminderTime').value || null;
  const notes = document.getElementById('formNotes').value.trim();
  const tags = document.getElementById('formTags').value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (currentEditingTaskId) {
    // Edit existing task
    const task = STATE.tasks.find(t => t.id === currentEditingTaskId);
    if (task) {
      task.title = title;
      task.category = category;
      task.priority = priority;
      task.estimatedMinutes = estimatedMinutes;
      if (task.reminderTime !== reminderTime) {
        task.reminderTime = reminderTime;
        task.reminderTriggered = false; // reset reminder trigger if time changed
      }
      task.notes = notes;
      task.tags = tags;
      task.updatedAt = new Date().toISOString();
    }
  } else {
    // Create new task
    const newTask = {
      id: 'task-' + Date.now(),
      title,
      category,
      priority,
      status: 'todo',
      estimatedMinutes,
      timeSpentSeconds: 0,
      timerStartedAt: null,
      isTimerRunning: false,
      completedAt: null,
      reminderTime,
      reminderTriggered: false,
      notes,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    STATE.tasks.push(newTask);
  }

  saveTasks();
  closeTaskModal();
  render();
}

function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  if (STATE.activeTaskId === taskId) {
    STATE.activeTaskId = null;
    updateTimerHud();
  }

  STATE.tasks = STATE.tasks.filter(t => t.id !== taskId);
  saveTasks();
  closeTaskModal();
  render();
}

function deleteCurrentEditingTask() {
  if (currentEditingTaskId) {
    deleteTask(currentEditingTaskId);
  }
}

// --- Backup & Restore ---
function exportData() {
  const jsonStr = JSON.stringify(STATE.tasks, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `private-task-handler-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Import ${imported.length} tasks? This will merge with your current tasks.`)) {
          // Merge tasks avoiding duplicate ids
          const existingIds = new Set(STATE.tasks.map(t => t.id));
          imported.forEach(item => {
            if (!existingIds.has(item.id)) {
              STATE.tasks.push(item);
            }
          });
          saveTasks();
          render();
          alert(`Successfully imported tasks!`);
        }
      } else {
        alert('Invalid JSON file format (expected array of tasks).');
      }
    } catch (err) {
      alert('Error parsing JSON backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// --- Theme Toggle ---
function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light-theme', STATE.theme === 'light');
  localStorage.setItem('theme', STATE.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  if (STATE.theme === 'light') {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  } else {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  }
}

// --- Utilities ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- View Switcher ---
function switchView(viewName) {
  STATE.currentView = viewName;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  render();
}

// --- Drag and Drop Handlers ---
let draggedTaskId = null;

function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
  const card = document.getElementById(`task-card-${taskId}`);
  if (card) {
    card.classList.add('is-dragging');
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleCategoryDrop(e, targetCategory) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;

  const task = STATE.tasks.find(t => t.id === taskId);
  if (task && task.category !== targetCategory) {
    task.category = targetCategory;
    task.updatedAt = new Date().toISOString();
    saveTasks();
    render();
  }
  draggedTaskId = null;
}

function handleKanbanDrop(e, targetStatus) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;

  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (targetStatus === 'in_progress') {
    startTimerForTask(taskId);
  } else if (targetStatus === 'completed') {
    completeAndCloseTask(taskId);
  } else if (targetStatus === 'todo') {
    reopenTask(taskId);
  }
  draggedTaskId = null;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  if (STATE.theme === 'light') {
    document.body.classList.add('light-theme');
  }
  updateThemeIcon();

  // Search input binding
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      STATE.filters.search = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.classList.toggle('visible', Boolean(e.target.value.trim()));
      }
      render();
    });
  }

  // Filter bindings
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', e => {
      STATE.filters.category = e.target.value;
      render();
    });
  }

  const priorityFilter = document.getElementById('priorityFilter');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', e => {
      STATE.filters.priority = e.target.value;
      render();
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      STATE.filters.status = e.target.value;
      render();
    });
  }

  const sortBySelect = document.getElementById('sortBySelect');
  if (sortBySelect) {
    sortBySelect.addEventListener('change', e => {
      STATE.sortBy = e.target.value;
      render();
    });
  }

  // View toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // HUD action bindings
  const hudPauseBtn = document.getElementById('hudPauseBtn');
  if (hudPauseBtn) {
    hudPauseBtn.addEventListener('click', () => {
      if (STATE.activeTaskId) {
        pauseTimerForTask(STATE.activeTaskId);
      }
    });
  }

  const hudCompleteBtn = document.getElementById('hudCompleteBtn');
  if (hudCompleteBtn) {
    hudCompleteBtn.addEventListener('click', () => {
      if (STATE.activeTaskId) {
        completeAndCloseTask(STATE.activeTaskId);
      }
    });
  }

  // Form submit binding
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if (e.key === 'Escape') {
      closeTaskModal();
      closeCompletionModal();
      closeStandupModal();
      return;
    }

    if (!isEditing) {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === '/') {
        e.preventDefault();
        const search = document.getElementById('searchInput');
        if (search) search.focus();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const taskModal = document.getElementById('taskModal');
      if (taskModal && taskModal.classList.contains('open')) {
        e.preventDefault();
        taskForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  });

  // Load data & start loops
  loadTasks();
  startTimerLoop();

  // Check reminders every 10 seconds
  if (STATE.reminderInterval) clearInterval(STATE.reminderInterval);
  STATE.reminderInterval = setInterval(checkReminders, 10000);
  checkReminders();
});
