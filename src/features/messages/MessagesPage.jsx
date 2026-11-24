import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, LoaderCircle, CircleAlert, CircleCheck, Inbox, Users, Megaphone, CheckCheck, Mail, MailOpen } from 'lucide-react';
import { messagesApi, teamsApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isManager, roleLabel } from '../../utils/roles';
import { timeAgo } from '../../utils/taskHelpers';
import PageHeader from '../../components/PageHeader';
import PageLoader from '../../components/PageLoader';
import Avatar from '../../components/Avatar';
import { useTeams } from '../../components/TeamSelect';

// Recipient picker values: "team:<id>" for a whole team, "user:<id>" for one person
const ComposeForm = ({ onSent, initialTo }) => {
  const { user } = useAuth();
  const [teams] = useTeams();
  const [people, setPeople] = useState([]);
  const [to, setTo] = useState(initialTo || (user.teamId ? `team:${user.teamId}` : ''));
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { teamsApi.people().then(setPeople).catch(() => { /* picker shows teams only */ }); }, []);

  const managedTeams = user.role === 'admin' ? teams : teams.filter(t => t.id === user.teamId);
  const recipients = people.filter(p => p.teamId);

  const submit = async (e) => {
    e.preventDefault();
    const [kind, id] = to.split(':');
    setSending(true);
    setError('');
    setNotice('');
    try {
      const sent = await messagesApi.send({
        subject, body, important,
        ...(kind === 'user' ? { recipientId: Number(id) } : { teamId: Number(id) }),
      });
      setSubject('');
      setBody('');
      setImportant(false);
      setNotice(sent.recipient ? `Sent to ${sent.recipient.name}.` : `Sent to everyone in ${sent.teamName}.`);
      onSent(sent);
    } catch (err) {
      setError(errorMessage(err, 'Failed to send the message.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="compose" onSubmit={submit}>
      <h3><Send size={16} /> New message</h3>
      <div className="field">
        <label className="field-label" htmlFor="msg-to">To</label>
        <select id="msg-to" className="select" value={to} onChange={(e) => setTo(e.target.value)} required>
          <option value="" disabled>Choose a team or person…</option>
          <optgroup label="Whole team">
            {managedTeams.map(t => <option key={t.id} value={`team:${t.id}`}>Everyone in {t.name}</option>)}
          </optgroup>
          {managedTeams.map(t => {
            const members = recipients.filter(p => p.teamId === t.id);
            return members.length > 0 && (
              <optgroup key={t.id} label={t.name}>
                {members.map(p => <option key={p.id} value={`user:${p.id}`}>{p.name}{p.jobTitle ? ` · ${p.jobTitle}` : ''}</option>)}
              </optgroup>
            );
          })}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="msg-subject">Subject</label>
        <input id="msg-subject" className="input" maxLength={150} required placeholder="e.g. Priorities for this week"
          value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="msg-body">Message / instructions</label>
        <textarea id="msg-body" className="textarea" style={{ minHeight: 140 }} maxLength={5000} required
          placeholder="Write your instructions…" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <label className="check-row">
        <input type="checkbox" className="check" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        Mark as important <span className="muted-note">(highlighted in their inbox and on their home page)</span>
      </label>
      {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
      {notice && <div className="alert alert-success"><CircleCheck size={16} />{notice}</div>}
      <button type="submit" className="btn btn-primary" disabled={sending || !to || !subject.trim() || !body.trim()}>
        {sending ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />} Send
      </button>
    </form>
  );
};

const MessageItem = ({ message, mode, expanded, onToggle }) => {
  const unread = mode === 'inbox' && !message.read;
  return (
    <li className={`message-item ${unread ? 'is-unread' : ''} ${message.important ? 'is-important' : ''} ${expanded ? 'is-open' : ''}`}>
      <button className="message-head" onClick={onToggle} aria-expanded={expanded}>
        <Avatar name={mode === 'inbox' ? message.sender.name : (message.recipient?.name || message.teamName || '?')} />
        <div className="message-summary">
          <div className="message-line">
            <strong>
              {mode === 'inbox'
                ? message.sender.name
                : message.recipient ? `To ${message.recipient.name}` : `To everyone in ${message.teamName}`}
            </strong>
            {message.important && <span className="badge badge-danger"><Megaphone size={11} /> Important</span>}
            {mode === 'inbox' && !message.recipient && <span className="badge"><Users size={11} /> Team</span>}
            <span className="muted-note message-time">{timeAgo(message.createdAt)}</span>
          </div>
          <div className="message-subject">{message.subject}</div>
          {!expanded && <div className="message-preview">{message.body}</div>}
        </div>
        {unread && <span className="unread-dot" aria-label="Unread" />}
      </button>
      {expanded && (
        <div className="message-body">
          <p>{message.body}</p>
          <div className="muted-note">
            {mode === 'inbox'
              ? `${roleLabel(message.sender.role)}${message.sender.jobTitle ? ` · ${message.sender.jobTitle}` : ''} · ${new Date(message.createdAt).toLocaleString()}`
              : <><CheckCheck size={13} /> Read by {message.readCount} of {message.audienceCount} · {new Date(message.createdAt).toLocaleString()}</>}
          </div>
        </div>
      )}
    </li>
  );
};

const MessagesPage = () => {
  const { user, refreshCounts } = useAuth();
  const manager = isManager(user);
  const [params] = useSearchParams();
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState(manager ? 'sent' : 'inbox');
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([messagesApi.inbox(), manager ? messagesApi.sent() : Promise.resolve([])])
      .then(([i, s]) => { if (!cancelled) { setInbox(i); setSent(s); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load messages.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [manager]);

  const toggle = async (message) => {
    const opening = openId !== message.id;
    setOpenId(opening ? message.id : null);
    if (opening && tab === 'inbox' && !message.read) {
      setInbox(prev => prev.map(m => (m.id === message.id ? { ...m, read: true } : m)));
      try { await messagesApi.markRead(message.id); refreshCounts(); } catch { /* stays read locally */ }
    }
  };

  const markAllRead = async () => {
    const unread = inbox.filter(m => !m.read);
    setInbox(prev => prev.map(m => ({ ...m, read: true })));
    await Promise.allSettled(unread.map(m => messagesApi.markRead(m.id)));
    refreshCounts();
  };

  if (loading) return <PageLoader label="Loading messages…" />;

  const unreadCount = inbox.filter(m => !m.read).length;
  const items = tab === 'inbox' ? inbox : sent;

  return (
    <div className="page">
      <PageHeader
        title={manager ? 'Messages' : 'Inbox'}
        subtitle={manager ? 'Send instructions to one person or your whole team, and see who has read them.' : 'Instructions and updates from your manager.'}
      />
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert size={16} />{error}</div>}

      <div className={manager ? 'messages-layout' : ''}>
        {manager && <ComposeForm initialTo={params.get('to')} onSent={(m) => { setSent(prev => [m, ...prev]); setTab('sent'); }} />}

        <section className="message-panel">
          <div className="message-panel-head">
            {manager ? (
              <div className="tabs tabs-sm" role="tablist">
                <button role="tab" aria-selected={tab === 'sent'} className={tab === 'sent' ? 'active' : ''} onClick={() => { setTab('sent'); setOpenId(null); }}>
                  <Send size={14} /> Sent <span>{sent.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'active' : ''} onClick={() => { setTab('inbox'); setOpenId(null); }}>
                  <Inbox size={14} /> Inbox <span>{unreadCount || inbox.length}</span>
                </button>
              </div>
            ) : (
              <h3>{unreadCount > 0 ? `${unreadCount} unread` : 'All read'}</h3>
            )}
            {tab === 'inbox' && unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}><MailOpen size={14} /> Mark all read</button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty compact">
              <div className="empty-icon"><Mail size={20} /></div>
              <p>{tab === 'sent' ? 'You haven\'t sent any messages yet.' : 'No messages yet.'}</p>
            </div>
          ) : (
            <ul className="message-list">
              {items.map(m => (
                <MessageItem key={m.id} message={m} mode={tab} expanded={openId === m.id} onToggle={() => toggle(m)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default MessagesPage;
