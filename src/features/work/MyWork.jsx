import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ListTodo, CircleCheck, Circle, Calendar, MessageSquareWarning, Megaphone, ArrowRight,
  Users, Search, CircleAlert, UserRound
} from 'lucide-react';
import { tasksApi, messagesApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isOverdue, isDueSoon, formatDueTime, byUrgency, priorityStyle, timeAgo } from '../../utils/taskHelpers';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Avatar from '../../components/Avatar';
import ReportProblemModal from '../../components/ReportProblemModal';
import TaskDetailModal from '../boards/TaskDetailModal';
import { TaskStatus } from '../boards/BoardTable';

const StatTile = ({ label, value, tone }) => (
  <div className={`stat-card ${tone ? `tone-${tone}` : ''}`}>
    <div className="stat-card-top">{label}</div>
    <div className="stat-card-value">{value}</div>
  </div>
);

const MyTaskRow = ({ task, onToggle, onOpen, onReport, busy }) => {
  const priority = priorityStyle(task.priority);
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  return (
    <li className={`work-row ${task.completed ? 'is-done' : ''}`}>
      <button className={`task-check ${task.completed ? 'is-done' : ''}`} onClick={onToggle} disabled={busy}
        aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}>
        {task.completed ? <CircleCheck size={19} /> : <Circle size={19} />}
      </button>
      <button className="work-row-main" onClick={onOpen}>
        <span className="work-row-title">{task.title}</span>
        <span className="work-row-meta">
          {task.boardTitle} · {task.listTitle}
          {subtasks.length > 0 && ` · ${subtasks.filter(s => s.done).length}/${subtasks.length} checklist`}
        </span>
      </button>
      <div className="work-row-tags">
        {priority && <span className={`badge ${priority.badge}`}>{priority.label}</span>}
        {task.dueDate && (
          <span className={`badge ${overdue ? 'badge-danger' : isDueSoon(task) ? 'badge-warn' : ''}`}>
            <Calendar size={11} /> {overdue ? 'Overdue · ' : ''}{formatDueTime(task.dueDate)}
          </span>
        )}
      </div>
      {!task.completed && (
        <button className="icon-btn" onClick={onReport} title="Report a problem with this task" aria-label={`Report a problem with ${task.title}`}>
          <MessageSquareWarning size={16} />
        </button>
      )}
    </li>
  );
};

