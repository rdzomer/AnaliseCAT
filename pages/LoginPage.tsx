// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import Select from '../components/Select';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { roleLabels } from '../constants';

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>(Role.ANALISTA);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isCreatingAccount) {
        await auth.signUp(email, password, name, selectedRole);
      } else {
        await auth.signIn(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao autenticar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
          CGIM Gestão de Pleitos
        </h2>
        <p className="text-center text-gray-600 mb-6">
          {isCreatingAccount
            ? 'Crie sua conta para acessar.'
            : 'Bem-vindo! Faça o login para continuar.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isCreatingAccount && (
            <>
              <Input
                label="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isCreatingAccount && (
            <Select
              label="Perfil de Acesso"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              options={Object.entries(roleLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              required
            />
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>
          )}
          <Button type="submit" className="w-full">
            {isCreatingAccount ? 'Criar Conta' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          {isCreatingAccount ? (
            <>
              Já tem uma conta?{' '}
              <button
                onClick={() => setIsCreatingAccount(false)}
                className="text-blue-600 hover:underline"
              >
                Faça o login
              </button>
            </>
          ) : (
            <>
              Não tem uma conta?{' '}
              <button
                onClick={() => setIsCreatingAccount(true)}
                className="text-blue-600 hover:underline"
              >
                Crie uma aqui
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
