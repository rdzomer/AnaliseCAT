import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Role } from '../types';
import { MOCK_USUARIOS } from '../constants'; // For mock login

const FIXED_PASSWORD = "CGIM2025";

export interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, role: Role, password?: string) => Promise<void>; // Added password
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a logged-in user (e.g., from localStorage)
    const storedUser = localStorage.getItem('cgimUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('cgimUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, role: Role, password?: string) => {
    setLoading(true);
    
    if (password !== FIXED_PASSWORD) {
      setLoading(false);
      throw new Error("Senha inválida.");
    }

    // Simulate API call for login
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Attempt to find user by email and role (if email is provided)
    let foundUser = email 
      ? MOCK_USUARIOS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role)
      : undefined;
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('cgimUser', JSON.stringify(foundUser));
    } else {
      // If no exact match or email not provided, find a generic user for the selected role for demo purposes.
      // This is primarily for the simplified login where email is optional.
      const demoUserForRole = MOCK_USUARIOS.find(u => u.role === role);
      if (demoUserForRole) {
        // Create a simulated user profile if an exact email match wasn't found but role is valid.
        const simulatedUser: Usuario = {
          ...demoUserForRole, // base profile for the role
          email: email || demoUserForRole.email, // use provided email or fallback
          nome: email ? `Usuário ${role}` : demoUserForRole.nome, // generic name if new email
        };
        setUser(simulatedUser);
        localStorage.setItem('cgimUser', JSON.stringify(simulatedUser));
      } else {
        setLoading(false);
        throw new Error("Perfil de usuário não encontrado para demonstração com este e-mail/perfil.");
      }
    }
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cgimUser');
    // Here you would typically redirect to login page, HashRouter handles this
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};