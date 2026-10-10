function getApiUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (!url || ((url.includes('localhost') || url.includes('127.0.0.1')) && host !== 'localhost' && host !== '127.0.0.1')) {
      url = 'https://vartalaab-backend.onrender.com/api';
    }
  }
  if (!url) {
    url = 'http://localhost:5000/api';
  }
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

class ApiClient {
  private token: string | null = typeof window !== 'undefined' ? localStorage.getItem('echo_token') : null;

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('echo_token', token);
      } else {
        localStorage.removeItem('echo_token');
      }
    }
  }

  public getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('echo_token');
    }
    return this.token;
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const isFormData = options.body instanceof FormData;
    
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (isFormData) {
      delete headers['Content-Type'];
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  }

  public get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    return this.post<T>(endpoint, formData);
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
