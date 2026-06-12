import { Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import BoardView from './pages/BoardView';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Routes>
          {/* Your routing setup */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/board/:id" element={<BoardView />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;