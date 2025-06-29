// src/components/Header.tsx

import React from 'react';
import { UserIcon } from './icons/UserIcon';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';
import { roleLabels } from '../constants';

interface HeaderProps {
  appName: string;
  userName: string;
}

const Header: React.FC<HeaderProps> = ({ appName, userName }) => {
  const auth = useAuth();

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center h-16">
      <h1 className="text-xl font-semibold text-gray-800">{appName}</h1>
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-gray-600">
          <UserIcon className="w-5 h-5 mr-2" />
          <span>
            {userName} ({roleLabels[auth.user?.role || ''] || auth.user?.role})
          </span>
        </div>
        <Button onClick={auth.signOut} variant="secondary" size="sm">
          Sair
        </Button>
      </div>
    </header>
  );
};

export default Header;
