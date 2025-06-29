import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileTextIcon }   from './icons/FileTextIcon';
import { TasksIcon }      from './icons/TasksIcon';
import { DashboardIcon }  from './icons/DashboardIcon';
import { SettingsIcon }   from './icons/SettingsIcon';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

/* ---------- ITEM ---------- */
interface ItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  requiredRoles?: Role[];
}

const Item: React.FC<ItemProps> = ({ to, label, icon, requiredRoles }) => {
  const { user } = useAuth();
  if (!user) return null;
  if (requiredRoles && !requiredRoles.includes(user.role)) return null;

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors
         ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`
      }
    >
      <span className="mr-3">{icon}</span>
      {label}
    </NavLink>
  );
};

/* ---------- SIDEBAR --------- */
const Sidebar: React.FC = () => (
  <aside className="w-64 h-full bg-white shadow-lg flex flex-col p-4 space-y-2">
    <h1 className="text-2xl font-bold text-blue-700 mb-6 px-2 py-3 border-b">CGIM</h1>

    <nav className="flex-grow">
      <Item to="/pauta-cat"      label="Pauta CAT"            icon={<FileTextIcon  className="w-5 h-5" />} />
      <Item to="/minhas-tarefas" label="Minhas Tarefas"       icon={<TasksIcon     className="w-5 h-5" />} requiredRoles={[Role.ANALISTA, Role.ADMIN]} />
      <Item to="/dashboard"      label="Dashboard"            icon={<DashboardIcon className="w-5 h-5" />} />
      <Item to="/configuracoes"  label="Configurações"        icon={<SettingsIcon  className="w-5 h-5" />} requiredRoles={[Role.ADMIN, Role.GESTOR]} />
    </nav>

    <footer className="mt-auto p-2 border-t">
      <p className="text-xs text-center text-gray-500">&copy; {new Date().getFullYear()} CGIM</p>
    </footer>
  </aside>
);

export default Sidebar;
