

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import { PautaCatPage } from './pages/PautaCatPage'; // Changed to named import
import MinhasTarefasPage from './pages/MinhasTarefasPage';
import DashboardPage from './pages/DashboardPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import { useAuth } from './hooks/useAuth';
import { APP_NAME } from './constants';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: Role[] }> = ({ children, requiredRoles }) => {
  const auth = useAuth();
  if (!auth.user) { // auth itself is guaranteed to be defined
    return <Navigate to="/login" replace />;
  }
  if (requiredRoles && !requiredRoles.includes(auth.user.role)) {
     // Redirect to a more appropriate page or show an unauthorized message
    return <Navigate to="/" replace />; // Or to a specific "Unauthorized" page
  }
  return <>{children}</>;
};


const App: React.FC = () => {
  const auth = useAuth(); 
  
  const { user, loading } = auth;

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-xl font-semibold">Carregando...</div></div>;
  }

  if (!user) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header appName={APP_NAME} userName={user.nome} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/pauta-cat" replace />} />
              <Route path="/pauta-cat" element={<ProtectedRoute><PautaCatPage /></ProtectedRoute>} />
              <Route path="/minhas-tarefas" element={
                <ProtectedRoute requiredRoles={[Role.ANALISTA, Role.ADMIN]}>
                  <MinhasTarefasPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                 <ProtectedRoute> {/* Removed requiredRoles to allow all roles */}
                    <DashboardPage />
                 </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute requiredRoles={[Role.ADMIN, Role.GESTOR]}>
                  <ConfiguracoesPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} /> {/* Fallback route */}
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;