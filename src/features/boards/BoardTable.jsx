import { useState } from 'react';
import { X, LoaderCircle, CircleAlert, CircleCheck, Calendar, UserRound } from 'lucide-react';
import { tasksApi } from '../../api';
import { errorMessage } from '../../api/client';
import Avatar from '../../components/Avatar';
import { toLocalInputValue, fromLocalInputValue, isOverdue, isDueSoon, formatDueTime, byUrgency, priorityStyle } from '../../utils/taskHelpers';

export const TaskStatus = ({ task }) => {
  if (task.completed) return <span className="badge badge-success"><CircleCheck size={11} /> Done</span>;
  if (isOverdue(task)) return <span className="badge badge-danger">Overdue</span>;
  if (isDueSoon(task)) return <span className="badge badge-warn">Due soon</span>;
  if (task.dueDate) return <span className="badge">On track</span>;
  return <span className="badge">No deadline</span>;
};

// Table view of a board: managers assign people and deadlines inline; employees get a read-only view
const BoardTable = ({ lists, tasks, people, canManage, currentUserId, onTaskChange, onOpenTask }) => {
  const [filter, setFilter] = useState(canManage ? 'all' : 'mine');
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const listName = (id) => lists.find(l => l.id === id)?.title || '';

  const filters = canManage
    ? [
        { key: 'all', label: 'All', test: () => true },
        { key: 'unassigned', label: 'Unassigned', test: t => !t.assignee && !t.completed },
        { key: 'nodate', label: 'No deadline', test: t => !t.dueDate && !t.completed },
        { key: 'overdue', label: 'Overdue', test: isOverdue },
      ]
    : [
        { key: 'mine', label: 'Assigned to me', test: t => t.assignee?.id === currentUserId },
        { key: 'all', label: 'Everyone', test: () => true },
      ];

  const activeFilter = filters.find(f => f.key === filter) || filters[0];
  const rows = tasks.filter(activeFilter.test).sort(byUrgency);

  const save = async (task, fields) => {
    setSavingId(task.id);
    setError('');
    try {
      onTaskChange(await tasksApi.update(task.id, fields));
    } catch (err) {
      setError(errorMessage(err, 'Failed to save. Please try again.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="table-view">
      <div className="analytics-panel-head">
        <span className="muted-note">
          {canManage ? 'Assign each task and set its deadline. Changes save instantly.' : 'Assigned by your manager.'}
        </span>
        <div className="chip-filters" role="tablist">
          {filters.map(f => (
            <button key={f.key} type="button" role="tab" aria-selected={activeFilter.key === f.key}
              className={`chip ${activeFilter.key === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label} <span>{tasks.filter(f.test).length}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}

      {rows.length === 0 ? (
        <p className="member-empty">{activeFilter.key === 'mine' ? 'Nothing is assigned to you on this board yet.' : 'No tasks match this filter.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table assign-table">
            <thead>
              <tr>
                <th>Task</th>
                <th style={{ width: 200 }}>Assignee</th>
                <th style={{ width: 240 }}>Deadline</th>
                <th style={{ width: 90 }}>Priority</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => {
                const saving = savingId === t.id;
                const mine = t.assignee?.id === currentUserId;
                const priority = priorityStyle(t.priority);
                return (
                  <tr key={t.id} className={`${t.completed ? 'is-done' : ''} ${mine && !canManage ? 'is-mine' : ''}`}>
                    <td>
                      <button className="link-cell" onClick={() => onOpenTask(t.id)}>
                        <span className="task-title">{t.title}</span>
                        <span className="muted-note">{listName(t.listId)}</span>
                      </button>
                    </td>
                    <td>
                      {canManage ? (
                        <select className="select input-sm" value={t.assignee?.id || ''} disabled={saving}
                          onChange={(e) => save(t, { assigneeId: e.target.value ? Number(e.target.value) : null })}
                          aria-label={`Assignee for ${t.title}`}>
                          <option value="">Unassigned</option>
                          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : t.assignee ? (
                        <span className="person-cell"><Avatar name={t.assignee.name} size="sm" />{mine ? 'You' : t.assignee.name}</span>
                      ) : (
                        <span className="person-cell muted-note"><UserRound size={14} /> Unassigned</span>
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <div className="due-cell">
                          <input type="datetime-local" className="input input-sm" value={toLocalInputValue(t.dueDate)} disabled={saving}
                            onChange={(e) => { if (e.target.value) save(t, { dueDate: fromLocalInputValue(e.target.value) }); }}
                            aria-label={`Deadline for ${t.title}`} />
                          {t.dueDate ? (
                            <button className="icon-btn icon-btn-sm" onClick={() => save(t, { dueDate: null })} disabled={saving}
                              title="Clear deadline" aria-label={`Clear deadline for ${t.title}`}>
                              <X size={14} />
                            </button>
                          ) : <span className="icon-btn-sm" aria-hidden="true" />}
                        </div>
                      ) : t.dueDate ? (
                        <span className="person-cell"><Calendar size={14} />{formatDueTime(t.dueDate)}</span>
                      ) : <span className="muted-note">—</span>}
                    </td>
                    <td>{priority ? <span className={`badge ${priority.badge}`}>{priority.label}</span> : <span className="muted-note">—</span>}</td>
                    <td>{saving ? <LoaderCircle size={16} className="spin" /> : <TaskStatus task={t} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default BoardTable;
