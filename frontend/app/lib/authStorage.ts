export const storageKeys = {
  token: "rpms-token",
  email: "rpms-email",
  role: "rpms-role",
};

export type StoredAuth = {
  token: string | null;
  email: string | null;
  role: string | null;
};

export function readAuth(): StoredAuth {
  if (typeof window === "undefined") return { token: null, email: null, role: null };
  return {
    token: localStorage.getItem(storageKeys.token),
    email: localStorage.getItem(storageKeys.email),
    role: localStorage.getItem(storageKeys.role),
  };
}

export function writeAuth(token: string, email: string, role: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeys.token, token);
  localStorage.setItem(storageKeys.email, email);
  localStorage.setItem(storageKeys.role, role ?? "USER");
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKeys.token);
  localStorage.removeItem(storageKeys.email);
  localStorage.removeItem(storageKeys.role);
}
