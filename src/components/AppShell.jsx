import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, KanbanSquare, ChartColumn, MessagesSquare, TriangleAlert, Users, LogOut, ListTodo, Inbox, Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isManager, roleLabel } from '../utils/roles';
import Avatar from './Avatar';

const managerNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/boards', label: 'Boards', icon: KanbanSquare },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/issues', label: 'Issues', icon: TriangleAlert, badge: 'openIssues' },
  { to: '/team', label: 'Team', icon: Users },
];

const employeeNav = [
  { to: '/', label: 'My work', icon: ListTodo, end: true },
  { to: '/boards', label: 'Boards', icon: KanbanSquare },
  { to: '/messages', label: 'Inbox', icon: Inbox, badge: 'unreadMessages' },
  { to: '/issues', label: 'My issues', icon: TriangleAlert },
  { to: '/team', label: 'Team', icon: Users },
];

const AppShell = () => {
  const { user, logout, counts } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = isManager(user) ? managerNav : employeeNav;

  return (
    <div className={`shell ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="brand-lockup">
            <img src="/logo-cb.png" alt="" />
            <span>CollabBoard</span>
          </NavLink>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="sidebar-team">
          <span className="sidebar-team-label">{user.role === 'admin' ? 'Workspace' : 'Team'}</span>
          <strong>{user.role === 'admin' ? 'All teams' : (user.teamName || 'No team yet')}</strong>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              {badge && counts[badge] > 0 && <span className="nav-badge">{counts[badge]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <Avatar name={user.name} />
          <div className="sidebar-user-text">
            <strong>{user.name}</strong>
            <span>{roleLabel(user.role)}{user.jobTitle ? ` · ${user.jobTitle}` : ''}</span>
          </div>
          <button onClick={logout} className="icon-btn" title="Log out" aria-label="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="shell-backdrop" onClick={() => setMenuOpen(false)} />

      <div className="shell-main">
        <header className="mobile-bar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="brand-lockup"><img src="/logo-cb.png" alt="" /><span>CollabBoard</span></span>
        </header>
        <Outlet />
      </div>
    </div>
  );
};

export default AppShell;
