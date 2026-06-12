import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup'; 

const AnalyticsDashboard = ({ isOpen, onClose, lists, tasks, setTasks }) => {
  const [localTasks, setLocalTasks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const lastListId = lists.length > 0 ? lists[lists.length - 1]._id : null;
      
      const interactiveTasks = tasks.map(t => {
        // Parse existing datetime-local string (YYYY-MM-DDTHH:MM) into distinct UI parts
        let datePart = '';
        let timePart = '';
        let amPmPart = 'AM';

        if (t.deadline) {
          // If the string format is standard datetime-local
          const parts = t.deadline.split('T');
          datePart = parts[0] || '';
          if (parts[1]) {
            let [hours, minutes] = parts[1].split(':');
            hours = parseInt(hours, 10);
            if (hours >= 12) {
              amPmPart = 'PM';
              hours = hours > 12 ? hours - 12 : hours;
            } else if (hours === 0) {
              hours = 12;
            }
            // Pad single digit hours
            const formattedHours = String(hours).padStart(2, '0');
            timePart = `${formattedHours}:${minutes}`;
          }
        }

        return {
          ...t,
          isCompleted: t.list === lastListId,
          assignee: t.assignee || '',
          deadlineDate: datePart,
          deadlineTime: timePart,
          deadlineAmPm: amPmPart
        };
      });
      setLocalTasks(interactiveTasks);
    }
  }, [isOpen, tasks, lists]);

  if (!isOpen) return null;

  // --- Handlers for User Interaction ---
  const toggleTaskCompletion = (taskId) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => {
        if (task._id === taskId) {
          const isNowCompleted = !task.isCompleted;
          return { 
            ...task, 
            isCompleted: isNowCompleted,
            list: isNowCompleted ? lists[lists.length - 1]._id : lists[0]._id 
          };
        }
        return task;
      })
    );
  };

  const updateAssignee = (taskId, newName) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === taskId ? { ...task, assignee: newName } : task
      )
    );
  };

  const updateDeadlineDate = (taskId, date) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === taskId ? { ...task, deadlineDate: date } : task
      )
    );
  };

  const updateDeadlineTime = (taskId, time) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === taskId ? { ...task, deadlineTime: time } : task
      )
    );
  };

  const updateDeadlineAmPm = (taskId, amPm) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task._id === taskId ? { ...task, deadlineAmPm: amPm } : task
      )
    );
  };

  // --- The Save Function (Sends to MongoDB) ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changedTasks = localTasks.filter(localT => {
        const originalT = tasks.find(t => t._id === localT._id);
        return (
          originalT.list !== localT.list || 
          (originalT.assignee || '') !== localT.assignee ||
          (originalT.deadline || '') !== buildCombinedDeadline(localT)
        );
      });

      await Promise.all(changedTasks.map(task => 
        api.put(`/tasks/${task._id}`, {
          listId: task.list,
          assignee: task.assignee,
          deadline: buildCombinedDeadline(task)
        })
      ));

      setTasks(localTasks.map(t => ({ ...t, deadline: buildCombinedDeadline(t) })));
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to merge date, time, and am/pm into datetime-local string (YYYY-MM-DDTHH:MM)
  const buildCombinedDeadline = (task) => {
    if (!task.deadlineDate || !task.deadlineTime) return '';
    
    let [hours, minutes] = task.deadlineTime.split(':');
    hours = parseInt(hours, 10);
    
    if (task.deadlineAmPm === 'PM' && hours < 12) {
      hours += 12;
    } else if (task.deadlineAmPm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const formattedHours = String(hours).padStart(2, '0');
    return `${task.deadlineDate}T${formattedHours}:${minutes}`;
  };

  // --- Dynamic Analytics Calculations ---
  const totalTasks = localTasks.length;
  const completedCount = localTasks.filter(t => t.isCompleted).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
  };

  const modalStyle = {
    backgroundColor: '#f8fafc',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    width: '1050px',
    maxWidth: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
        {/* Header with Save Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Task Management & Deadlines</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>
              &times;
            </button>
          </div>
        </div>

        {/* Top Section: Progress Summary */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#475569', fontSize: '14px', textTransform: 'uppercase' }}>Overall Progress</h3>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: progressPercentage === 100 ? '#10b981' : '#3b82f6' }}>
              {progressPercentage}%
            </span>
          </div>
          <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
            <div 
              style={{ width: `${progressPercentage}%`, backgroundColor: progressPercentage === 100 ? '#10b981' : '#3b82f6', height: '100%', transition: 'width 0.5s ease-in-out' }} 
            />
          </div>
          <p style={{ margin: '10px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            {completedCount} out of {totalTasks} tasks marked as done.
          </p>
        </div>

        {/* Full-Width Task Tracker */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxHeight: '450px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, color: '#475569', fontSize: '14px', textTransform: 'uppercase', marginBottom: '15px' }}>
            Task Execution & Deadlines
          </h3>
          
          {localTasks.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }}>No tasks on the board yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '12px' }}>
                  <th style={{ paddingBottom: '8px', width: '6%' }}>Done</th>
                  <th style={{ paddingBottom: '8px', width: '40%' }}>Task</th>
                  <th style={{ paddingBottom: '8px', width: '24%' }}>Assigned To</th>
                  <th style={{ paddingBottom: '8px', width: '30%' }}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {localTasks.map(task => (
                  <tr key={task._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 0' }}>
                      <input 
                        type="checkbox" 
                        checked={task.isCompleted}
                        onChange={() => toggleTaskCompletion(task._id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: task.isCompleted ? '#94a3b8' : '#334155', textDecoration: task.isCompleted ? 'line-through' : 'none' }}>
                      {task.title}
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <input 
                        type="text"
                        placeholder="Type name..."
                        value={task.assignee}
                        onChange={(e) => updateAssignee(task._id, e.target.value)}
                        style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: task.isCompleted ? '#f8fafc' : 'white', color: task.isCompleted ? '#94a3b8' : 'inherit' }}
                      />
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                          type="date"
                          value={task.deadlineDate}
                          onChange={(e) => updateDeadlineDate(task._id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: task.isCompleted ? '#f8fafc' : 'white', color: task.isCompleted ? '#94a3b8' : 'inherit' }}
                        />
                        <input 
                          type="time"
                          value={task.deadlineTime}
                          onChange={(e) => updateDeadlineTime(task._id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', width: '80px', backgroundColor: task.isCompleted ? '#f8fafc' : 'white', color: task.isCompleted ? '#94a3b8' : 'inherit' }}
                        />
                        <select 
                          value={task.deadlineAmPm}
                          onChange={(e) => updateDeadlineAmPm(task._id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: task.isCompleted ? '#f8fafc' : 'white', color: task.isCompleted ? '#94a3b8' : 'inherit' }}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;