import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, UserRole } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  login: (identifier: string, password: string) => { success: boolean; message: string };
  registerCustomer: (data: { name: string; mobile: string; email: string; password: string }) => void;
  registerSeller: (data: {
    name: string;
    shopName: string;
    mobile: string;
    email: string;
    location: string;
    password: string;
  }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  function login(identifier: string, password: string) {
    if (!identifier || !password) {
      return { success: false, message: "Please enter your credentials." };
    }
    let role: UserRole = "customer";
    if (identifier.toLowerCase().includes("admin")) role = "admin";
    else if (identifier.toLowerCase().includes("seller")) role = "seller";

    const mockUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: role === "admin" ? "Admin" : role === "seller" ? "Ramulu Naidu" : "Anita Reddy",
      email: identifier.includes("@") ? identifier : `${identifier}@example.com`,
      mobile: identifier.includes("@") ? "9876543210" : identifier,
      role,
      shopName: role === "seller" ? "Sri Lakshmi Organic Farms" : undefined,
      location: role === "seller" ? "Anantapur, Andhra Pradesh" : undefined,
    };
    setUser(mockUser);
    return { success: true, message: "Logged in successfully." };
  }

  function registerCustomer(data: { name: string; mobile: string; email: string; password: string }) {
    const mockUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      role: "customer",
    };
    setUser(mockUser);
  }

  function registerSeller(data: {
    name: string;
    shopName: string;
    mobile: string;
    email: string;
    location: string;
    password: string;
  }) {
    const mockUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      role: "seller",
      shopName: data.shopName,
      location: data.location,
    };
    setUser(mockUser);
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, registerCustomer, registerSeller, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
