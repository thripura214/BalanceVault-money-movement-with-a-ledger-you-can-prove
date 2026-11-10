const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  return localStorage.getItem('bv_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('bv_token', token);
  } else {
    localStorage.removeItem('bv_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

