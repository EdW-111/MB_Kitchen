// API 调用封装
class API {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('token');
  }

  // 通用请求方法
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '请求失败');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  // 认证相关 API
  auth = {
    register: (data) => this.request('POST', '/auth/register', data),
    login: (data) => this.request('POST', '/auth/login', data),
    logout: () => this.request('POST', '/auth/logout'),
    getCurrentUser: () => this.request('GET', '/auth/me')
  };

  // 菜品相关 API
  dishes = {
    getAll: (category = null) => 
      this.request('GET', `/dishes${category ? `?category=${category}` : ''}`),
    getById: (id) => this.request('GET', `/dishes/${id}`),
    getCategories: () => this.request('GET', '/dishes/categories')
  };

  // 订单相关 API
  orders = {
    create: (data) => this.request('POST', '/orders', data),
    getAll: () => this.request('GET', '/orders'),
    getById: (id) => this.request('GET', `/orders/${id}`),
    getAllOrders: () => this.request('GET', '/orders/admin/all')
  };

  // 设置 token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // 获取 token
  getToken() {
    return this.token || localStorage.getItem('token');
  }

  // 检查是否已登录
  isAuthenticated() {
    return !!this.getToken();
  }
}

// 创建全局 API 实例
window.api = new API();
