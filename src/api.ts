function getToken(): string | null {
  return localStorage.getItem('trainer_jwt');
}

function buildHeaders(): Record<string, string> {
  const t = getToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

async function handleResponse<T>(r: Response): Promise<T> {
  if (r.status === 401) {
    localStorage.removeItem('trainer_jwt');
    localStorage.removeItem('trainer_info');
    window.location.href = '/login';
    return {} as T;
  }
  return r.json() as Promise<T>;
}

export const api = {
  get<T>(url: string): Promise<T> {
    return fetch(url, { headers: buildHeaders() }).then((r) => handleResponse<T>(r));
  },
  post<T>(url: string, data: unknown): Promise<T> {
    return fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<T>(r));
  },
  put<T>(url: string, data: unknown): Promise<T> {
    return fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<T>(r));
  },
  del<T>(url: string): Promise<T> {
    return fetch(url, { method: 'DELETE', headers: buildHeaders() }).then((r) =>
      handleResponse<T>(r)
    );
  },
};
