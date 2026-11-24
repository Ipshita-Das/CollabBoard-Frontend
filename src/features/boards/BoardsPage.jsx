import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, LoaderCircle, SearchX, CircleAlert, RotateCcw, X } from 'lucide-react';
import { boardsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isManager, isAdmin } from '../../utils/roles';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Modal from '../../components/Modal';
import TeamSelect, { useTeams } from '../../components/TeamSelect';

export const BoardCard = ({ board, showTeam }) => {
  const navigate = useNavigate();
  const pct = board.taskCount ? Math.round((board.completedCount / board.taskCount) * 100) : 0;
  return (
    <button onClick={() => navigate(`/boards/${board.id}`)} className="board-card">
      <div className="board-body">
        <h3>{board.title}</h3>
        <p>{board.description || 'No description provided.'}</p>
        <div className="board-progress">
          <div className="progress-track"><div className={`progress-fill ${pct === 100 ? 'done' : ''}`} style={{ width: `${pct}%` }} /></div>
          <span>{board.completedCount}/{board.taskCount} done</span>
        </div>
        <div className="board-foot">
          <span>
            {showTeam ? board.teamName : board.myTaskCount > 0 ? `${board.myTaskCount} assigned to you` : 'Nothing assigned to you'}
            {board.overdueCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{board.overdueCount} overdue</span>}
          </span>
        </div>
      </div>
    </button>
  );
};

const CreateBoardModal = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const [teams] = useTeams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const board = await boardsApi.create({ title, description, teamId: isAdmin(user) ? teamId : undefined });
      setTitle('');
      setDescription('');
      onCreated(board);
    } catch (err) {
      setError(errorMessage(err, 'Failed to create board.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width={480} icon={<Plus size={20} />} title="New board"
      subtitle="Starts with To do, In progress, Review and Done lists.">
      <form className="modal-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="board-title">Title</label>
          <input id="board-title" className="input" placeholder="e.g. Website Redesign" maxLength={80} required autoFocus
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="board-desc">Description <span className="field-hint">(optional)</span></label>
          <textarea id="board-desc" className="textarea" style={{ minHeight: 80 }} maxLength={500} placeholder="What is this board for?"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {isAdmin(user) ? (
          <div className="field">
            <label className="field-label" htmlFor="board-team">Team</label>
            <TeamSelect id="board-team" className="select" teams={teams} value={teamId} onChange={setTeamId} required />
          </div>
        ) : (
          <p className="muted-note" style={{ margin: 0 }}>This board will be visible to everyone in <strong>{user.teamName}</strong>.</p>
        )}
        {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim() || (isAdmin(user) && !teamId)}>
            {saving ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />} Create board
          </button>
        </div>
      </form>
    </Modal>
  );
};

const BoardsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = isManager(user);

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    boardsApi.list()
      .then(data => { if (!cancelled) setBoards(data); })
      .catch(err => { if (!cancelled) setLoadError(errorMessage(err, 'Failed to load boards.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageLoader label="Loading boards…" />;

  const filtered = boards.filter(b => `${b.title} ${b.description} ${b.teamName}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="page">
      <PageHeader
        title="Boards"
        subtitle={manager ? 'Plan work for your team. Open a board to add tasks, assign people and set deadlines.' : 'Boards of your team. Tasks assigned to you are highlighted.'}
        actions={manager && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New board</button>}
      />

      {boards.length > 0 && (
        <div className="toolbar">
          <div className="input-icon-wrap search-box">
            <Search size={16} />
            <input className="input" placeholder="Search boards…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="input-action" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
          </div>
        </div>
      )}

      {loadError ? (
        <div className="empty">
          <div className="empty-icon"><CircleAlert size={24} /></div>
          <h3>Couldn't load boards</h3>
          <p>{loadError}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}><RotateCcw size={15} /> Try again</button>
        </div>
      ) : boards.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><LayoutGrid size={24} /></div>
          <h3>No boards yet</h3>
          <p>{manager ? 'Create the first board for your team.' : 'Your manager hasn\'t created any boards for your team yet.'}</p>
          {manager && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New board</button>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><SearchX size={24} /></div>
          <h3>No matches</h3>
          <p>No boards match “{query}”.</p>
        </div>
      ) : (
        <div className="board-grid">
          {filtered.map((board, i) => <BoardCard key={board.id} board={board} index={i} showTeam={isAdmin(user)} />)}
        </div>
      )}

      {manager && (
        <CreateBoardModal
          isOpen={creating}
          onClose={() => setCreating(false)}
          onCreated={(board) => { setCreating(false); navigate(`/boards/${board.id}`); }}
        />
      )}
    </div>
  );
};

export default BoardsPage;