const MyWork = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mine, setMine] = useState([]);
  const [team, setTeam] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('mine');
  const [teamFilter, setTeamFilter] = useState('open');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([tasksApi.mine(), tasksApi.team(), messagesApi.inbox()])
      .then(([m, t, msgs]) => { if (!cancelled) { setMine(m); setTeam(t); setMessages(msgs); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your work.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const applyTask = (updated) => {
    setMine(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    setTeam(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  };

  const toggle = async (task) => {
    setBusyId(task.id);
    setError('');
    try {
      applyTask(await tasksApi.update(task.id, { completed: !task.completed }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to update the task.'));
    } finally {
      setBusyId(null);
    }
  };

  const teamRows = useMemo(() => {
    const tests = {
      open: t => !t.completed,
      overdue: isOverdue,
      done: t => t.completed,
      all: () => true,
    };
    const q = query.trim().toLowerCase();
    return team
      .filter(tests[teamFilter])
      .filter(t => !q || `${t.title} ${t.boardTitle} ${t.assignee?.name || ''}`.toLowerCase().includes(q))
      .sort(byUrgency);
  }, [team, teamFilter, query]);

  if (loading) return <PageLoader label="Loading your work…" />;

  const openMine = mine.filter(t => !t.completed).sort(byUrgency);
  const doneMine = mine.filter(t => t.completed);
  const unread = messages.filter(m => !m.read);
  const latest = unread[0] || messages[0];
  const openTask = mine.find(t => t.id === openTaskId) || team.find(t => t.id === openTaskId);

  return (
    <div className="page">
      <PageHeader
        title="My work"
        subtitle={user.teamName ? `${user.jobTitle || 'Team member'} · ${user.teamName}` : 'You are not on a team yet. Ask your admin to add you to one.'}
        actions={user.teamId && (
          <button className="btn btn-secondary" onClick={() => setReporting({ taskId: null })}>
            <MessageSquareWarning size={16} /> Report a problem
          </button>
        )}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert size={16} />{error}</div>}
      {notice && <div className="alert alert-success" style={{ marginBottom: 16 }}><CircleCheck size={16} />{notice}</div>}

      <div className="stats-grid">
        <StatTile label="Open" value={openMine.length} />
        <StatTile label="Due in 3 days" value={openMine.filter(t => isDueSoon(t)).length} />
        <StatTile label="Overdue" value={openMine.filter(isOverdue).length} tone={openMine.some(isOverdue) ? 'danger' : ''} />
        <StatTile label="Completed" value={doneMine.length} />
      </div>

      {latest && (
        <Link to="/messages" className={`instruction-banner ${latest.important ? 'is-important' : ''}`}>
          <Megaphone size={18} />
          <div>
            <span className="instruction-meta">
              {unread.length > 0 ? `${unread.length} unread · ` : ''}From {latest.sender.name} · {timeAgo(latest.createdAt)}
            </span>
            <strong>{latest.subject}</strong>
            <span className="instruction-body">{latest.body}</span>
          </div>
          <ArrowRight size={16} />
        </Link>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          <UserRound size={15} /> My tasks <span>{openMine.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'team'} className={tab === 'team' ? 'active' : ''} onClick={() => setTab('team')}>
          <Users size={15} /> Team tasks <span>{team.filter(t => !t.completed).length}</span>
        </button>
      </div>

      {tab === 'mine' ? (
        mine.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><ListTodo size={24} /></div>
            <h3>Nothing assigned to you yet</h3>
            <p>When your manager assigns you a task, it shows up here with its deadline.</p>
          </div>
        ) : (
          <>
            {openMine.length === 0 ? (
              <div className="empty" style={{ padding: '32px 20px' }}>
                <div className="empty-icon"><CircleCheck size={24} /></div>
                <h3>All caught up</h3>
                <p>You've completed everything assigned to you.</p>
              </div>
            ) : (
              <ul className="work-list">
                {openMine.map(t => (
                  <MyTaskRow key={t.id} task={t} busy={busyId === t.id} onToggle={() => toggle(t)}
                    onOpen={() => setOpenTaskId(t.id)} onReport={() => setReporting({ taskId: t.id })} />
                ))}
              </ul>
            )}
            {doneMine.length > 0 && (
              <details className="done-group">
                <summary>Completed ({doneMine.length})</summary>
                <ul className="work-list">
                  {doneMine.map(t => (
                    <MyTaskRow key={t.id} task={t} busy={busyId === t.id} onToggle={() => toggle(t)} onOpen={() => setOpenTaskId(t.id)} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )
      ) : (
        <section className="table-view">
          <div className="analytics-panel-head">
            <div className="input-icon-wrap search-box">
              <Search size={16} />
              <input className="input input-sm" placeholder="Search tasks, boards, people…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="chip-filters">
              {[['open', 'Open'], ['overdue', 'Overdue'], ['done', 'Done'], ['all', 'All']].map(([key, label]) => (
                <button key={key} className={`chip ${teamFilter === key ? 'active' : ''}`} onClick={() => setTeamFilter(key)}>{label}</button>
              ))}
            </div>
          </div>
          {teamRows.length === 0 ? (
            <p className="member-empty">No team tasks match.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Task</th><th style={{ width: 180 }}>Board</th><th style={{ width: 180 }}>Assignee</th><th style={{ width: 170 }}>Deadline</th><th style={{ width: 110 }}>Status</th></tr>
                </thead>
                <tbody>
                  {teamRows.map(t => {
                    const isMineRow = t.assignee?.id === user.id;
                    return (
                      <tr key={t.id} className={`${t.completed ? 'is-done' : ''} ${isMineRow ? 'is-mine' : ''}`}>
                        <td>
                          <button className="link-cell" onClick={() => setOpenTaskId(t.id)}>
                            <span className="task-title">{t.title}</span>
                            <span className="muted-note">{t.listTitle}</span>
                          </button>
                        </td>
                        <td><button className="board-link" onClick={() => navigate(`/boards/${t.boardId}`)}>{t.boardTitle}</button></td>
                        <td>
                          {t.assignee
                            ? <span className="person-cell"><Avatar name={t.assignee.name} size="sm" />{isMineRow ? 'You' : t.assignee.name}</span>
                            : <span className="muted-note">Unassigned</span>}
                        </td>
                        <td>{t.dueDate ? <span className="person-cell"><Calendar size={13} />{formatDueTime(t.dueDate)}</span> : <span className="muted-note">—</span>}</td>
                        <td><TaskStatus task={t} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {openTask && (
        <TaskDetailModal
          key={openTask.id}
          task={openTask}
          lists={[{ id: openTask.listId, title: openTask.listTitle }]}
          people={[]}
          onClose={() => setOpenTaskId(null)}
          onChange={applyTask}
          onDelete={() => setOpenTaskId(null)}
          canManage={false}
          canComplete={openTask.assignee?.id === user.id}
          onReportProblem={(task) => { setOpenTaskId(null); setReporting({ taskId: task.id }); }}
        />
      )}
      {reporting && (
        <ReportProblemModal
          isOpen
          onClose={() => setReporting(null)}
          tasks={[...openMine, ...team.filter(t => !t.completed && t.assignee?.id !== user.id)]}
          defaultTaskId={reporting.taskId}
          onReported={() => setNotice('Problem reported. Your manager will see it on their Issues page. Track it under My issues.')}
        />
      )}
    </div>
  );
};

export default MyWork;
