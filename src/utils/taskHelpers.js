// --- Date helpers (due dates are stored as ISO strings, edited in the user's local time) ---

// ISO string -> value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm, local time)
export const toLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// <input type="datetime-local"> value -> ISO string (or null when cleared)
export const fromLocalInputValue = (value) => (value ? new Date(value).toISOString() : null);

export const isOverdue = (task) => !task.completed && !!task.dueDate && new Date(task.dueDate) < new Date();

export const isDueSoon = (task, days = 3) => {
  if (task.completed || !task.dueDate) return false;
  const diff = new Date(task.dueDate) - new Date();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

export const formatDue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
};

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', badge: 'badge-danger', accent: 'var(--danger)' },
  { value: 'medium', label: 'Medium', badge: 'badge-warn', accent: 'var(--warn)' },
  { value: 'low', label: 'Low', badge: 'badge-success', accent: 'var(--success)' },
];

export const priorityStyle = (value) => PRIORITY_OPTIONS.find(p => p.value === value?.toLowerCase());

// "just now", "5m ago", "3h ago", then a short date
export const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Open tasks first, then by due date (tasks without a date last)
export const byUrgency = (a, b) => {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (!a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1;
  return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
};

export const formatDueTime = (iso) =>
  iso ? `${formatDue(iso)}, ${new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '';
