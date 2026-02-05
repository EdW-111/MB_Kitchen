// 应用主逻辑
class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.selectedPlan = '5'; // 默认选择 5顿 套餐
    this.planPrices = {
      '5': 69.95,
      '10': 119.90
    };
    this.planLabels = {
      '5': '5顿 $69.95（13.99/顿）',
      '10': '10顿 $119.9（11.9/顿）'
    };
    this.init();
  }

  // 获取当周日期范围
  getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整为获得当周周一
    const monday = new Date(today.setDate(diff));
    const sunday = new Date(today.setDate(diff + 6));

    const formatDate = (date) => {
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return `${m}/${d}`;
    };

    return `${formatDate(monday)}-${formatDate(sunday)}`;
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
    if (this.currentPage.startsWith('order-detail-')) {
      const orderId = this.currentPage.replace('order-detail-', '');
      this.showOrderDetail(parseInt(orderId));
    } else {
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

      // 渲染套餐选择
      const categoryFilter = document.getElementById('category-filter');
      if (categoryFilter) {
        const weekRange = this.getWeekRange();
        categoryFilter.innerHTML = `
          <div style="margin-bottom: 15px; font-size: 12px; color: #666;">📅 本周: ${weekRange}</div>
          <button class="category-btn ${this.selectedPlan === '5' ? 'active' : ''}" data-plan="5">${this.planLabels['5']}</button>
          <button class="category-btn ${this.selectedPlan === '10' ? 'active' : ''}" data-plan="10">${this.planLabels['10']}</button>
        `;

        // 套餐选择事件
        document.querySelectorAll('.category-btn[data-plan]').forEach(btn => {
          btn.addEventListener('click', async () => {
            document.querySelectorAll('.category-btn[data-plan]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.selectedPlan = btn.dataset.plan;
            await this.loadDishes('');
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
            // 使用套餐价格而不是菜品价格
            const dishWithPlan = {
              ...dish,
              price: this.planPrices[this.selectedPlan],
              plan: this.selectedPlan
            };
            window.cart.addItem(dishWithPlan);
            this.showMessage(`已将 "${dish.name}" 加入 ${this.planLabels[this.selectedPlan]} 套餐`, 'success');
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
      '5': '5顿套餐',
      '10': '10顿套餐'
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

    // 按套餐分组统计数量
    const planTotals = {};
    items.forEach(item => {
      const plan = item.plan || '5';
      if (!planTotals[plan]) {
        planTotals[plan] = 0;
      }
      planTotals[plan] += item.quantity;
    });

    // 生成套餐摘要
    const planSummary = Object.entries(planTotals).map(([plan, count]) => {
      const planLabel = app.planLabels[plan];
      const planPrice = app.planPrices[plan];
      const totalForPlan = planPrice * count;
      return `<div style="margin-bottom: 8px;">${planLabel} × ${count} = $${totalForPlan.toFixed(2)}</div>`;
    }).join('');

    const cartItemsHTML = items.map(item => `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <p style="color: var(--primary-color); font-weight: bold;">套餐: ${item.plan || '5'}顿</p>
          <p style="color: #666; font-size: 14px;">数量: ${item.quantity}</p>
        </div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        <button class="btn btn-danger btn-sm remove-btn" data-dish-id="${item.id}">删除</button>
      </div>
    `).join('');

    document.getElementById('cart-items-container').innerHTML = cartItemsHTML;

    // 更新摘要 - 显示套餐分组
    const summaryContainer = document.querySelector('.cart-summary');
    if (summaryContainer) {
      const summaryHTML = summaryContainer.innerHTML;
      summaryContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #00d4aa, #00b894); padding: 15px; border-radius: 8px; margin-bottom: 15px; color: #0a0e27;">
          <h4 style="margin: 0 0 10px 0; font-weight: bold; color: #0a0e27;">套餐统计</h4>
          <div style="color: #0a0e27;">${planSummary}</div>
        </div>
        <div class="summary-row">
          <span>小计:</span>
          <span>$${total.toFixed(2)}</span>
        </div>
        <button class="btn btn-primary" id="checkout-btn">
          继续结账 →
        </button>
      `;
      document.getElementById('checkout-btn').addEventListener('click', () => {
        if (app.currentUser) app.navigate('checkout');
        else app.navigate('login');
      });
    }

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
        <div class="order-item" data-order-id="${order.id}" style="cursor: pointer;">
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
          const orderId = parseInt(item.getAttribute('data-order-id'));
          if (orderId) {
            this.showOrderDetail(orderId);
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
          <div class="order-detail">
            <div style="background: #1a2142; padding: 20px; border-radius: 12px; border: 1px solid #2d3561; margin-bottom: 20px;">
              <h3 style="color: #00d4aa; margin-bottom: 15px;">${order.order_number}</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #a0aec0;">订单时间</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;">${new Date(order.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <strong style="color: #a0aec0;">订单状态</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;"><span class="order-status ${order.status}">${this.getStatusLabel(order.status)}</span></p>
                  </div>
                </div>
                <div>
                  <div>
                    <strong style="color: #a0aec0;">备注</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;">${order.note || '无'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div style="background: #1a2142; padding: 20px; border-radius: 12px; border: 1px solid #2d3561; margin-bottom: 20px;">
              <h4 style="color: #00d4aa; margin-bottom: 15px;">📋 订单产品</h4>
              <div style="background: #151b3d; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid #2d3561; margin-bottom: 10px; font-weight: bold; color: #a0aec0;">
                  <span>菜品名称</span>
                  <span>数量</span>
                  <span>单价</span>
                  <span>小计</span>
                </div>
                ${itemsHTML}
              </div>
              <div style="text-align: right; padding: 15px; background: #151b3d; border-radius: 8px;">
                <strong style="color: #00d4aa; font-size: 18px;">总计: $${order.total_price.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        `;

        const container = document.getElementById('order-detail-container');
        if (container) {
          container.innerHTML = detailHTML;
          // 切换到订单详情页面
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          document.getElementById('order-detail-page').classList.add('active');
        }
      } else {
        this.showMessage('订单不存在', 'error');
        this.navigate('orders');
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
      wechat: formData.get('wechat'),
      password: formData.get('password'),
      height: parseFloat(formData.get('height')) || 0,
      weight: parseFloat(formData.get('weight')) || 0,
      address: formData.get('address'),
      additional_info: formData.get('additional_info') || null
    };

    // 验证
    if (!data.full_name || !data.phone || !data.wechat || !data.password || !data.address) {
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
