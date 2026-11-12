# ⏱️ Office Task Planner & Time Tracker

A dedicated daily office task planner, priority queue, and time tracking application built specifically for daily workplace workflows.

---

## 🎯 Key Features

### 1. Four Core Office Categories
Organized into 4 focused columns designed around typical daily engineering, management, and knowledge-worker demands:
1. **Ongoing discussions**: Meetings, 1-on-1s, stakeholder alignments, roadmap syncs.
2. **Issues handling**: Escalations, production bugs, blockers, critical hotfixes.
3. **Research work**: Spikes, architectural evaluations, benchmark tests, tech evaluations.
4. **Additional work**: Administrative duties, documentation, team support, ad-hoc requests.

### 2. Priority-Based Sorting
- Every task can be assigned one of four priority levels:
  - 🔴 **Urgent (P0 / Critical)**
  - 🟠 **High (P1)**
  - 🔵 **Medium (P2)**
  - ⚪️ **Low (P3)**
- **Automatic Priority Sorting**: Tasks within each category column are strictly ordered from highest priority to lowest priority so urgent items always stay at the top.
- Additional sort options available via toolbar: Due Date, Estimated Time, Recently Added.

### 3. Time Estimation & Progress Monitoring
- Provide estimated duration in minutes/hours (with quick chips: 15m, 30m, 45m, 1h, 1.5h, 2h).
- Visible time budget progress indicator on running tasks.

### 4. Live Stopwatch & Time Calculation
- **In Progress Trigger**: When you start working on any task or move it to "In Progress", the live stopwatch timer automatically starts.
- **Persistent Elapsed Tracking**: Timer continues even if you refresh or reopen the tab.
- **Active Task HUD**: Sticky top banner displaying the active task, live ticking stopwatch (`HH:MM:SS`), progress against estimated budget, and quick Pause / Close buttons.
- **Closing & Calculation**: When you close or complete a task:
  - Automatically finalizes the timer.
  - Calculates the total actual time taken.
  - Compares against your initial estimate and highlights time saved or overtime.
  - Displays a summary celebration modal with exact duration metrics.

### 5. Reminder & Notification System
- Schedule reminders with specific date & time (with quick presets: +30m, +1h, Today 5:30 PM, Tomorrow 10:00 AM).
- **Web Audio Synthesizer**: Plays an alert chime without needing external audio downloads.
- **Desktop Notifications**: Native browser notification permission support.
- **Interactive In-App Alert Toast**: Provides quick actions to "Start Task Now" (moves to In Progress & starts timer) or "Snooze".
- Visual "Overdue" and "Due Soon" status tags.

### 6. Office Productivity Extras
- **Daily Standup Report Generator**: One-click markdown summary of what was completed today (with time spent), what's in progress, and upcoming priorities ready to paste into Slack, Microsoft Teams, or Email.
- **HTML5 Drag & Drop**: Drag cards between categories or between Kanban columns.
- **Dark & Light Modes**: Clean modern aesthetic with automatic persistence.
- **Backup & Restore**: Export all your tasks to JSON and import backups anytime.

---

## 🚀 How to Launch the Application

### Option A: Local Node.js Server (Recommended for auto-sync)
Run the built-in zero-dependency Node.js server:
```bash
npm start
```
*(or `node server.js`)*

Then open your browser to:
👉 **[http://localhost:3000](http://localhost:3000)**

This automatically syncs your tasks to `tasks.json` in this workspace.

### Option B: Direct Browser Launch (Standalone)
Double-click `index.html` or run:
```bash
open index.html
```
The app runs completely client-side using `localStorage` for instant offline persistence.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `N` | Open "New Task" modal |
| `/` | Focus search bar |
| `Escape` | Close any open modal |
| `Cmd + Enter` / `Ctrl + Enter` | Save and submit task form |

---

## 📁 File Structure

```
Private Task Handler/
├── index.html           # Modern responsive HTML5 UI
├── styles.css           # Design system (Dark/Light mode, badges, cards, HUD)
├── app.js               # Timer engine, priority queue, reminders & audio synthesis
├── server.js            # Zero-dependency local Node.js server & REST API
├── tasks.json           # Active task database (auto-created on first run)
├── sample_data.json     # Initial sample office tasks
├── package.json         # Project metadata and run scripts
└── README.md            # Documentation and instructions
```
