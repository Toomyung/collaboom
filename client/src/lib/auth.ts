import { Influencer, Admin } from "@shared/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "influencer" | "admin";
};

export type AuthState = {
  user: AuthUser | null;
  influencer: Influencer | null;
  admin: Admin | null;
  isLoading: boolean;
};

export async function getCurrentUser(): Promise<AuthState> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      return { user: null, influencer: null, admin: null, isLoading: false };
    }
    const data = await res.json();
    return { ...data, isLoading: false };
  } catch {
    return { user: null, influencer: null, admin: null, isLoading: false };
  }
}

export async function loginInfluencer(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/influencer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || "Login failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function registerInfluencer(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/influencer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || "Registration failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || "Login failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
