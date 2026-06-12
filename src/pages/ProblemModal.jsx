import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup';

const ProblemModal = ({ isOpen, onClose, role }) => {
  const [problems, setProblems] = useState([]);
  const [formData, setFormData] = useState({ name: '', problem: '' });

  useEffect(() => {
    if (isOpen && role === 'admin') {
      api.get('/problems').then(res => setProblems(res.data)).catch(err => console.error(err));
    }
  }, [isOpen, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/problems', { employeeName: formData.name, problem: formData.problem });
      alert("Problem reported successfully!");
      setFormData({ name: '', problem: '' }); // FIXED: Clear the form
      onClose();
    } catch (err) {
      console.error("Full error:", err);
      // FIXED: Alert now shows the explicit error string from the backend
      alert(`Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  if (!isOpen) return null;

  const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' };
  const modalStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', maxWidth: '90%' };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0 }}>{role === 'admin' ? "Employees' Problems" : "Report a Problem"}</h2>
        
        {role === 'employee' ? (
          <form onSubmit={handleSubmit}>
            <input placeholder="Your Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            <textarea placeholder="Describe your problem..." required value={formData.problem} onChange={(e) => setFormData({...formData, problem: e.target.value})} style={{ width: '100%', height: '100px', marginBottom: '10px', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit Report</button>
          </form>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {problems.length === 0 ? <p>No problems reported yet.</p> : problems.map(p => (
              <div key={p._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <strong style={{ display: 'block', color: '#1e293b' }}>{p.employeeName}</strong>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#475569' }}>{p.problem}</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
};

export default ProblemModal;