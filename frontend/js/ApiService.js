class ApiService {
  constructor() {
    this.baseURL = window.location.origin;
    this.token = localStorage.getItem('authToken'); // Use existing token key
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Set authorization token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token); // Use existing token key
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get current token
  getToken() {
    return this.token || localStorage.getItem('authToken'); // Use existing token key
  }

  // Get headers with authorization
  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: this.getHeaders(options.headers),
      ...options
    };

    // Add request body for non-GET requests
    if (config.method !== 'GET' && options.data) {
      if (options.data instanceof FormData) {
        // Remove Content-Type for FormData (browser will set it)
        delete config.headers['Content-Type'];
        config.body = options.data;
      } else {
        config.body = JSON.stringify(options.data);
      }
    }

    try {
      console.log(`🌐 API Request: ${config.method} ${url}`, options.data);
      
      const response = await fetch(url, config);
      const result = await response.json();

      console.log(`📡 API Response: ${response.status}`, result);

      // Handle authentication errors
      if (response.status === 401) {
        this.handleAuthError();
        throw new Error(result.message || 'غير مصرح لك بالدخول');
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ API Error: ${config.method} ${url}`, error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('خطأ في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت');
      }
      
      throw error;
    }
  }

  // Handle authentication errors
  handleAuthError() {
    this.setToken(null);
    
    // Show login modal or redirect to login
    if (typeof modalManager !== 'undefined') {
      modalManager.showError('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى', {
        buttons: [{
          text: 'تسجيل الدخول',
          type: 'primary',
          onclick: 'window.location.reload()'
        }]
      });
    } else {
      alert('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى');
      window.location.reload();
    }
  }

  // HTTP Methods
  async get(endpoint, params = null) {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      data
    });
  }

  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      data
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PATCH',
      data
    });
  }

  // File upload method
  async upload(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data to FormData
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      data: formData
    });
  }

  // Convenience methods for common API calls
  
  // Authentication
  async login(userId, password) {
    return this.post('/api/auth/login', { userId, password });
  }

  async logout() {
    try {
      await this.post('/api/auth/logout');
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.get('/api/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  // Admin API calls
  async getDashboardStats() {
    return this.get('/api/admin/dashboard-stats');
  }

  async getAllUsers() {
    return this.get('/api/admin/users');
  }

  async getAllLoans() {
    return this.get('/api/admin/loans');
  }

  async getPendingTransactions() {
    return this.get('/api/admin/transactions/pending');
  }

  async approveTransaction(transactionId, action) {
    return this.post(`/api/admin/transaction-action/${transactionId}`, { action });
  }

  async approveLoan(loanId, action) {
    return this.post(`/api/admin/loan-action/${loanId}`, { action });
  }

  // User API calls
  async getUserProfile(userId) {
    return this.get(`/api/users/profile/${userId}`);
  }

  async updateUserProfile(userId, profileData) {
    return this.put(`/api/users/profile/${userId}`, profileData);
  }

  async getUserTransactions(userId) {
    return this.get(`/api/users/transactions/${userId}`);
  }

  async requestDeposit(amount, memo = '') {
    return this.post('/api/users/deposit', { amount, memo });
  }

  async getUserDashboard(userId) {
    return this.get(`/api/users/dashboard/${userId}`);
  }

  async checkLoanEligibility(userId) {
    return this.get(`/api/users/loan-eligibility/${userId}`);
  }

  // Request interceptors
  addRequestInterceptor(interceptor) {
    // Store original request method
    const originalRequest = this.request.bind(this);
    
    // Override request method
    this.request = async (endpoint, options = {}) => {
      // Call interceptor
      const modifiedOptions = await interceptor(endpoint, options);
      return originalRequest(endpoint, modifiedOptions || options);
    };
  }

  // Response interceptors
  addResponseInterceptor(interceptor) {
    // Store original request method
    const originalRequest = this.request.bind(this);
    
    // Override request method
    this.request = async (endpoint, options = {}) => {
      const result = await originalRequest(endpoint, options);
      // Call interceptor
      return interceptor(result, endpoint, options) || result;
    };
  }

  // Batch requests
  async batch(requests) {
    try {
      const promises = requests.map(req => 
        this.request(req.endpoint, req.options).catch(err => ({ error: err, ...req }))
      );
      
      const results = await Promise.all(promises);
      
      return {
        success: results.filter(r => !r.error),
        errors: results.filter(r => r.error)
      };
    } catch (error) {
      throw new Error(`خطأ في تنفيذ الطلبات المتعددة: ${error.message}`);
    }
  }

  // Cache management
  cache = new Map();

  async getCached(endpoint, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    const cached = this.cache.get(endpoint);
    
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      console.log(`🗄️ Cache hit: ${endpoint}`);
      return cached.data;
    }

    const data = await this.get(endpoint);
    this.cache.set(endpoint, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  clearCache(endpoint = null) {
    if (endpoint) {
      this.cache.delete(endpoint);
    } else {
      this.cache.clear();
    }
  }
}

// Create global instance
const apiService = new ApiService();

// Legacy compatibility - update existing API calls gradually
const api = {
  get: (url) => apiService.get(url),
  post: (url, data) => apiService.post(url, data),
  put: (url, data) => apiService.put(url, data),
  delete: (url) => apiService.delete(url)
};