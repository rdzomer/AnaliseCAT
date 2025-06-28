import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { Role } from '../types';
import { APP_NAME } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>(Role.ANALISTA);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    if (!password) {
        setError("Por favor, insira a senha.");
        setIsLoading(false);
        return;
    }
    try {
      await auth.login(email, selectedRole, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha no login. Verifique suas credenciais e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only Gestor and Analista are selectable for login for non-admin users. Admin role is not listed here.
  const roleOptions = [
    { value: Role.GESTOR, label: Role.GESTOR },
    { value: Role.ANALISTA, label: Role.ANALISTA }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 p-4">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">{APP_NAME}</h1>
        <p className="text-center text-gray-600 mb-8">Bem-vindo! Selecione seu perfil e insira a senha.</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email (opcional para demo)"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@example.com"
          />
          <Select
            label="Perfil de Acesso"
            id="role"
            options={roleOptions}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            required
          />
          <Input
            label="Senha"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
          
          {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
          
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" color="text-white"/> : 'Entrar'}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-8 text-center">
          Senha para demonstração: CGIM2025
        </p>
      </div>
    </div>
  );
};

export default LoginPage;