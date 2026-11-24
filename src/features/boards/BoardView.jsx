import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TriangleAlert, MessageSquareWarning, Trash2, Plus, X, ChevronRight, CircleAlert, Eye,
  Columns3, Table2, Pencil, UserRound, LoaderCircle, CircleCheck
} from 'lucide-react';
import { boardsApi, tasksApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { fromLocalInputValue } from '../../utils/taskHelpers';
import PageLoader from '../../components/PageLoader';
import Modal from '../../components/Modal';
import ReportProblemModal from '../../components/ReportProblemModal';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import BoardTable from './BoardTable';


// Inline "add task" form at the bottom of a column (managers): title, assignee and deadline in one go
const AddTaskForm = ({ people, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const ok = await onSubmit({ title: title.trim(), assigneeId: assigneeId ? Number(assigneeId) : null, dueDate: fromLocalInputValue(due) });
    setSaving(false);
    if (ok) { setTitle(''); setDue(''); }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <input autoFocus className="input input-sm" placeholder="What needs to be done?" maxLength={200} required
        value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} />
      <select className="select input-sm" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-label="Assign to">
        <option value="">Unassigned</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type="datetime-local" className="input input-sm" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Deadline" />
      <div className="inline-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <LoaderCircle size={14} className="spin" /> : 'Add task'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

const EditBoardModal = ({ board, onClose, onSaved }) => {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onSaved(await boardsApi.update(board.id, { title, description }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to save.'));
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} width={480} icon={<Pencil size={18} />} title="Edit board">
      <form className="modal-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="eb-title">Title</label>
          <input id="eb-title" className="input" maxLength={80} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="eb-desc">Description</label>
          <textarea id="eb-desc" className="textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
};

const BoardView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const [view, setView] = useState('kanban'); // 'kanban' | 'table'
  const [onlyMine, setOnlyMine] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingTaskToList, setAddingTaskToList] = useState(null);
  const [renamingListId, setRenamingListId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingBoard, setEditingBoard] = useState(false);
  const [reporting, setReporting] = useState(null); // { taskId } while the report modal is open
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropListId, setDropListId] = useState(null);

  const canManage = !!board?.canManage;
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const isMine = (t) => t.assignee?.id === user.id;
  const myTasks = tasks.filter(isMine);

  useEffect(() => {
    let cancelled = false;
    boardsApi.get(id)
      .then(data => {
        if (cancelled) return;
        setBoard(data.board);
        setLists(data.lists);
        setTasks(data.tasks);
        setPeople(data.people);
      })
      .catch(err => { if (!cancelled) setLoadError(errorMessage(err, 'Failed to load this board.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Run an action, showing any error in the banner. Returns true on success.
  const attempt = async (action, fallback) => {
    setActionError('');
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(errorMessage(err, fallback));
      return false;
    }
  };

  const handleTaskChange = (updated) => setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));

  const handleDeleteBoard = () => {
    if (!window.confirm(`Delete "${board.title}" and all of its tasks? This cannot be undone.`)) return;
    attempt(async () => { await boardsApi.remove(board.id); navigate('/boards'); }, 'Failed to delete board.');
  };

  const handleDeleteList = (list) => {
    const count = tasks.filter(t => t.listId === list.id).length;
    if (!window.confirm(`Delete the "${list.title}" column${count ? ` and its ${count} task${count === 1 ? '' : 's'}` : ''}?`)) return;
    attempt(async () => {
      await boardsApi.removeList(list.id);
      setLists(prev => prev.filter(l => l.id !== list.id));
      setTasks(prev => prev.filter(t => t.listId !== list.id));
    }, 'Failed to delete column.');
  };

  const handleCreateList = (e) => {
    e.preventDefault();
    attempt(async () => {
      const list = await boardsApi.addList(board.id, newListTitle);
      setLists(prev => [...prev, list]);
      setNewListTitle('');
      setIsAddingList(false);
    }, 'Failed to create column.');
  };

  const saveRename = (list) => {
    const title = renameValue.trim();
    setRenamingListId(null);
    if (!title || title === list.title) return;
    attempt(async () => {
      const updated = await boardsApi.renameList(list.id, title);
      setLists(prev => prev.map(l => (l.id === list.id ? updated : l)));
    }, 'Failed to rename column.');
  };

  const handleCreateTask = (listId, fields) => attempt(async () => {
    const task = await tasksApi.create({ listId, ...fields });
    setTasks(prev => [...prev, task]);
  }, 'Failed to create task.');

  const handleToggleComplete = (task) => attempt(async () => {
    handleTaskChange(await tasksApi.update(task.id, { completed: !task.completed }));
  }, 'Failed to update task.');

  // Drag and drop (managers): move the card right away, roll back if the server refuses
  const handleDrop = (listId) => {
    const task = tasks.find(t => t.id === dragTaskId);
    setDragTaskId(null);
    setDropListId(null);
    if (!task || task.listId === listId) return;
    const previous = task;
    handleTaskChange({ ...task, listId });
    attempt(async () => {
      try {
        handleTaskChange(await tasksApi.update(task.id, { listId }));
      } catch (err) {
        handleTaskChange(previous);
        throw err;
      }
    }, 'Failed to move task.');
  };

  if (loading) return <PageLoader label="Loading board…" />;

  if (loadError) return (
    <div className="error-screen">
      <div className="empty-icon"><TriangleAlert size={24} /></div>
      <h1>Can't open this board</h1>
      <p>{loadError}</p>
      <button className="btn btn-primary" onClick={() => navigate('/boards')}><ArrowLeft size={16} /> Back to boards</button>
    </div>
  );

  const visibleTasks = onlyMine ? myTasks : tasks;

  return (
    <div className="kanban-layout">
      <header className="board-bar">
        <div className="board-bar-left">
          <button onClick={() => navigate('/boards')} className="icon-btn" title="Back to boards" aria-label="Back to boards">
            <ArrowLeft size={18} />
          </button>
          <div className="board-title-block">
            <div className="crumbs">
              <button onClick={() => navigate('/boards')}>Boards</button>
              <ChevronRight size={12} />
              <span>{board.teamName} · {tasks.filter(t => t.completed).length}/{tasks.length} done</span>
            </div>
            <h1>{board.title}</h1>
          </div>
        </div>

        <div className="board-bar-actions">
          <div className="segmented view-toggle" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === 'kanban'} className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
              <Columns3 size={14} /> Board
            </button>
            <button type="button" role="tab" aria-selected={view === 'table'} className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <Table2 size={14} /> Table
            </button>
          </div>

          {!canManage && view === 'kanban' && (
            <button className={`btn btn-sm ${onlyMine ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOnlyMine(v => !v)}>
              <UserRound size={15} /><span className="btn-label">Only my tasks ({myTasks.length})</span>
            </button>
          )}

          {!canManage && (
            <button onClick={() => setReporting({ taskId: null })} className="btn btn-secondary btn-sm">
              <MessageSquareWarning size={15} /><span className="btn-label">Report problem</span>
            </button>
          )}

          {canManage && (
            <>
              <div className="bar-divider" />
              <button onClick={() => setEditingBoard(true)} className="icon-btn" title="Edit board" aria-label="Edit board"><Pencil size={16} /></button>
              <button onClick={handleDeleteBoard} className="icon-btn danger" title="Delete board" aria-label="Delete board"><Trash2 size={17} /></button>
            </>
          )}
        </div>
      </header>

      {!canManage && (
        <div className="role-banner">
          <Eye size={15} />
          <span>Your tasks are highlighted. Tick them off when you're done, and report a problem if you get stuck. Your manager assigns work and sets deadlines.</span>
        </div>
      )}

      {actionError && (
        <div className="action-error" role="alert">
          <CircleAlert size={16} /> {actionError}
          <button className="icon-btn icon-btn-sm" onClick={() => setActionError('')} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {notice && (
        <div className="action-notice" role="status">
          <CircleCheck size={16} /> {notice}
          <button className="icon-btn icon-btn-sm" onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {view === 'table' ? (
        <div className="board-table-wrap">
          <BoardTable lists={lists} tasks={tasks} people={people} canManage={canManage} currentUserId={user.id}
            onTaskChange={handleTaskChange} onOpenTask={setSelectedTaskId} />
        </div>
      ) : (
        <div className="kanban-canvas">
          {lists.map((list) => {
            const listTasks = visibleTasks.filter(t => t.listId === list.id);

            return (
              <section
                key={list.id}
                className={`kanban-column ${dropListId === list.id ? 'is-drop-target' : ''}`}
                onDragOver={canManage && dragTaskId ? (e) => { e.preventDefault(); setDropListId(list.id); } : undefined}
                onDragLeave={canManage ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropListId(null); } : undefined}
                onDrop={canManage ? (e) => { e.preventDefault(); handleDrop(list.id); } : undefined}
              >
                <div className="column-head">
                  <div className="column-title">
                    {renamingListId === list.id ? (
                      <input autoFocus className="input input-sm column-rename" value={renameValue} maxLength={60}
                        onChange={(e) => setRenameValue(e.target.value)} onBlur={() => saveRename(list)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenamingListId(null); }} />
                    ) : (
                      <h3 onDoubleClick={canManage ? () => { setRenamingListId(list.id); setRenameValue(list.title); } : undefined}
                        title={canManage ? 'Double-click to rename' : undefined}>
                        {list.title}
                      </h3>
                    )}
                    <span className="column-count">{listTasks.length}</span>
                  </div>
                  {canManage && (
                    <button onClick={() => handleDeleteList(list)} className="icon-btn icon-btn-sm danger" title="Delete column" aria-label={`Delete column ${list.title}`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="tasks-container">
                  {listTasks.length === 0 && addingTaskToList !== list.id && (
                    <div className="tasks-empty">{canManage && dragTaskId ? 'Drop here' : 'No tasks'}</div>
                  )}
                  {listTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      isMine={!canManage && isMine(t)}
                      onOpen={() => setSelectedTaskId(t.id)}
                      onToggleComplete={canManage || isMine(t) ? () => handleToggleComplete(t) : undefined}
                      draggable={canManage}
                      isDragging={dragTaskId === t.id}
                      onDragStart={canManage ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDragTaskId(t.id); } : undefined}
                      onDragEnd={canManage ? () => { setDragTaskId(null); setDropListId(null); } : undefined}
                    />
                  ))}
                </div>

                {canManage && (
                  <div className="add-task-container">
                    {addingTaskToList === list.id ? (
                      <AddTaskForm people={people} onSubmit={(fields) => handleCreateTask(list.id, fields)} onCancel={() => setAddingTaskToList(null)} />
                    ) : (
                      <button className="add-task-toggle" onClick={() => setAddingTaskToList(list.id)}>
                        <Plus size={15} /> Add task
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {canManage && (
            isAddingList ? (
              <form onSubmit={handleCreateList} className="inline-form add-list-form">
                <input autoFocus className="input input-sm" value={newListTitle} maxLength={60} required placeholder="Column title, e.g. Blocked"
                  onChange={(e) => setNewListTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setIsAddingList(false); }} />
                <div className="inline-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm">Add column</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsAddingList(false)}><X size={14} /></button>
                </div>
              </form>
            ) : (
              <button onClick={() => setIsAddingList(true)} className="add-list-toggle"><Plus size={16} /> Add column</button>
            )
          )}

          {lists.length === 0 && !canManage && (
            <div className="empty" style={{ margin: 'auto' }}>
              <h3>This board is empty</h3>
              <p>Your manager hasn't added anything yet.</p>
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          key={selectedTask.id}
          task={selectedTask}
          lists={lists}
          people={people}
          onClose={() => setSelectedTaskId(null)}
          onChange={handleTaskChange}
          onDelete={(taskId) => { setTasks(prev => prev.filter(t => t.id !== taskId)); setSelectedTaskId(null); }}
          canManage={canManage}
          canComplete={canManage || isMine(selectedTask)}
          onReportProblem={canManage ? undefined : (task) => { setSelectedTaskId(null); setReporting({ taskId: task.id }); }}
        />
      )}
      {editingBoard && (
        <EditBoardModal board={board} onClose={() => setEditingBoard(false)}
          onSaved={(updated) => { setBoard(updated); setEditingBoard(false); }} />
      )}
      {reporting && (
        <ReportProblemModal
          isOpen
          onClose={() => setReporting(null)}
          tasks={tasks}
          defaultTaskId={reporting.taskId}
          onReported={() => setNotice('Problem reported. Your manager will see it on their Issues page.')}
        />
      )}
    </div>
  );
};

export default BoardView;
