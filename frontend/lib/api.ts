const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        success: false,
        error: { code: 'UNKNOWN', message: 'An error occurred' },
      }));
      throw new Error(error.error?.message || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text);
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{
      accessToken: string;
      user: { id: string; email: string; name: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.request<{
      accessToken: string;
      user: { id: string; email: string; name: string; role: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{ id: string; email: string; name: string; role: string }>('/auth/me');
  }

  // Projects
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async getProject(projectKey: string) {
    return this.request<any>(`/projects/${projectKey}`);
  }

  async createProject(data: { name: string; projectKey: string; description?: string }) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(projectKey: string, data: { name?: string; description?: string }) {
    return this.request<any>(`/projects/${projectKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectKey: string) {
    return this.request<void>(`/projects/${projectKey}`, {
      method: 'DELETE',
    });
  }

  // Workflows
  async getWorkflows(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/workflows`);
  }

  async getWorkflow(projectKey: string, workflowKey: string) {
    return this.request<any>(`/projects/${projectKey}/workflows/${workflowKey}`);
  }

  async createWorkflow(projectKey: string, data: { name: string; workflowKey: string; tags?: string[] }) {
    return this.request<any>(`/projects/${projectKey}/workflows`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadWorkflowJson(projectKey: string, workflowKey: string, file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_URL}/api/projects/${projectKey}/workflows/${workflowKey}/upload-json`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async getWorkflowVersions(projectKey: string, workflowKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/workflows/${workflowKey}/versions`);
  }

  async downloadWorkflowVersion(projectKey: string, workflowKey: string, version: number) {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/api/projects/${projectKey}/workflows/${workflowKey}/versions/${version}/download`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.text();
  }

  async compareWorkflowVersions(projectKey: string, workflowKey: string, from: number, to: number) {
    return this.request<{ from: any; to: any }>(
      `/projects/${projectKey}/workflows/${workflowKey}/compare?from=${from}&to=${to}`
    );
  }

  // Webhooks
  async getWebhooks(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/webhooks`);
  }

  async getWebhook(projectKey: string, hookKey: string) {
    return this.request<any>(`/projects/${projectKey}/webhooks/${hookKey}`);
  }

  async createWebhook(projectKey: string, data: any) {
    return this.request<{ webhook: any; secret: string }>(`/projects/${projectKey}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebhook(projectKey: string, hookKey: string, data: any) {
    return this.request<any>(`/projects/${projectKey}/webhooks/${hookKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async rotateWebhookSecret(projectKey: string, hookKey: string) {
    return this.request<{ secret: string }>(`/projects/${projectKey}/webhooks/${hookKey}/rotate-secret`, {
      method: 'POST',
    });
  }

  async getWebhookEvents(projectKey: string, hookKey: string, params?: { status?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ events: any[]; total: number }>(
      `/projects/${projectKey}/webhooks/${hookKey}/events${query ? `?${query}` : ''}`
    );
  }

  async replayWebhookEvent(projectKey: string, hookKey: string, eventId: string) {
    return this.request<any>(
      `/projects/${projectKey}/webhooks/${hookKey}/events/${eventId}/replay`,
      { method: 'POST' }
    );
  }

  // Documents
  async getDocuments(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/docs`);
  }

  async getDocument(projectKey: string, docId: string) {
    return this.request<any>(`/projects/${projectKey}/docs/${docId}`);
  }

  async createDocument(projectKey: string, data: { title: string; docType?: string; contentMd?: string }) {
    return this.request<any>(`/projects/${projectKey}/docs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(projectKey: string, docId: string, data: any) {
    return this.request<any>(`/projects/${projectKey}/docs/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(projectKey: string, docId: string) {
    return this.request<void>(`/projects/${projectKey}/docs/${docId}`, {
      method: 'DELETE',
    });
  }

  // Secrets
  async getSecrets(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/secrets`);
  }

  async createSecret(projectKey: string, data: { key: string; value: string }) {
    return this.request<any>(`/projects/${projectKey}/secrets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSecret(projectKey: string, secretId: string) {
    return this.request<void>(`/projects/${projectKey}/secrets/${secretId}`, {
      method: 'DELETE',
    });
  }

  // Chat
  async getChatSessions(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/chat/sessions`);
  }

  async createChatSession(projectKey: string, title?: string) {
    return this.request<any>(`/projects/${projectKey}/chat/sessions`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getChatSession(projectKey: string, sessionId: string) {
    return this.request<{ session: any; messages: any[] }>(
      `/projects/${projectKey}/chat/sessions/${sessionId}`
    );
  }

  async sendChatMessage(projectKey: string, sessionId: string, message: string) {
    return this.request<any>(`/projects/${projectKey}/chat/sessions/${sessionId}/message/sync`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Audit
  async getAuditLogs(projectKey: string) {
    return this.request<any[]>(`/projects/${projectKey}/audit`);
  }
}

export const api = new ApiClient();

