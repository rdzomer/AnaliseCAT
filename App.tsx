import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MinhasTarefasPage from './pages/MinhasTarefasPage';
import PautaCatPage from './pages/PautaCatPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { APP_NAME } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Carregando autenticação...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header appName={APP_NAME} userName={user.name} />
        <main className="flex-1 overflow-auto p-4 bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/pauta-cat" />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/minhas-tarefas" element={<MinhasTarefasPage />} />
            <Route path="/pauta-cat" element={<PautaCatPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<Navigate to="/pauta-cat" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
