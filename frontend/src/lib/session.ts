const TOKEN_KEY = "mb_token";

export interface SessionUser {
  _id: string;
  name: string;
  email: string;
  company?: string;
  onboardingCompleted?: boolean;
  country?: string;
  industry?: string[];
  goals?: string[];
}

export function getStoredToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function normalizeUser(payload: { user?: SessionUser } | SessionUser | null | undefined): SessionUser | null {
  if (!payload) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "user")) {
    return (payload as { user?: SessionUser }).user ?? null;
  }

  return payload as SessionUser;
}
