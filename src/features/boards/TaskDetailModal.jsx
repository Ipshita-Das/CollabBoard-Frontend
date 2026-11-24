import { useState } from 'react';
import { SquareCheckBig, Plus, X, Trash2, LoaderCircle, CircleAlert, CircleCheck, Circle, MessageSquareWarning } from 'lucide-react';
import { tasksApi } from '../../api';
import { errorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import { toLocalInputValue, fromLocalInputValue, isOverdue, PRIORITY_OPTIONS } from '../../utils/taskHelpers';

// Every change is saved straight away; the parent receives the updated task via onChange.
// canManage: manager of the team (edits everything). canComplete: manager or the assignee.
const TaskDetailModal = ({ task, lists, people, onClose, onChange, onDelete, canManage, canComplete, onReportProblem }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [busy, setBusy] = useState(null); // name of the action in flight
  const [error, setError] = useState('');

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;

  // Run a request that resolves to the updated task
  const run = async (key, request) => {
    setBusy(key);
    setError('');
    try {
      onChange(await request());
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const update = (key, fields) => run(key, () => tasksApi.update(task.id, fields));

  const saveTitle = () => {
    if (!canManage) return;
    const trimmed = title.trim();
    if (!trimmed) return setTitle(task.title);
    if (trimmed !== task.title) update('title', { title: trimmed });
  };

  const saveDescription = () => {
    if (canManage && description !== (task.description || '')) update('description', { description });
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    if (await run('addSubtask', () => tasksApi.addSubtask(task.id, newSubtask.trim()))) setNewSubtask('');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setBusy('delete');
    try {
      await tasksApi.remove(task.id);
      onDelete(task.id);
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete task.'));
      setBusy(null);
    }
  };

  const overdue = isOverdue(task);

  return (
    <Modal
      isOpen
      onClose={onClose}
      width={820}
      icon={<SquareCheckBig size={20} />}
      title="Task details"
      subtitle={`${task.boardTitle ? `${task.boardTitle} · ` : ''}${lists.find(l => l.id === task.listId)?.title || task.listTitle || ''}${canManage || canComplete ? ' · changes save automatically' : ''}`}
    >
      <div className="task-detail">
        <div className="task-detail-main">
          <input
            className="task-title-input"
            readOnly={!canManage}
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            aria-label="Task title"
          />

          {(canManage || description) && (
            <div className="field">
              <label className="field-label" htmlFor="task-desc">Description / instructions</label>
              <textarea
                id="task-desc"
                readOnly={!canManage}
                className="textarea"
                placeholder={canManage ? 'Add details or instructions for the assignee…' : 'No description'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
              />
            </div>
          )}

          {(canManage || subtasks.length > 0) && (
            <div className="subtasks">
              <div className="subtasks-head">
                <div>
                  <span className="field-label">Checklist</span>
                  {subtasks.length > 0 && <span className="subtasks-count">{doneCount}/{subtasks.length}</span>}
                </div>
              </div>

              {subtasks.length > 0 && (
                <div className="progress-track" style={{ marginBottom: 10 }}>
                  <div className={`progress-fill ${doneCount === subtasks.length ? 'done' : ''}`} style={{ width: `${(doneCount / subtasks.length) * 100}%` }} />
                </div>
              )}

              <ul className="subtask-list">
                {subtasks.map(s => (
                  <li key={s.id} className={`subtask-row ${s.done ? 'is-done' : ''}`}>
                    <input
                      type="checkbox"
                      className="check"
                      checked={s.done}
                      onChange={() => run(`sub-${s.id}`, () => tasksApi.updateSubtask(task.id, s.id, { done: !s.done }))}
                      disabled={!canComplete}
                      aria-label={`Mark "${s.title}" as ${s.done ? 'not done' : 'done'}`}
                    />
                    <span className="subtask-title">{s.title}</span>
                    {canManage && (
                      <button type="button" className="icon-btn icon-btn-sm danger"
                        onClick={() => run(`del-${s.id}`, () => tasksApi.removeSubtask(task.id, s.id))}
                        aria-label={`Delete checklist item "${s.title}"`}>
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {canManage && (
                <form onSubmit={handleAddSubtask} className="subtask-add">
                  <input className="input input-sm" placeholder="Add a checklist item…" maxLength={200}
                    value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} disabled={busy === 'addSubtask'} />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={busy === 'addSubtask' || !newSubtask.trim()}>
                    <Plus size={14} /> Add
                  </button>
                </form>
              )}
            </div>
          )}

          {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
        </div>

        <aside className="task-detail-side">
          <button
            type="button"
            className={`status-toggle ${task.completed ? 'is-done' : ''}`}
            onClick={() => update('completed', { completed: !task.completed })}
            disabled={busy === 'completed' || !canComplete}
            title={canComplete ? undefined : 'Only the assignee or a manager can complete this task'}
          >
            {task.completed ? <CircleCheck size={18} /> : <Circle size={18} />}
            {task.completed ? 'Completed' : 'Mark complete'}
          </button>

          <div className="field">
            <label className="field-label" htmlFor="task-list">Status column</label>
            <select id="task-list" className="select input-sm" value={task.listId}
              onChange={(e) => update('list', { listId: Number(e.target.value) })} disabled={!canManage}>
              {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-assignee">Assigned to</label>
            {canManage ? (
              <select id="task-assignee" className="select input-sm" value={task.assignee?.id || ''}
                onChange={(e) => update('assignee', { assigneeId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Unassigned</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.jobTitle ? ` · ${p.jobTitle}` : ''}</option>)}
              </select>
            ) : (
              <input id="task-assignee" className="input input-sm" disabled value={task.assignee?.name || 'Unassigned'} />
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-due">
              Deadline {overdue && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Overdue</span>}
            </label>
            <div className="due-cell">
              <input id="task-due" type="datetime-local" className="input input-sm" value={toLocalInputValue(task.dueDate)}
                onChange={(e) => update('dueDate', { dueDate: fromLocalInputValue(e.target.value) })} disabled={!canManage} />
              {canManage && task.dueDate && (
                <button className="icon-btn icon-btn-sm" onClick={() => update('dueDate', { dueDate: null })} title="Clear deadline" aria-label="Clear deadline">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="select input-sm" value={task.priority || ''}
              onChange={(e) => update('priority', { priority: e.target.value || null })} disabled={!canManage}>
              <option value="">None</option>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {!canManage && (
            <p className="muted-note" style={{ margin: 0 }}>
              {canComplete
                ? 'Assigned to you. Tick off the checklist and mark it complete when done.'
                : 'View only. Your manager assigns tasks and sets deadlines.'}
            </p>
          )}

          {onReportProblem && (
            <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => onReportProblem(task)}>
              <MessageSquareWarning size={14} /> Report a problem
            </button>
          )}

          <div className="task-detail-saving">
            {busy ? <><LoaderCircle size={12} className="spin" /> Saving…</> : 'All changes saved'}
          </div>

          {canManage && (
            <button type="button" className="btn btn-danger btn-sm btn-block" onClick={handleDelete} disabled={busy === 'delete'}>
              <Trash2 size={14} /> Delete task
            </button>
          )}
        </aside>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
