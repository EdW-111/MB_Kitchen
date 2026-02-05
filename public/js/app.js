// 应用主逻辑
class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.init();
  }

  async init() {
    console.log('🍽️ Initializing restaurant ordering system...');
    await this.checkAuth();
    this.setupEventListeners();
    this.render();
  }

  // 检查认证状态
  async checkAuth() {
    const token = window.api.getToken();
    if (token) {
      try {
        const res = await window.api.auth.getCurrentUser();
        if (res.success) {
          this.currentUser = res.user;
          console.log('✅ User logged in:', this.currentUser.full_name);
        }
      } catch (error) {
        console.log('Token invalid, logging out');
        this.logout();
      }
    }
  }

  // 设置事件监听
  setupEventListeners() {
    // 导航
    document.getElementById('logo').addEventListener('click', () => this.navigate('home'));
    document.getElementById('menu-nav').addEventListener('click', () => this.navigate('menu'));
    document.getElementById('cart-nav').addEventListener('click', () => this.navigate('cart'));
    document.getElementById('orders-nav').addEventListener('click', () => {
      if (this.currentUser) this.navigate('orders');
      else this.navigate('login');
    });

    // 认证按钮
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) loginBtn.addEventListener('click', () => this.navigate('login'));
    if (registerBtn) registerBtn.addEventListener('click', () => this.navigate('register'));
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    // 注册表单
    document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));

    // 登录表单
    document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));

    // 结账按钮
    document.getElementById('checkout-btn')?.addEventListener('click', () => {
      if (this.currentUser) this.navigate('checkout');
      else this.navigate('login');
    });

    // 提交订单
    document.getElementById('submit-order-btn')?.addEventListener('click', () => this.handleSubmitOrder());

    // 购物车编辑
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) {
        const dishId = parseInt(e.target.dataset.dishId);
        window.cart.removeItem(dishId);
        this.renderCart();
      }
    });

    // 购物车数量输入
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const dishId = parseInt(e.target.dataset.dishId);
        const quantity = parseInt(e.target.value);
        window.cart.updateQuantity(dishId, quantity);
        this.renderCart();
      }
    });
  }

  // 导航
  navigate(page) {
    this.currentPage = page;
    this.render();
  }

  // 渲染页面
  render() {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // 显示当前页面
    const pageElement = document.getElementById(`${this.currentPage}-page`);
    if (pageElement) {
      pageElement.classList.add('active');
    }

    // 更新导航栏
    this.updateNavbar();

    // 根据页面类型渲染内容
    switch (this.currentPage) {
      case 'home':
        break; // 静态页面
      case 'menu':
        this.renderMenu();
        break;
      case 'cart':
        this.renderCart();
        break;
      case 'checkout':
        this.renderCheckout();
        break;
      case 'orders':
        this.renderOrders();
        break;
    }
  }

  // 更新导航栏
  updateNavbar() {
    const authSection = document.querySelector('.auth-section');
    const profileNav = document.getElementById('profile-nav');
    if (!authSection) return;

    // 显示/隐藏个人资料链接
    if (profileNav) {
      profileNav.style.display = this.currentUser ? 'block' : 'none';
    }

    if (this.currentUser) {
      authSection.innerHTML = `
        <span class="user-info">
          👤 ${this.currentUser.full_name}
        </span>
        <button id="logout-btn" class="btn btn-secondary btn-sm">退出</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    } else {
      authSection.innerHTML = `
        <button id="login-btn" class="btn btn-primary btn-sm">登录</button>
        <button id="register-btn" class="btn btn-secondary btn-sm">注册</button>
      `;
      document.getElementById('login-btn').addEventListener('click', () => this.navigate('login'));
      document.getElementById('register-btn').addEventListener('click', () => this.navigate('register'));
    }

    // 更新购物车数量
    const cartCount = window.cart.getCount();
    const cartNav = document.getElementById('cart-nav');
    if (cartNav) {
      cartNav.innerHTML = `🛒 购物车 ${cartCount > 0 ? `<span style="background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px; margin-left: 5px;">${cartCount}</span>` : ''}`;
    }
  }

  // ==================== 菜单页面 ====================
  async renderMenu() {
    try {
      const container = document.getElementById('dishes-container');
      if (!container) return;

      // 加载分类
      const catRes = await window.api.dishes.getCategories();
      const categories = catRes.data || [];

      // 渲染分类过滤
      const categoryFilter = document.getElementById('category-filter');
      if (categoryFilter) {
        categoryFilter.innerHTML = `
          <button class="category-btn active" data-category="">全部</button>
          ${categories.map(cat => `
            <button class="category-btn" data-category="${cat.value}">${cat.label}</button>
          `).join('')}
        `;

        // 分类筛选事件
        document.querySelectorAll('.category-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await this.loadDishes(btn.dataset.category);
          });
        });
      }

      // 加载所有菜品
      await this.loadDishes('');
    } catch (error) {
      this.showMessage('加载菜单失败: ' + error.message, 'error');
    }
  }

  async loadDishes(category = '') {
    try {
      const res = await window.api.dishes.getAll(category);
      const dishes = res.data || [];
      const container = document.getElementById('dishes-container');

      if (!container) return;

      if (dishes.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>暂无菜品</h3></div>';
        return;
      }

      container.innerHTML = dishes.map(dish => this.renderDishCard(dish)).join('');

      // 添加购物车事件
      document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dishId = parseInt(btn.dataset.dishId);
          const dish = dishes.find(d => d.id === dishId);
          if (dish) {
            window.cart.addItem(dish);
            this.showMessage(`已将 "${dish.name}" 加入购物车`, 'success');
            this.updateNavbar();
          }
        });
      });
    } catch (error) {
      this.showMessage('加载菜品失败: ' + error.message, 'error');
    }
  }

  renderDishCard(dish) {
    const categoryLabels = {
      main: '主食',
      snack: '小食',
      drink: '饮品',
      dessert: '甜品'
    };

    const imageContent = dish.image_url
      ? `<img src="${dish.image_url}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;">`
      : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 48px;">🍽️</div>';

    return `
      <div class="dish-card">
        <div class="dish-image">${imageContent}</div>
        <div class="dish-info">
          <div class="dish-name">${dish.name}</div>
          <div class="dish-category">${categoryLabels[dish.category] || dish.category}</div>
          <div class="dish-description">${dish.description || '暂无描述'}</div>
          <div class="dish-price">$${dish.price.toFixed(2)}</div>
          <div class="dish-actions">
            <button class="btn btn-primary btn-sm add-to-cart-btn" data-dish-id="${dish.id}">加入购物车</button>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== 购物车页面 ====================
  renderCart() {
    const cartPage = document.getElementById('cart-page');
    if (!cartPage) return;

    const items = window.cart.getItems();
    const total = window.cart.getTotal();

    if (items.length === 0) {
      document.getElementById('cart-items-container').innerHTML = `
        <div class="empty-state">
          <h3>购物车为空</h3>
          <p>快去菜单里添加一些菜品吧！</p>
          <button class="btn btn-primary" onclick="app.navigate('menu')">浏览菜单</button>
        </div>
      `;
      return;
    }

    const cartItemsHTML = items.map(item => `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <p style="color: var(--primary-color); font-weight: bold;">$${item.price.toFixed(2)} 每份</p>
        </div>
        <div class="quantity-control">
          <button onclick="document.querySelector('[data-dish-id=\\"${item.id}\\"] ').value = Math.max(1, parseInt(document.querySelector('[data-dish-id=\\"${item.id}\\"]').value) - 1); window.cart.updateQuantity(${item.id}, parseInt(document.querySelector('[data-dish-id=\\"${item.id}\\"]').value)); app.renderCart();" class="btn btn-sm" style="background: #f0f0f0; color: #333;">-</button>
          <input type="number" class="quantity-input" data-dish-id="${item.id}" value="${item.quantity}" min="1" max="99">
          <button onclick="document.querySelector('[data-dish-id=\\"${item.id}\\"]').value = parseInt(document.querySelector('[data-dish-id=\\"${item.id}\\"]').value) + 1; window.cart.updateQuantity(${item.id}, parseInt(document.querySelector('[data-dish-id=\\"${item.id}\\"]').value)); app.renderCart();" class="btn btn-sm" style="background: #f0f0f0; color: #333;">+</button>
        </div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        <button class="btn btn-danger btn-sm remove-btn" data-dish-id="${item.id}">删除</button>
      </div>
    `).join('');

    document.getElementById('cart-items-container').innerHTML = cartItemsHTML;

    // 更新摘要
    document.querySelector('.summary-row:last-of-type').innerHTML = `
      <span>小计:</span>
      <span>$${total.toFixed(2)}</span>
    `;

    // 更新数量变化时的摘要
    document.querySelectorAll('.quantity-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const dishId = parseInt(e.target.dataset.dishId);
        const quantity = parseInt(e.target.value);
        window.cart.updateQuantity(dishId, quantity);
        const newTotal = window.cart.getTotal();
        document.querySelector('.summary-row:last-of-type').innerHTML = `
          <span>小计:</span>
          <span>$${newTotal.toFixed(2)}</span>
        `;
      });
    });
  }

  // ==================== 结账页面 ====================
  renderCheckout() {
    if (!this.currentUser) {
      this.navigate('login');
      return;
    }

    const items = window.cart.getItems();
    const total = window.cart.getTotal();

    const summaryHTML = items.map(item => `
      <div class="order-summary-item">
        <span>${item.name} × ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    document.getElementById('checkout-summary').innerHTML = `
      <div class="order-summary">
        <h3>订单摘要</h3>
        ${summaryHTML}
        <div class="order-summary-total">
          总计: $${total.toFixed(2)}
        </div>
      </div>
    `;
  }

  async handleSubmitOrder() {
    if (!this.currentUser) {
      this.showMessage('请先登录', 'error');
      return;
    }

    const items = window.cart.getItems();
    if (items.length === 0) {
      this.showMessage('购物车为空', 'error');
      return;
    }

    const note = document.getElementById('order-note')?.value || '';

    try {
      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中...';

      const res = await window.api.orders.create({
        items: items.map(item => ({
          dish_id: item.id,
          quantity: item.quantity
        })),
        note
      });

      if (res.success) {
        window.cart.clear();
        this.showMessage(`订单已提交！订单号: ${res.order.order_number}`, 'success');
        setTimeout(() => {
          this.navigate('orders');
        }, 1500);
      }
    } catch (error) {
      this.showMessage('提交订单失败: ' + error.message, 'error');
    } finally {
      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = '提交订单';
    }
  }

  // ==================== 订单页面 ====================
  async renderOrders() {
    if (!this.currentUser) {
      this.navigate('login');
      return;
    }

    try {
      const res = await window.api.orders.getAll();
      const orders = res.data || [];
      const container = document.getElementById('orders-container');

      if (!container) return;

      if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>还没有订单</h3><p>快去下一个订单吧！</p></div>';
        return;
      }

      container.innerHTML = orders.map(order => `
        <div class="order-item" onclick="app.navigate('order-detail-${order.id}')">
          <div class="order-info">
            <h3>${order.order_number}</h3>
            <p>下单时间: ${new Date(order.created_at).toLocaleString('zh-CN')}</p>
            <p>金额: $${order.total_price?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <span class="order-status ${order.status}">${this.getStatusLabel(order.status)}</span>
          </div>
        </div>
      `).join('');

      // 点击订单查看详情
      document.querySelectorAll('.order-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          const orderId = e.currentTarget.querySelector('h3').textContent
            .replace('ORD-', '')
            .split('-')
            .pop();
          // 提取订单 ID（简单方案）
          const allOrders = orders;
          const orderIndex = allOrders.findIndex(o => o.order_number === e.currentTarget.querySelector('h3').textContent);
          if (orderIndex !== -1) {
            this.showOrderDetail(allOrders[orderIndex].id);
          }
        });
      });
    } catch (error) {
      this.showMessage('加载订单失败: ' + error.message, 'error');
    }
  }

  async showOrderDetail(orderId) {
    try {
      const res = await window.api.orders.getById(orderId);
      if (res.success) {
        const order = res.data;
        const itemsHTML = order.items.map(item => `
          <div class="order-detail-items-row">
            <span>${item.dish_name}</span>
            <span>${item.quantity}</span>
            <span>$${item.unit_price_snapshot.toFixed(2)}</span>
            <span>$${item.subtotal.toFixed(2)}</span>
          </div>
        `).join('');

        const detailHTML = `
          <button class="btn btn-secondary" onclick="app.navigate('orders'); return false;">← 返回订单列表</button>
          <div class="order-detail">
            <h2>${order.order_number}</h2>
            <div class="order-detail-header">
              <div>
                <div class="order-detail-item">
                  <strong>订单时间</strong>
                  <span>${new Date(order.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div class="order-detail-item">
                  <strong>订单状态</strong>
                  <span class="order-status ${order.status}">${this.getStatusLabel(order.status)}</span>
                </div>
              </div>
              <div>
                <div class="order-detail-item">
                  <strong>备注</strong>
                  <span>${order.note || '无'}</span>
                </div>
              </div>
            </div>

            <div class="order-detail-items">
              <div class="order-detail-items-header">
                <span>菜品名称</span>
                <span>数量</span>
                <span>单价</span>
                <span>小计</span>
              </div>
              ${itemsHTML}
            </div>

            <div class="order-total">
              总计: $${order.total_price.toFixed(2)}
            </div>
          </div>
        `;

        const container = document.getElementById('orders-container');
        if (container) {
          container.innerHTML = detailHTML;
        }
      }
    } catch (error) {
      this.showMessage('加载订单详情失败: ' + error.message, 'error');
    }
  }

  getStatusLabel(status) {
    const labels = {
      submitted: '已提交',
      accepted: '已接受',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labels[status] || status;
  }

  // ==================== 认证 ====================
  async handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      full_name: formData.get('full_name'),
      phone: formData.get('phone'),
      email: formData.get('email') || null,
      password: formData.get('password'),
      height: parseFloat(formData.get('height')) || 0,    // ← 加这行
      weight: parseFloat(formData.get('weight')) || 0   
    };

    // 验证
    if (!data.full_name || !data.phone || !data.password) {
      this.showMessage('请填写所有必填项', 'error');
      return;
    }

    try {
      const res = await window.api.auth.register(data);
      if (res.success) {
        this.showMessage('注册成功！', 'success');
        setTimeout(() => this.navigate('menu'), 1000);
      }
    } catch (error) {
      this.showMessage('注册失败: ' + error.message, 'error');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const phone = formData.get('phone');
    const email = formData.get('email');
    const password = formData.get('password');

    if ((!phone && !email) || !password) {
      this.showMessage('请输入登录信息', 'error');
      return;
    }

    try {
      const res = await window.api.auth.login({
        phone: phone || null,
        email: email || null,
        password
      });

      if (res.success) {
        window.api.setToken(res.token);
        this.currentUser = res.user;
        this.showMessage('登录成功！', 'success');
        setTimeout(() => this.navigate('menu'), 1000);
      }
    } catch (error) {
      this.showMessage('登录失败: ' + error.message, 'error');
    }
  }

  logout() {
    window.api.setToken(null);
    this.currentUser = null;
    window.cart.clear();
    this.showMessage('已退出登录', 'info');
    this.navigate('home');
  }

  // ==================== 工具方法 ====================
  showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = `message ${type} show`;

    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 3000);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
