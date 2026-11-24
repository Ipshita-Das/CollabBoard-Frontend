import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, LoaderCircle, CircleAlert, CircleCheck, Send, Trash2, Plus } from 'lucide-react';
import { teamsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isManager, isAdmin, roleLabel, ROLE_LABELS } from '../../utils/roles';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import TeamSelect, { useTeams } from '../../components/TeamSelect';

const AddMemberModal = ({ teams, defaultTeamId, onClose, onAdded }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', jobTitle: '', role: 'employee', teamId: defaultTeamId || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onAdded(await teamsApi.addMember({ ...form, teamId: isAdmin(user) ? form.teamId : undefined }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to add this person.'));
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} width={520} icon={<UserPlus size={20} />} title="Add a team member"
      subtitle="Creates their account. Share the email and password with them so they can log in.">
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="m-name">Full name</label>
            <input id="m-name" className="input" required maxLength={80} value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="m-title">Job title <span className="field-hint">(optional)</span></label>
            <input id="m-title" className="input" maxLength={80} placeholder="e.g. QA Engineer" value={form.jobTitle} onChange={set('jobTitle')} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="m-email">Email</label>
            <input id="m-email" type="email" className="input" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="m-pass">Temporary password</label>
            <input id="m-pass" className="input" required minLength={6} value={form.password} onChange={set('password')} placeholder="At least 6 characters" />
          </div>
          {isAdmin(user) && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="m-role">Role</label>
                <select id="m-role" className="select" value={form.role} onChange={set('role')}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="m-team">Team</label>
                <TeamSelect id="m-team" className="select" teams={teams} value={form.teamId}
                  onChange={(v) => setForm(f => ({ ...f, teamId: v }))} required={form.role !== 'admin'} />
              </div>
            </>
          )}
        </div>
        {!isAdmin(user) && <p className="muted-note" style={{ margin: 0 }}>They'll join <strong>{user.teamName}</strong> as an employee.</p>}
        {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <LoaderCircle size={16} className="spin" /> : <UserPlus size={16} />} Add member
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = isManager(user);
  const [teams, setTeams] = useTeams();
  const [teamId, setTeamId] = useState(user.teamId || '');
  const [members, setMembers] = useState([]);
  const [loadedTeamId, setLoadedTeamId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTeam, setNewTeam] = useState('');

  // Admins without a team start on the first team
  const activeTeamId = teamId || teams[0]?.id || '';

  useEffect(() => {
    if (!activeTeamId) return;
    let cancelled = false;
    teamsApi.members(activeTeamId)
      .then(m => { if (!cancelled) { setMembers(m); setError(''); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load the team.')); })
      .finally(() => { if (!cancelled) setLoadedTeamId(activeTeamId); });
    return () => { cancelled = true; };
  }, [activeTeamId]);

  const loading = !!activeTeamId && loadedTeamId !== activeTeamId;

  const team = teams.find(t => t.id === activeTeamId);
  const canManageThisTeam = isAdmin(user) || (manager && user.teamId === activeTeamId);

  const remove = async (member) => {
    if (!window.confirm(`Remove ${member.name}? Their account is deleted and their tasks become unassigned.`)) return;
    try {
      await teamsApi.removeMember(member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setNotice(`${member.name} was removed.`);
    } catch (err) {
      setError(errorMessage(err, 'Failed to remove this person.'));
    }
  };

  const changeRole = async (member, role) => {
    try {
      const updated = await teamsApi.updateMember(member.id, { role });
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, role: updated.role } : m)));
    } catch (err) {
      setError(errorMessage(err, 'Failed to change the role.'));
    }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const created = await teamsApi.create(newTeam);
      setTeams(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTeamId(created.id);
      setNewTeam('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to create the team.'));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={team?.name || user.teamName || 'Team'}
        subtitle={manager ? 'Everyone on the team and their current workload.' : 'The people you work with.'}
        actions={<>
          {isAdmin(user) && teams.length > 0 && <TeamSelect teams={teams} value={activeTeamId} onChange={setTeamId} />}
          {canManageThisTeam && activeTeamId && <button className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus size={16} /> Add member</button>}
        </>}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}><CircleAlert size={16} />{error}</div>}
      {notice && <div className="alert alert-success" style={{ marginBottom: 12 }}><CircleCheck size={16} />{notice}</div>}

      {loading ? <PageLoader label="Loading team…" /> : !activeTeamId ? (
        <div className="empty">
          <div className="empty-icon"><Users size={24} /></div>
          <h3>No team yet</h3>
          <p>{isAdmin(user) ? 'Create your first team below.' : 'Ask your admin to add you to a team.'}</p>
        </div>
      ) : (
        <div className="table-wrap card-surface">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th style={{ width: 150 }}>Role</th>
                <th style={{ width: 90 }}>Open</th>
                <th style={{ width: 90 }}>Overdue</th>
                <th style={{ width: 90 }}>Done</th>
                {manager && <th style={{ width: 100 }} aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="person-cell">
                      <Avatar name={m.name} />
                      <span className="member-info">
                        <strong>{m.name}{m.id === user.id && <span className="muted-note"> (you)</span>}</strong>
                        <span>{m.jobTitle ? `${m.jobTitle} · ` : ''}{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {isAdmin(user) && m.id !== user.id ? (
                      <select className="select input-sm" value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role of ${m.name}`}>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    ) : <span className={`badge ${m.role === 'employee' ? '' : 'badge-brand'}`}>{roleLabel(m.role)}</span>}
                  </td>
                  <td>{m.openTasks}</td>
                  <td>{m.overdueTasks > 0 ? <span className="badge badge-danger">{m.overdueTasks}</span> : 0}</td>
                  <td>{m.completedTasks}</td>
                  {manager && (
                    <td className="row-actions">
                      {m.id !== user.id && canManageThisTeam && (
                        <button className="icon-btn icon-btn-sm" title={`Message ${m.name}`} aria-label={`Message ${m.name}`}
                          onClick={() => navigate(`/messages?to=user:${m.id}`)}>
                          <Send size={14} />
                        </button>
                      )}
                      {m.id !== user.id && (isAdmin(user) || (canManageThisTeam && m.role === 'employee')) && (
                        <button className="icon-btn icon-btn-sm danger" title={`Remove ${m.name}`} aria-label={`Remove ${m.name}`} onClick={() => remove(m)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={6} className="member-empty">No one on this team yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin(user) && (
        <section className="analytics-panel" style={{ marginTop: 24 }}>
          <div className="analytics-panel-head">
            <div>
              <h3>Teams</h3>
              <span className="muted-note">Each team has its own boards. Managers and team leads control their team only.</span>
            </div>
          </div>
          <div className="team-chips">
            {teams.map(t => (
              <button key={t.id} className={`chip ${t.id === activeTeamId ? 'active' : ''}`} onClick={() => setTeamId(t.id)}>
                {t.name} <span>{t.memberCount}</span>
              </button>
            ))}
          </div>
          <form className="inline-row" onSubmit={createTeam}>
            <input className="input input-sm" placeholder="New team name" maxLength={80} required value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
            <button type="submit" className="btn btn-secondary btn-sm"><Plus size={14} /> Create team</button>
          </form>
        </section>
      )}

      {adding && (
        <AddMemberModal
          teams={teams}
          defaultTeamId={activeTeamId}
          onClose={() => setAdding(false)}
          onAdded={(person) => {
            setAdding(false);
            setNotice(`${person.name} was added. They can log in with ${person.email}.`);
            if (person.teamId === activeTeamId) {
              setMembers(prev => [...prev, { ...person, openTasks: 0, completedTasks: 0, overdueTasks: 0 }]);
            }
          }}
        />
      )}
    </div>
  );
};

export default TeamPage;
