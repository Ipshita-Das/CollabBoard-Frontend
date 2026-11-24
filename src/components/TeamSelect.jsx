import { useState, useEffect } from 'react';
import { teamsApi } from '../api';

// Teams the current user can see (admins: all of them). Returns [] until loaded.
// eslint-disable-next-line react-refresh/only-export-components
export const useTeams = () => {
  const [teams, setTeams] = useState([]);
  useEffect(() => {
    let cancelled = false;
    teamsApi.list().then(t => { if (!cancelled) setTeams(t); }).catch(() => { /* picker stays empty */ });
    return () => { cancelled = true; };
  }, []);
  return [teams, setTeams];
};

// value is a team id (number) or '' for "all teams" when allowAll is set
const TeamSelect = ({ teams, value, onChange, allowAll = false, id, className = 'select input-sm', required }) => (
  <select id={id} className={className} value={value ?? ''} required={required}
    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
    {allowAll ? <option value="">All teams</option> : <option value="" disabled>Choose a team…</option>}
    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
);

export default TeamSelect;
