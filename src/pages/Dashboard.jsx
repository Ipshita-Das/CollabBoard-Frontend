import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosSetup';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [isAiWriting, setIsAiWriting] = useState(false);
  
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await api.get('/boards');
        setBoards(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load boards. Please try logging in again.');
        setLoading(false);
      }
    };
    fetchBoards();
  }, []);

  const handleAutoDescription = async () => {
    if (!newBoardTitle) return alert("Enter a Board Title first!");
    setIsAiWriting(true);
    try {
      const res = await api.post('/tasks/ai-description', { title: newBoardTitle });
      setNewBoardDesc(res.data.description);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiWriting(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle) return;

    try {
      const response = await api.post('/boards', {
        title: newBoardTitle,
        description: newBoardDesc
      });
      setBoards([...boards, response.data]); 
      setNewBoardTitle('');
      setNewBoardDesc('');
    } catch (err) {
      console.error('Error creating board:', err);
      alert('Failed to create board. Check console.');
    }
  };

  if (loading) return <h2 style={{ padding: '60px' }}>Initializing systems...</h2>;
  
  if (error) return (
    <div style={{ padding: '60px', color: '#ff4c4c' }}>
      <h1>Access Denied</h1>
      <h3>{error}</h3>
      <button className="primary-button" onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>Log In</button>
    </div>
  );

  return (
    <div className="command-center">
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo-cb.png" alt="CollabBoard Logo" style={{ height: '45px', width: 'auto' }} />
          <h1 className="command-center-header" style={{ margin: 0 }}>CollabBoard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user && <span style={{ fontSize: '14px', color: '#64748b' }}>Logged in as <strong>{user.name}</strong></span>}
          <button onClick={logout} className="secondary-button" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none' }}>
            Logout
          </button>
        </div>
      </div>
      
      {/* FIXED: Only render Board Creation panel for Admins */}
      {user?.role === 'admin' && (
        <div className="deploy-panel">
          <h3>Deploy New Board</h3>
          
          <form onSubmit={handleCreateBoard} className="deploy-form">
            <input 
              type="text" 
              placeholder="Board Title (e.g. AI Integration)" 
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="clean-input" 
              style={{ flexGrow: 1 }} 
              required
            />
            
            <div style={{ display: 'flex', gap: '10px', flexGrow: 2 }}>
              <input 
                type="text" 
                placeholder="Brief Description" 
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                className="clean-input" 
                style={{ width: '100%' }}
              />
              <button 
                type="button" 
                onClick={handleAutoDescription} 
                className="secondary-button"
                disabled={isAiWriting}
              >
                {isAiWriting ? '...' : 'Auto-Write'}
              </button>
            </div>

            <button type="submit" className="primary-button">
              Create
            </button>
          </form>
        </div>
      )}

      <div className="board-grid">
        {boards.length === 0 ? (
          <p className="empty-state">No active projects found.</p>
        ) : (
          boards.map((board) => (
            <div 
              key={board._id}
              onClick={() => navigate(`/board/${board._id}`)}
              className="board-card" 
            >
              <h3>{board.title}</h3>
              <p>{board.description || 'No description provided.'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;