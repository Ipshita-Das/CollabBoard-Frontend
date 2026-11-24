import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, ManagerRoute, RoleSwitch } from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoginPage from './features/auth/LoginPage';
import ManagerOverview from './features/overview/ManagerOverview';
import MyWork from './features/work/MyWork';
import BoardsPage from './features/boards/BoardsPage';
import BoardView from './features/boards/BoardView';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import MessagesPage from './features/messages/MessagesPage';
import IssuesPage from './features/issues/IssuesPage';
import TeamPage from './features/team/TeamPage';

// Remount the board screen when switching boards so no stale data shows
const BoardRoute = () => {
  const { id } = useParams();
  return <BoardView key={id} />;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<RoleSwitch manager={<ManagerOverview />} employee={<MyWork />} />} />
          <Route path="boards" element={<BoardsPage />} />
          <Route path="boards/:id" element={<BoardRoute />} />
          <Route path="analytics" element={<ManagerRoute><AnalyticsPage /></ManagerRoute>} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="team" element={<TeamPage />} />
        </Route>
        {/* Old links */}
        <Route path="/board/:id" element={<Navigate to="/boards" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
