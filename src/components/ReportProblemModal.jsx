import { useState } from 'react';
import { MessageSquareWarning, Send, LoaderCircle, CircleAlert } from 'lucide-react';
import { problemsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

// Employees raise a problem with their manager, optionally about one of the given tasks
const ReportProblemModal = ({ isOpen, onClose, tasks = [], defaultTaskId = null, onReported }) => {
  const { refreshCounts } = useAuth();
  const [taskId, setTaskId] = useState(defaultTaskId ? String(defaultTaskId) : '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await problemsApi.create(message, taskId ? Number(taskId) : null);
      setMessage('');
      refreshCounts();
      onReported?.(created);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not send your report.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width={520}
      icon={<MessageSquareWarning size={20} />}
      iconTone="warn"
      title="Report a problem"
      subtitle="Blocked or stuck? Your manager sees this straight away on their Issues page."
    >
      <form className="modal-form" onSubmit={submit}>
        {tasks.length > 0 && (
          <div className="field">
            <label className="field-label" htmlFor="problem-task">Related task <span className="field-hint">(optional)</span></label>
            <select id="problem-task" className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">Not about a specific task</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}{t.boardTitle ? ` · ${t.boardTitle}` : ''}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor="problem-text">What's going on?</label>
          <textarea
            id="problem-text"
            className="textarea"
            placeholder="Describe the problem and what you need to get unblocked…"
            required
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>
        {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !message.trim()}>
            {submitting ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}
            Send report
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportProblemModal;
