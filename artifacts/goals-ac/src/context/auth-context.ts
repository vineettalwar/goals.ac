import { createContext } from "react";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  hasGeminiKey?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
