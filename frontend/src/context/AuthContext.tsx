import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, UserRole } from "@/types";
import { api, getToken, setToken, ApiError } from "@/lib/api";

interface Result {
  success: boolean;
  message: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True while a saved session is being restored on page load. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<Result>;
  registerCustomer: (data: { name: string; mobile: string; email: string; password: string }) => Promise<Result>;
  registerSeller: (data: {
    name: string;
    shopName: string;
    mobile: string;
    email: string;
    location: string;
    password: string;
  }) => Promise<Result>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<AuthUser, "name" | "email" | "mobile" | "profilePhoto">>) => Promise<Result>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  deleteAccount: () => Promise<Result>;
  /** Re-reads the user from the server, e.g. after a seller edits their shop name. */
  refreshUser: () => Promise<void>;
}

/** The user as the API returns it. */
interface ApiUser {
  id: string;
  userCode: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImage?: string;
  sellerId?: string;
  shopName?: string;
  location?: string;
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    userId: u.userCode,
    name: u.name,
    email: u.email,
    mobile: u.phone,
    role: u.role,
    profilePhoto: u.profileImage,
    sellerId: u.sellerId,
    shopName: u.shopName,
    location: u.location,
  };
}

function failure(err: unknown): Result {
  return { success: false, message: err instanceof Error ? err.message : "Something went wrong." };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(() => getToken() !== null);

  useEffect(() => {
    // Old demo builds kept a fake user here; it is meaningless to the real API.
    try {
      localStorage.removeItem("mos_auth_user");
    } catch {
      // ignore
    }
    if (!getToken()) return;
    api
      .get<{ user: ApiUser }>("/auth/me")
      .then(({ user }) => setUser(toAuthUser(user)))
      .catch((err) => {
        // Only drop the session when the server rejected it, not on a network blip.
        if (err instanceof ApiError && err.status === 401) setToken(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  function startSession(data: { token: string; user: ApiUser }) {
    setToken(data.token);
    setUser(toAuthUser(data.user));
  }

  async function login(email: string, password: string) {
    try {
      startSession(await api.post("/auth/login", { email, password }));
      return { success: true, message: "Logged in successfully." };
    } catch (err) {
      return failure(err);
    }
  }

  async function registerCustomer(data: { name: string; mobile: string; email: string; password: string }) {
    try {
      startSession(
        await api.post("/auth/register", { name: data.name, email: data.email, phone: data.mobile, password: data.password })
      );
      return { success: true, message: "Account created successfully!" };
    } catch (err) {
      return failure(err);
    }
  }

  async function registerSeller(data: {
    name: string;
    shopName: string;
    mobile: string;
    email: string;
    location: string;
    password: string;
  }) {
    try {
      startSession(
        await api.post("/auth/register/seller", {
          name: data.name,
          email: data.email,
          phone: data.mobile,
          password: data.password,
          shopName: data.shopName,
          location: data.location,
        })
      );
      return { success: true, message: "Seller account created! An admin will verify your shop soon." };
    } catch (err) {
      return failure(err);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const { user } = await api.get<{ user: ApiUser }>("/auth/me");
    setUser(toAuthUser(user));
  }

  async function updateProfile(updates: Partial<Pick<AuthUser, "name" | "email" | "mobile" | "profilePhoto">>) {
    try {
      const { user } = await api.patch<{ user: ApiUser }>("/auth/me", {
        name: updates.name,
        email: updates.email,
        phone: updates.mobile,
        profileImage: updates.profilePhoto,
      });
      setUser(toAuthUser(user));
      return { success: true, message: "Profile updated successfully!" };
    } catch (err) {
      return failure(err);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      return { success: false, message: "Please fill in both password fields." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters." };
    }
    try {
      await api.patch("/auth/me/password", { currentPassword, newPassword });
      return { success: true, message: "Password updated successfully." };
    } catch (err) {
      return failure(err);
    }
  }

  async function deleteAccount() {
    try {
      await api.delete("/auth/me");
      logout();
      return { success: true, message: "Your account has been deleted." };
    } catch (err) {
      return failure(err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        registerCustomer,
        registerSeller,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
        refreshUser,
      }}
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
