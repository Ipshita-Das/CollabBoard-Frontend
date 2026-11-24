import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, Calendar } from 'lucide-react';
import { analyticsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/roles';
import { formatDueTime, PRIORITY_OPTIONS } from '../../utils/taskHelpers';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import TeamSelect, { useTeams } from '../../components/TeamSelect';
import { TrendChart, WorkloadChart } from './charts';

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const KpiGrid = ({ totals }) => {
  const tiles = [
    { label: 'Total tasks', value: totals.total },
    { label: 'Completed', value: `${totals.completed}`, sub: `${pct(totals.completed, totals.total)}%` },
    { label: 'Overdue', value: totals.overdue, tone: totals.overdue ? 'danger' : '' },
    { label: 'Due in 3 days', value: totals.dueSoon },
    { label: 'Unassigned', value: totals.unassigned },
    { label: 'Open issues', value: totals.openIssues },
  ];
  return (
    <div className="stats-grid stats-grid-6">
      {tiles.map(t => (
        <div className={`stat-card ${t.tone ? `tone-${t.tone}` : ''}`} key={t.label}>
          <div className="stat-card-top">{t.label}</div>
          <div className="stat-card-value">{t.value}{t.sub && <span className="stat-card-sub">{t.sub}</span>}</div>
        </div>
      ))}
    </div>
  );
};

const AnalyticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams] = useTeams();
  const [teamId, setTeamId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    analyticsApi.get(teamId || undefined)
      .then(d => { if (!cancelled) { setData(d); setError(''); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load analytics.')); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (!data && !error) return <PageLoader label="Crunching numbers…" />;

  const totalOpen = data ? data.byPriority.reduce((s, p) => s + p.count, 0) : 0;
  const priorities = [...PRIORITY_OPTIONS, { value: 'none', label: 'No priority', accent: 'var(--faint)' }];

  return (
    <div className="page">
      <PageHeader
        title="Analytics"
        subtitle={isAdmin(user) ? (teamId ? teams.find(t => t.id === teamId)?.name : 'All teams') : user.teamName}
        actions={isAdmin(user) && <TeamSelect teams={teams} value={teamId} onChange={setTeamId} allowAll />}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert size={16} />{error}</div>}

      {data && (
        <>
          <KpiGrid totals={data.totals} />

          <div className="analytics-grid">
            <section className="analytics-panel analytics-panel-wide">
              <div className="analytics-panel-head">
                <div>
                  <h3>Weekly throughput</h3>
                  <span className="muted-note">Tasks created vs completed over the last 12 weeks</span>
                </div>
                {data.trend.demo && <span className="badge badge-info" title="Sample data until enough history is collected">Demo data</span>}
              </div>
              <TrendChart weeks={data.trend.weeks} />
            </section>

            <section className="analytics-panel">
              <div className="analytics-panel-head">
                <div>
                  <h3>Workload by person</h3>
                  <span className="muted-note">Assigned tasks, completed vs open</span>
                </div>
              </div>
              <WorkloadChart rows={data.byMember} />
            </section>

            <section className="analytics-panel">
              <div className="analytics-panel-head">
                <div>
                  <h3>Open tasks by priority</h3>
                  <span className="muted-note">{totalOpen} open tasks</span>
                </div>
              </div>
              {priorities.map(p => {
                const count = data.byPriority.find(b => b.priority === p.value)?.count || 0;
                return (
                  <div className="bar-row" key={p.value}>
                    <span className="bar-label">{p.label}</span>
                    <div className="split-bar"><span style={{ width: `${pct(count, totalOpen)}%`, background: p.accent, borderRadius: 4 }} /></div>
                    <span className="bar-value">{count}</span>
                  </div>
                );
              })}
            </section>

            <section className="analytics-panel analytics-panel-wide">
              <div className="analytics-panel-head">
                <div>
                  <h3>Deadlines this week</h3>
                  <span className="muted-note">Overdue or due within 7 days</span>
                </div>
              </div>
              {data.upcoming.length === 0 ? (
                <p className="member-empty">No deadlines coming up.</p>
              ) : (
                <ul className="attention-list">
                  {data.upcoming.map(t => {
                    const late = new Date(t.dueDate) < new Date();
                    return (
                      <li key={t.id}>
                        <button className="attention-row" onClick={() => navigate(`/boards/${t.boardId}`)}>
                          <span className="attention-title">{t.title}<span className="muted-note"> · {t.boardTitle}</span></span>
                          <span className="attention-meta">{t.assigneeName || <span className="muted-note">Unassigned</span>}</span>
                          <span className={`badge ${late ? 'badge-danger' : 'badge-warn'}`}><Calendar size={11} /> {late ? 'Overdue · ' : ''}{formatDueTime(t.dueDate)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
