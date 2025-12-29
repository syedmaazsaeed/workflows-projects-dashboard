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
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api${endpoint}`, {
          ...options,
          headers,
        });

        if (!response.ok) {
          // Don't retry on client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            let errorData: ApiError;
            try {
              errorData = await response.json();
            } catch {
              errorData = {
                success: false,
                error: { code: 'UNKNOWN', message: 'An error occurred' },
              };
            }
            
            // Handle NestJS validation errors (array format)
            if (Array.isArray(errorData)) {
              const messages = errorData
                .map((err: any) => err.message || err)
                .filter(Boolean)
                .join(', ');
              throw new Error(messages || 'Validation failed');
            }
            
            // Handle standard error format
            const errorMessage = errorData.error?.message || errorData.message || 'Request failed';
            throw new Error(errorMessage);
          }

          // Retry on server errors (5xx) and rate limits (429)
          if (response.status >= 500 || response.status === 429) {
            if (attempt < retries) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }

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
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Retry on network errors
        if (attempt < retries && (error instanceof TypeError || error instanceof DOMException)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Request failed after retries');
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
    try {
      const response = await this.request<{
        message: string;
        email: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      return response;
    } catch (error) {
      // Extract more detailed error message
      if (error instanceof Error) {
        // Check if it's a validation error from the backend
        if (error.message.includes('Password must') || error.message.includes('password')) {
          throw new Error(error.message);
        }
        if (error.message.includes('already exists') || error.message.includes('email')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        throw error;
      }
      throw new Error('Registration failed. Please check your connection and try again.');
    }
  }

  async verifyEmail(email: string, code: string) {
    return this.request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resendVerificationCode(email: string) {
    return this.request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getPendingUsers() {
    return this.request<any[]>('/auth/pending-users');
  }

  async getApprovedUsers() {
    return this.request<any[]>('/auth/approved-users');
  }

  async approveUser(userId: string, approved: boolean) {
    return this.request<any>(`/auth/approve-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    });
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{ id: string; email: string; name: string; role: string }>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || errorData?.message || `Upload failed (${response.status})`;
      throw new Error(errorMessage);
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

  // Analytics
  async getAnalytics(projectKey?: string, timeRange?: string) {
    const params = new URLSearchParams();
    if (projectKey) params.append('projectKey', projectKey);
    if (timeRange) params.append('timeRange', timeRange);
    return this.request<any>(`/analytics?${params.toString()}`);
  }

  async getActivityFeed(projectKey?: string, limit?: number) {
    const params = new URLSearchParams();
    if (projectKey) params.append('projectKey', projectKey);
    if (limit) params.append('limit', limit.toString());
    return this.request<any[]>(`/analytics/activity?${params.toString()}`);
  }

  // Search
  async globalSearch(query: string, filters?: { type?: string; projectKey?: string }) {
    const params = new URLSearchParams({ q: query });
    if (filters?.type) params.append('type', filters.type);
    if (filters?.projectKey) params.append('projectKey', filters.projectKey);
    return this.request<{ results: any[] }>(`/search?${params.toString()}`);
  }
}

export const api = new ApiClient();

