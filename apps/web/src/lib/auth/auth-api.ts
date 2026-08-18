import { UserRole } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { setAccessToken } from "../api/token-holder";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const session = await apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAccessToken(session.accessToken);
  return session.user;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export async function refreshSession(): Promise<AuthUser | null> {
  try {
    const session = await apiRequest<AuthSessionResponse>("/auth/refresh", {
      method: "POST",
      skipAuthRetry: true,
    });
    setAccessToken(session.accessToken);
    return session.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}
