

import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileTextIcon } from './icons/FileTextIcon';
import { TasksIcon } from './icons/TasksIcon';
import { DashboardIcon } from './icons/DashboardIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  requiredRoles?: Role[];
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, requiredRoles }) => {
  const auth = useAuth();

  if (!auth.user) return null;
  
  if (requiredRoles && !requiredRoles.includes(auth.user.role)) {
    return null;
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-md group transition-colors duration-150 ease-in-out
        ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`
      }
    >
      <span className="mr-3">{icon}</span>
      {label}
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-white shadow-lg h-full flex flex-col p-4 space-y-2">
      <div className="text-2xl font-bold text-blue-700 mb-6 px-2 py-3 border-b border-gray-200">
        CGIM
      </div>
      <nav className="flex-grow">
        <NavItem to="/pauta-cat" icon={<FileTextIcon className="w-5 h-5" />} label="Pauta CAT" />
        <NavItem to="/minhas-tarefas" icon={<TasksIcon className="w-5 h-5" />} label="Minhas Tarefas" requiredRoles={[Role.ANALISTA, Role.ADMIN]}/>
        <NavItem to="/dashboard" icon={<DashboardIcon className="w-5 h-5" />} label="Dashboard" /> {/* Removed requiredRoles to allow all */}
        <NavItem to="/configuracoes" icon={<SettingsIcon className="w-5 h-5" />} label="Configurações" requiredRoles={[Role.ADMIN, Role.GESTOR]}/>
      </nav>
      <div className="mt-auto p-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">&copy; {new Date().getFullYear()} CGIM</p>
      </div>
    </div>
  );
};

export default Sidebar;