import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, Inbox, LoaderCircle, CircleCheck, RotateCcw, CircleAlert, MessageSquareWarning, ArrowRight, Plus } from 'lucide-react';
import { problemsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isManager, isAdmin } from '../../utils/roles';
import { timeAgo } from '../../utils/taskHelpers';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Avatar from '../../components/Avatar';
import ProblemStatusBadge from '../../components/ProblemStatusBadge';
import ReportProblemModal from '../../components/ReportProblemModal';

// Managers: every issue raised in their team, resolve with a reply.
// Employees: the issues they raised and the manager's response.
const IssuesPage = () => {
  const { user, refreshCounts } = useAuth();
  const navigate = useNavigate();
  const manager = isManager(user);

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(manager ? 'open' : 'all');
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null); // issue whose reply box is open
  const [note, setNote] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    problemsApi.list()
      .then(data => { if (!cancelled) setProblems(data); })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load issues.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setStatus = async (problem, status, resolutionNote = '') => {
    setSavingId(problem.id);
    setError('');
    setNotice('');
    try {
      const updated = await problemsApi.setStatus(problem.id, status, resolutionNote);
      setProblems(prev => prev.map(p => (p.id === problem.id ? updated : p)));
      setResolvingId(null);
      setNote('');
      setNotice(status === 'resolved'
        ? `Resolved. ${problem.reporter.name.split(' ')[0]} can see your reply on their My issues page.`
        : 'Issue reopened.');
      refreshCounts();
    } catch (err) {
      setError(errorMessage(err, 'Failed to update the issue.'));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <PageLoader label="Loading issues…" />;

  const openCount = problems.filter(p => p.status === 'open').length;
  const shown = problems.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="page page-narrow">
      <PageHeader
        title={manager ? 'Issues' : 'My issues'}
        subtitle={manager
          ? 'Problems your team members have reported. Resolve them with a short reply so they know what happened.'
          : 'Problems you have reported, and your manager\'s response.'}
        actions={!manager && user.teamId && (
          <button className="btn btn-primary" onClick={() => setReporting(true)}><Plus size={16} /> Report a problem</button>
        )}
      />

      <div className="toolbar">
        <div className="chip-filters">
          {[['open', `Open`, openCount], ['resolved', 'Resolved', problems.length - openCount], ['all', 'All', problems.length]].map(([key, label, n]) => (
            <button key={key} className={`chip ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label} <span>{n}</span></button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}><CircleAlert size={16} />{error}</div>}
      {notice && <div className="alert alert-success" style={{ marginBottom: 12 }}><CircleCheck size={16} />{notice}</div>}

      {shown.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Inbox size={22} /></div>
          <h3>{filter === 'open' ? 'All clear' : 'Nothing here yet'}</h3>
          <p>{manager
            ? (filter === 'open' ? 'No one on your team is blocked right now.' : 'Resolved issues will appear here.')
            : 'If something blocks your work, report it and your manager will be notified.'}</p>
        </div>
      ) : (
        <div className="issue-list">
          {shown.map(p => (
            <article key={p.id} className={`issue-card ${p.status === 'resolved' ? 'is-resolved' : ''}`}>
              <div className="issue-head">
                <Avatar name={p.reporter.name} />
                <div className="issue-who">
                  <strong>{manager ? p.reporter.name : 'You'}</strong>
                  <span className="muted-note">
                    {manager && p.reporter.jobTitle ? `${p.reporter.jobTitle} · ` : ''}
                    {isAdmin(user) ? `${p.teamName} · ` : ''}{timeAgo(p.createdAt)}
                  </span>
                </div>
                <ProblemStatusBadge status={p.status} />
              </div>

              {p.task && (
                <button className="issue-task" onClick={() => navigate(`/boards/${p.task.boardId}`)}>
                  <TriangleAlert size={13} /> {p.task.title} <span className="muted-note">· {p.task.boardTitle}</span> <ArrowRight size={12} />
                </button>
              )}

              <p className="issue-message">{p.message}</p>

              {p.status === 'resolved' && (
                <div className="issue-resolution">
                  <CircleCheck size={15} />
                  <div>
                    <strong>Resolved by {p.resolvedBy?.name || 'a manager'}</strong> <span className="muted-note">· {timeAgo(p.resolvedAt)}</span>
                    {p.resolutionNote && <p>{p.resolutionNote}</p>}
                  </div>
                </div>
              )}

              {manager && (
                resolvingId === p.id ? (
                  <form className="issue-reply" onSubmit={(e) => { e.preventDefault(); setStatus(p, 'resolved', note); }}>
                    <textarea autoFocus className="textarea" style={{ minHeight: 70 }} maxLength={1000}
                      placeholder={`Reply to ${p.reporter.name.split(' ')[0]} (optional): what did you do about it?`}
                      value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="form-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResolvingId(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={savingId === p.id}>
                        {savingId === p.id ? <LoaderCircle size={14} className="spin" /> : <CircleCheck size={14} />} Mark resolved
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="issue-actions">
                    {p.status === 'open' ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setResolvingId(p.id); setNote(''); }}>
                        <CircleCheck size={14} /> Resolve
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p, 'open')} disabled={savingId === p.id}>
                        {savingId === p.id ? <LoaderCircle size={14} className="spin" /> : <RotateCcw size={14} />} Reopen
                      </button>
                    )}
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}

      {reporting && (
        <ReportProblemModal isOpen onClose={() => setReporting(false)}
          onReported={(created) => { setProblems(prev => [created, ...prev]); setFilter('open'); }} />
      )}
      {!manager && !user.teamId && (
        <p className="muted-note"><MessageSquareWarning size={13} /> You need to be on a team to report problems.</p>
      )}
    </div>
  );
};

export default IssuesPage;
