import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup';

const EpicGeneratorModal = ({ isOpen, onClose, lists, boardId, onTasksGenerated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Automatically select the first list by default when the modal opens
  useEffect(() => {
    if (isOpen && lists && lists.length > 0) {
      setSelectedListId(lists[0]._id);
    }
  }, [isOpen, lists]);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!selectedListId) {
      setError("Please create at least one column on your board first!");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post('/tasks/breakdown', {
        epicTitle: title,
        epicDescription: description,
        listId: selectedListId, 
        boardId: boardId
      });

      onTasksGenerated(response.data.tasks);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate tasks.');
    } finally {
      setIsGenerating(false);
    }
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(3px)'
  };

  const modalStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    width: '450px',
    maxWidth: '90%',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          AI Epic Breakdown
        </h2>
        
        <form onSubmit={handleGenerate}>
          
          {/* NEW: Dropdown to select the target list */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Target Column</label>
            <select 
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: 'white' }}
              required
            >
              {lists.map(list => (
                <option key={list._id} value={list._id}>
                  {list.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Epic Title (The Big Goal)</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              placeholder="e.g., Build the Authentication System"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Context / Details (Optional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', height: '100px', resize: 'vertical' }}
              placeholder="Include JWT, Google OAuth..."
            />
          </div>

          {error && <p style={{ color: '#d93025', fontSize: '14px', marginBottom: '15px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isGenerating}
              style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isGenerating}
              style={{ padding: '10px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: isGenerating ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isGenerating ? 0.7 : 1 }}
            >
              {isGenerating ? 'Generating tasks...' : 'Generate Tasks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EpicGeneratorModal;