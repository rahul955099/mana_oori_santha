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
  updateProfile: (updates: Partial<Pick<AuthUser, "name" | "email" | "mobile" | "profilePhoto">>) => void;
  /** Demo-mode password change: this app has no real password store, so this
   * only validates input and confirms the change was "applied". Wire up to a
   * real auth endpoint when one exists. */
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_auth_user";

function generateUserId(): string {
  return `MOS-${Math.floor(10000 + Math.random() * 89999)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser;
      // Backfill userId for sessions created before this field existed.
      return parsed.userId ? parsed : { ...parsed, userId: generateUserId() };
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
      userId: generateUserId(),
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
      userId: generateUserId(),
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
      userId: generateUserId(),
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

  function updateProfile(updates: Partial<Pick<AuthUser, "name" | "email" | "mobile" | "profilePhoto">>) {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  function changePassword(currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      return { success: false, message: "Please fill in both password fields." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters." };
    }
    return { success: true, message: "Password updated successfully." };
  }

  function deleteAccount() {
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, login, registerCustomer, registerSeller, logout, updateProfile, changePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
