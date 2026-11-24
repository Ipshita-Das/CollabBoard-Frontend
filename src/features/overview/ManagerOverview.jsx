import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Send, KanbanSquare, CircleAlert, Inbox } from 'lucide-react';
import { analyticsApi, boardsApi, problemsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/roles';
import { timeAgo } from '../../utils/taskHelpers';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Avatar from '../../components/Avatar';
import { KpiGrid } from '../analytics/AnalyticsPage';
import { WorkloadChart } from '../analytics/charts';
import { BoardCard } from '../boards/BoardsPage';

const ManagerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [boards, setBoards] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([analyticsApi.get(), boardsApi.list(), problemsApi.list('open')])
      .then(([a, b, p]) => { if (!cancelled) { setStats(a); setBoards(b); setIssues(p); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load the overview.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageLoader label="Loading overview…" />;

  return (
    <div className="page">
      <PageHeader
        title="Overview"
        subtitle={`${isAdmin(user) ? 'All teams' : user.teamName || 'No team'} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
        actions={<>
          <button className="btn btn-secondary" onClick={() => navigate('/messages')}><Send size={15} /> Message team</button>
          <button className="btn btn-primary" onClick={() => navigate('/boards')}><KanbanSquare size={15} /> Boards</button>
        </>}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert size={16} />{error}</div>}

      {stats && <KpiGrid totals={stats.totals} />}

      <div className="overview-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h3>Open issues from employees</h3>
            <Link to="/issues" className="panel-link">View all <ArrowRight size={13} /></Link>
          </div>
          {issues.length === 0 ? (
            <div className="empty compact">
              <div className="empty-icon"><Inbox size={20} /></div>
              <p>No open issues. Your team isn't blocked.</p>
            </div>
          ) : (
            <div className="problem-list">
              {issues.slice(0, 4).map(p => (
                <Link to="/issues" key={p.id} className="problem-item problem-item-link">
                  <Avatar name={p.reporter.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="problem-head">
                      <strong>{p.reporter.name}</strong>
                      <span className="muted-note">{timeAgo(p.createdAt)}</span>
                      {p.task && <span className="badge">{p.task.title}</span>}
                    </div>
                    <p className="clamp-2">{p.message}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h3>Team workload</h3>
            <Link to="/analytics" className="panel-link">Analytics <ArrowRight size={13} /></Link>
          </div>
          {stats && <WorkloadChart rows={stats.byMember} />}
        </section>
      </div>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Boards<span className="count">{boards.length}</span></h2>
        <Link to="/boards" className="panel-link">All boards <ArrowRight size={13} /></Link>
      </div>
      {boards.length === 0 ? (
        <div className="empty compact">
          <p>No boards yet. <Link to="/boards">Create one</Link> to start assigning work.</p>
        </div>
      ) : (
        <div className="board-grid">
          {boards.slice(0, 6).map((b, i) => <BoardCard key={b.id} board={b} index={i} showTeam />)}
        </div>
      )}
    </div>
  );
};

export default ManagerOverview;
