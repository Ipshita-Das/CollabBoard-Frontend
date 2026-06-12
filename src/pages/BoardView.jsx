import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosSetup';
import { useAuth } from '../context/AuthContext';
import EpicGeneratorModal from './EpicGeneratorModal'; 
import AnalyticsDashboard from './AnalyticsDashboard';
import ProblemModal from './ProblemModal';

const BoardView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRole = user?.role; 

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); 

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingTaskToList, setAddingTaskToList] = useState(null); 
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const [boardRes, listsRes, tasksRes] = await Promise.all([
          api.get(`/boards/${id}`),
          api.get(`/lists/${id}`),
          api.get(`/tasks/${id}`)
        ]);
        setBoard(boardRes.data);
        setLists(listsRes.data);
        setTasks(tasksRes.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load board data.");
        setLoading(false);
      }
    };
    fetchBoardData();
  }, [id]);

  const handleDeleteBoard = async () => {
    if (window.confirm("Are you sure you want to delete this board?")) {
      try {
        await api.delete(`/boards/${id}`);
        navigate('/');
      } catch (err) { alert("Failed to delete board."); }
    }
  };

  const handleDeleteList = async (listId) => {
    if (window.confirm("Delete this list?")) {
      try {
        await api.delete(`/lists/${listId}`);
        setLists(lists.filter(l => l._id !== listId));
      } catch (err) { alert("Failed to delete list."); }
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/lists', { title: newListTitle, boardId: id });
      setLists([...lists, response.data]);
      setNewListTitle('');
      setIsAddingList(false);
    } catch (err) { alert("Failed to create list."); }
  };

  const handleCreateTask = async (e, listId) => {
    e.preventDefault();
    try {
      const response = await api.post('/tasks', { title: newTaskTitle, listId: listId, boardId: id });
      setTasks([...tasks, response.data]);
      setNewTaskTitle('');
      setAddingTaskToList(null);
    } catch (err) { alert("Failed to create task."); }
  };

  const handleNewTasksGenerated = (newTasksFromBackend) => {
    setTasks(prevTasks => [...prevTasks, ...newTasksFromBackend]);
  };

  if (loading) return <h2 style={{ padding: '60px' }}>Loading...</h2>;

  return (
    <div className="kanban-layout">
      <div className="kanban-nav" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>{board?.title}</h2>
          
          <button onClick={() => setIsDashboardOpen(true)} className="secondary-button">Analytics</button>
          
          {/* FIXED: Restored Epic Generator button for Admins */}
          {userRole === 'admin' && (
            <button 
              onClick={() => setIsAiModalOpen(true)} 
              className="secondary-button"
              style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none' }}
            >
              Generate Epic
            </button>
          )}

          <button 
            onClick={() => setIsProblemModalOpen(true)} 
            className="secondary-button"
            style={{ backgroundColor: userRole === 'admin' ? '#ef4444' : '#f59e0b', color: 'white', border: 'none' }}
          >
            {userRole === 'admin' ? "View Problems" : "Report Problem"}
          </button>

          {userRole === 'admin' && (
            <button onClick={handleDeleteBoard} style={{ backgroundColor: '#7f1d1d', color: 'white', border: 'none' }} className="secondary-button">Delete Board</button>
          )}
        </div>

        <button onClick={logout} className="secondary-button" style={{ backgroundColor: '#475569', color: 'white', border: 'none' }}>Logout</button>
      </div>

      <div className="kanban-canvas">
        {lists.map(list => (
          <div key={list._id} className="kanban-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{list.title}</h3>
              {userRole === 'admin' && (
                <button onClick={() => handleDeleteList(list._id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
              )}
            </div>

            <div className="tasks-container">
              {tasks.filter(t => t.list === list._id).map(t => (
                <div key={t._id} className="task-card"><h4>{t.title}</h4></div>
              ))}
            </div>

            {userRole === 'admin' && (
              <div className="add-task-container">
                {addingTaskToList === list._id ? (
                  <form onSubmit={(e) => handleCreateTask(e, list._id)}>
                    <input autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} style={{ width: '100%', marginBottom: '5px' }} />
                    <button type="submit" className="primary-button">Add</button>
                    <button type="button" onClick={() => setAddingTaskToList(null)} style={{ marginLeft: '5px' }}>Cancel</button>
                  </form>
                ) : (
                  <button onClick={() => setAddingTaskToList(list._id)} style={{ width: '100%' }}>+ Add Task</button>
                )}
              </div>
            )}
          </div>
        ))}
        
        {userRole === 'admin' && (
          isAddingList ? (
            <form onSubmit={handleCreateList} style={{ minWidth: '300px' }}>
              <input autoFocus value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} placeholder="List Title..." />
              <button type="submit">Create List</button>
            </form>
          ) : (
            <button onClick={() => setIsAddingList(true)} style={{ minWidth: '300px' }}>+ Add List</button>
          )
        )}
      </div>

      {/* Modals */}
      <AnalyticsDashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} lists={lists} tasks={tasks} setTasks={setTasks} />
      <ProblemModal isOpen={isProblemModalOpen} onClose={() => setIsProblemModalOpen(false)} role={userRole} />
      
      {/* FIXED: Restored Epic Generator Component */}
      <EpicGeneratorModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)}
        lists={lists} 
        boardId={board?._id}
        onTasksGenerated={handleNewTasksGenerated}
      />
    </div>
  );
};

export default BoardView;