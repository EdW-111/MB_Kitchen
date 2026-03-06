// 应用主逻辑
class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.planPrices = {
      '5': 69.95,
      '10': 119.90
    };
    this.init();
  }

  // 获取套餐标签
  getPlanLabel(plan) {
    const lang = i18n.getCurrentLanguage();
    const labels = {
      zh: {
        '5': '5顿 $69.95（13.99/顿）',
        '10': '10顿 $119.9（11.9/顿）'
      },
      en: {
        '5': '5-Meal $69.95 ($13.99/meal)',
        '10': '10-Meal $119.90 ($11.90/meal)'
      }
    };
    return labels[lang]?.[plan] || labels.zh[plan];
  }

  // 设置语言并重新渲染
  setLanguage(lang) {
    if (i18n.setLanguage(lang)) {
      document.documentElement.lang = lang;
      // 更新语言按钮状态
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
          btn.classList.add('active');
        }
      });
      // 立即翻译所有静态文本
      this.translateStaticText();
      // 重新渲染当前页面
      this.render();
    }
  }

  // 获取下周日期范围
  getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToNextMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

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
    document.getElementById('menu-nav').addEventListener('click', () => {
      document.getElementById('menu-nav').textContent = `🍜 ${i18n.t('menu')}`;
      this.navigate('menu');
    });
    document.getElementById('cart-nav').addEventListener('click', () => this.navigate('cart'));
    document.getElementById('orders-nav').addEventListener('click', () => {
      if (this.currentUser) this.navigate('orders');
      else this.navigate('login');
    });

    // 汉堡菜单切换
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('active');
      });
      // 点击导航链接后关闭菜单
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
          hamburger.classList.remove('active');
        });
      });
    }

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
    // 关闭汉堡菜单
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.getElementById('hamburger-btn');
    if (navLinks) navLinks.classList.remove('open');
    if (hamburger) hamburger.classList.remove('active');
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

    // 更新导航文本
    const menuNav = document.getElementById('menu-nav');
    const ordersNav = document.getElementById('orders-nav');
    if (menuNav) menuNav.textContent = `🍜 ${i18n.t('menu')}`;
    if (ordersNav) ordersNav.textContent = `📦 ${i18n.t('orders')}`;
    if (profileNav) {
      profileNav.textContent = `👤 ${i18n.t('myProfile')}`;
      profileNav.style.display = this.currentUser ? 'block' : 'none';
    }

    if (this.currentUser) {
      authSection.innerHTML = `
        <span class="user-info">
          👤 ${this.currentUser.full_name}
        </span>
        <button id="logout-btn" class="btn btn-secondary btn-sm">${i18n.t('logout')}</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    } else {
      authSection.innerHTML = `
        <button id="login-btn" class="btn btn-primary btn-sm">${i18n.t('login')}</button>
        <button id="register-btn" class="btn btn-secondary btn-sm">${i18n.t('register')}</button>
      `;
      document.getElementById('login-btn').addEventListener('click', () => this.navigate('login'));
      document.getElementById('register-btn').addEventListener('click', () => this.navigate('register'));
    }

    // 更新购物车数量
    const cartCount = window.cart.getCount();
    const cartNav = document.getElementById('cart-nav');
    if (cartNav) {
      cartNav.innerHTML = `🛒 ${i18n.t('cart')} ${cartCount > 0 ? `<span class="cart-badge">${cartCount}</span>` : ''}`;
    }
  }

  // ==================== 菜单页面 ====================
  async renderMenu() {
    try {
      const container = document.getElementById('dishes-container');
      if (!container) return;

      // 渲染侧栏：周日期 + 套餐价格信息卡
      const categoryFilter = document.getElementById('category-filter');
      if (categoryFilter) {
        const weekRange = this.getWeekRange();
        categoryFilter.innerHTML = `
          <div class="plan-info-header">
            <h3>${i18n.t('weeklyMenu')}</h3>
            <div class="plan-info-week">📅 ${weekRange}</div>
          </div>
          <div class="plan-info-card">
            <div class="plan-info-card-title">${i18n.t('meal5Plan')}</div>
            <div class="plan-info-card-price">${i18n.t('meal5Price')}</div>
            <div class="plan-info-card-unit">${i18n.t('meal5Unit')}</div>
          </div>
          <div class="plan-info-card plan-info-card-highlight">
            <div class="plan-info-card-title">${i18n.t('meal10Plan')}</div>
            <div class="plan-info-card-price">${i18n.t('meal10Price')}</div>
            <div class="plan-info-card-unit">${i18n.t('meal10Unit')}</div>
          </div>
          <p class="plan-info-hint">${i18n.t('selectPlanInCart')}</p>
        `;
      }

      // 加载所有菜品
      await this.loadDishes('');
    } catch (error) {
      this.showMessage(i18n.t('loadFailed') + ': ' + error.message, 'error');
    }
  }

  async loadDishes(category = '') {
    try {
      const res = await window.api.dishes.getAll(category);
      const dishes = res.data || [];
      const container = document.getElementById('dishes-container');

      if (!container) return;

      if (dishes.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${i18n.t('noDishes')}</h3></div>`;
        return;
      }

      // 所有菜品统一展示
      container.innerHTML = `
        <div class="dishes-grid">
          ${dishes.map(dish => this.renderDishCard(dish)).join('')}
        </div>
      `;

      // 添加购物车事件
      document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dishId = parseInt(btn.dataset.dishId);
          const dish = dishes.find(d => d.id === dishId);
          if (dish) {
            window.cart.addItem(dish);
            this.showMessage(i18n.t('addedToCart', { name: dish.name }), 'success');
            this.updateNavbar();
          }
        });
      });
    } catch (error) {
      this.showMessage(i18n.t('loadFailed') + ': ' + error.message, 'error');
    }
  }

  renderDishCard(dish) {
    const imageContent = dish.image_url
      ? `<img src="${dish.image_url}" alt="${dish.name}" class="dish-image-img">`
      : '<div class="dish-image-placeholder">🍽️</div>';

    return `
      <div class="dish-card">
        <div class="dish-image">${imageContent}</div>
        <div class="dish-info">
          <div class="dish-name">${dish.name}</div>
          <div class="dish-description">${dish.description || i18n.t('noDescription')}</div>
          <div class="dish-actions">
            <button class="btn btn-primary btn-sm add-to-cart-btn" data-dish-id="${dish.id}">${i18n.t('addToCart')}</button>
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
    const selectedPlan = window.cart.getPlan();

    if (items.length === 0) {
      document.getElementById('cart-items-container').innerHTML = `
        <div class="empty-state">
          <h3>${i18n.t('emptyCart')}</h3>
          <p>${i18n.t('quickGoDishes')}</p>
          <button class="btn btn-primary" onclick="app.navigate('menu')">${i18n.t('browseDishes')}</button>
        </div>
      `;
      // 清空摘要
      const summaryContainer = document.querySelector('.cart-summary');
      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <div class="summary-row">
            <span>${i18n.t('subtotal')}</span>
            <span>$0.00</span>
          </div>
          <button class="btn btn-primary" id="checkout-btn" disabled>${i18n.t('checkout')}</button>
        `;
      }
      return;
    }

    // 套餐选择器 + 菜品列表
    const planSelectorHTML = `
      <div class="plan-selector">
        <h4 class="plan-selector-title">${i18n.t('selectPlanType')}</h4>
        <div class="plan-selector-options">
          <label class="plan-option ${selectedPlan === '5' ? 'selected' : ''}">
            <input type="radio" name="plan" value="5" ${selectedPlan === '5' ? 'checked' : ''}>
            <span class="plan-option-label">${i18n.t('meal5Per')}</span>
            <span class="plan-option-price">$69.95 / ${i18n.t('meal5Unit').split('/')[1].trim()}</span>
          </label>
          <label class="plan-option ${selectedPlan === '10' ? 'selected' : ''}">
            <input type="radio" name="plan" value="10" ${selectedPlan === '10' ? 'checked' : ''}>
            <span class="plan-option-label">${i18n.t('meal10Per')}</span>
            <span class="plan-option-price">$119.90 / ${i18n.t('meal10Unit').split('/')[1].trim()}</span>
          </label>
        </div>
      </div>
    `;

    const cartItemsHTML = items.map(item => `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
        </div>
        <div class="quantity-control">
          <input type="number" class="quantity-input" data-dish-id="${item.id}" value="${item.quantity}" min="1" max="99">
        </div>
        <button class="btn btn-danger btn-sm remove-btn" data-dish-id="${item.id}">${i18n.t('remove')}</button>
      </div>
    `).join('');

    document.getElementById('cart-items-container').innerHTML = planSelectorHTML + cartItemsHTML;

    // 套餐选择器事件
    document.querySelectorAll('.plan-option input[name="plan"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        window.cart.setPlan(e.target.value);
        this.renderCart();
      });
    });

    // 更新摘要
    const total = window.cart.getTotal();
    const count = window.cart.getCount();
    const summaryContainer = document.querySelector('.cart-summary');
    if (summaryContainer) {
      const planLabel = selectedPlan ? this.getPlanLabel(selectedPlan) : 'N/A';
      const canCheckout = selectedPlan !== null;
      summaryContainer.innerHTML = `
        ${selectedPlan ? `
        <div class="plan-summary-card">
          <h4>${i18n.t('mealStats')}</h4>
          <div>${planLabel} × ${count}</div>
        </div>
        ` : `
        <div class="plan-summary-warning">
          ${i18n.t('selectPlanWarning')}
        </div>
        `}
        <div class="summary-row">
          <span>${i18n.t('subtotal')}</span>
          <span>$${total.toFixed(2)}</span>
        </div>
        <button class="btn btn-primary" id="checkout-btn" ${canCheckout ? '' : 'disabled'}>
          ${i18n.t('checkout')}
        </button>
      `;
      document.getElementById('checkout-btn').addEventListener('click', () => {
        if (app.currentUser) app.navigate('checkout');
        else app.navigate('login');
      });
    }
  }

  // ==================== 结账页面 ====================
  renderCheckout() {
    if (!this.currentUser) {
      this.navigate('login');
      return;
    }

    const items = window.cart.getItems();
    const selectedPlan = window.cart.getPlan();
    const total = window.cart.getTotal();
    const count = window.cart.getCount();
    const planLabel = selectedPlan ? this.getPlanLabel(selectedPlan) : 'N/A';

    const summaryHTML = items.map(item => `
      <div class="order-summary-item">
        <span>${item.name} × ${item.quantity}</span>
      </div>
    `).join('');

    document.getElementById('checkout-summary').innerHTML = `
      <div class="order-summary">
        <h3>${i18n.t('orderSummary')}</h3>
        <div class="order-summary-item">
          <span><strong>${i18n.t('planType')}</strong></span>
          <span>${planLabel}</span>
        </div>
        ${summaryHTML}
        <div class="order-summary-total">
          ${i18n.t('total')} $${total.toFixed(2)}
        </div>
      </div>
    `;
  }

  async handleSubmitOrder() {
    if (!this.currentUser) {
      this.showMessage(i18n.t('pleaseLogin'), 'error');
      return;
    }

    const items = window.cart.getItems();
    if (items.length === 0) {
      this.showMessage(i18n.t('emptyCartError'), 'error');
      return;
    }

    const selectedPlan = window.cart.getPlan();
    if (!selectedPlan) {
      this.showMessage(i18n.t('selectPlanError'), 'error');
      return;
    }

    const note = document.getElementById('order-note')?.value || '';

    try {
      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = i18n.t('submitting');

      const res = await window.api.orders.create({
        items: items.map(item => ({
          dish_id: item.id,
          quantity: item.quantity
        })),
        plan_type: selectedPlan,
        note
      });

      if (res.success) {
        window.cart.clear();
        this.showMessage(i18n.t('orderSubmitted', { orderNumber: res.order.order_number }), 'success');
        setTimeout(() => {
          this.navigate('orders');
        }, 1500);
      }
    } catch (error) {
      this.showMessage(i18n.t('loadFailed') + ': ' + error.message, 'error');
    } finally {
      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = i18n.t('submitOrder');
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
        container.innerHTML = `<div class="empty-state"><h3>${i18n.t('noOrders')}</h3><p>${i18n.t('goOrder')}</p></div>`;
        return;
      }

      container.innerHTML = orders.map(order => `
        <div class="order-item" data-order-id="${order.id}" style="cursor: pointer;">
          <div class="order-info">
            <h3>${order.order_number}</h3>
            <p>${i18n.t('orderTime')}: ${new Date(order.created_at).toLocaleString('zh-CN')}</p>
            <p>${i18n.t('amount')}: $${order.total_price?.toFixed(2) || '0.00'}</p>
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
      this.showMessage(i18n.t('loadFailed') + ': ' + error.message, 'error');
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
          </div>
        `).join('');

        const planDisplay = order.plan_type ? order.plan_type + (i18n.getCurrentLanguage() === 'zh' ? '顿套餐' : '-Meal Plan') : '-';
        const noteDisplay = order.note || (i18n.getCurrentLanguage() === 'zh' ? '无' : 'None');

        const detailHTML = `
          <div class="order-detail">
            <div style="background: #1a2142; padding: 20px; border-radius: 12px; border: 1px solid #2d3561; margin-bottom: 20px;">
              <h3 style="color: #00d4aa; margin-bottom: 15px;">${order.order_number}</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #a0aec0;">${i18n.t('orderTime2')}</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;">${new Date(order.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <strong style="color: #a0aec0;">${i18n.t('orderStatus')}</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;"><span class="order-status ${order.status}">${this.getStatusLabel(order.status)}</span></p>
                  </div>
                </div>
                <div>
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #a0aec0;">${i18n.t('planTypeLabel')}</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;">${planDisplay}</p>
                  </div>
                  <div>
                    <strong style="color: #a0aec0;">${i18n.t('note')}</strong>
                    <p style="color: #e4e9f7; margin: 5px 0 0 0;">${noteDisplay}</p>
                  </div>
                </div>
              </div>
            </div>

            <div style="background: #1a2142; padding: 20px; border-radius: 12px; border: 1px solid #2d3561; margin-bottom: 20px;">
              <h4 style="color: #00d4aa; margin-bottom: 15px;">📋 ${i18n.t('orderProducts')}</h4>
              <div style="background: #151b3d; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid #2d3561; margin-bottom: 10px; font-weight: bold; color: #a0aec0;">
                  <span>${i18n.t('dishName')}</span>
                  <span>${i18n.t('quantity')}</span>
                </div>
                ${itemsHTML}
              </div>
              <div style="text-align: right; padding: 15px; background: #151b3d; border-radius: 8px;">
                <strong style="color: #00d4aa; font-size: 18px;">${i18n.t('total')}: $${order.total_price.toFixed(2)}</strong>
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
        this.showMessage(i18n.t('loadFailed'), 'error');
        this.navigate('orders');
      }
    } catch (error) {
      this.showMessage(i18n.t('loadFailed') + ': ' + error.message, 'error');
    }
  }

  getStatusLabel(status) {
    const lang = i18n.getCurrentLanguage();
    const labels = {
      zh: {
        submitted: i18n.t('submittedStatus'),
        accepted: i18n.t('acceptedStatus'),
        completed: i18n.t('completedStatus'),
        cancelled: i18n.t('cancelledStatus')
      },
      en: {
        submitted: i18n.t('submittedStatus'),
        accepted: i18n.t('acceptedStatus'),
        completed: i18n.t('completedStatus'),
        cancelled: i18n.t('cancelledStatus')
      }
    };
    return labels[lang]?.[status] || status;
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
      this.showMessage(i18n.t('fillAllRequired'), 'error');
      return;
    }

    try {
      const res = await window.api.auth.register(data);
      if (res.success) {
        this.showMessage(i18n.t('registrationSuccess'), 'success');
        setTimeout(() => this.navigate('menu'), 1000);
      }
    } catch (error) {
      this.showMessage(i18n.t('registrationError') + ': ' + error.message, 'error');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const phone = formData.get('phone');
    const email = formData.get('email');
    const password = formData.get('password');

    if ((!phone && !email) || !password) {
      this.showMessage(i18n.t('pleaseEnterLoginInfo'), 'error');
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
        this.showMessage(i18n.t('loginSuccess'), 'success');
        setTimeout(() => this.navigate('menu'), 1000);
      }
    } catch (error) {
      this.showMessage(i18n.t('loginError') + ': ' + error.message, 'error');
    }
  }

  logout() {
    window.api.setToken(null);
    this.currentUser = null;
    window.cart.clear();
    this.showMessage(i18n.t('invalidToken'), 'info');
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
  window.app.translateStaticText();
});

// 在App类中添加翻译静态文本的方法
App.prototype.translateStaticText = function() {
  // 首页
  const homePageH1 = document.querySelector('#home-page h1');
  const homePageP = document.querySelector('#home-page p');
  const homePageBtn = document.querySelector('#home-page .btn-primary');
  if (homePageH1) homePageH1.textContent = i18n.t('mbKitchen');
  if (homePageP) homePageP.textContent = i18n.t('healthyMeals');
  if (homePageBtn) homePageBtn.textContent = i18n.t('startOrdering');

  // 菜单页
  const menuTitle = document.querySelector('#menu-page .page-title');
  if (menuTitle) menuTitle.innerHTML = '📋 ' + i18n.t('menuTitle');

  // 购物车页
  const cartTitle = document.querySelector('#cart-page .page-title');
  if (cartTitle) cartTitle.innerHTML = '🛒 ' + i18n.t('cartTitle');

  // 结账页
  const checkoutTitle = document.querySelector('#checkout-page .page-title');
  if (checkoutTitle) checkoutTitle.innerHTML = '💳 ' + i18n.t('checkoutTitle');

  const orderNote = document.querySelector('label[for="order-note"]');
  if (orderNote) orderNote.textContent = i18n.t('orderNote');

  const orderNoteTa = document.querySelector('#order-note');
  if (orderNoteTa) orderNoteTa.placeholder = i18n.t('notePlaceholder');

  const submitBtn = document.querySelector('#submit-order-btn');
  if (submitBtn) submitBtn.textContent = i18n.t('submitOrder');

  const backBtn = document.querySelector('[onclick="app.navigate(\'cart\')"]');
  if (backBtn) backBtn.textContent = i18n.t('backToCart');

  // 订单页
  const ordersTitle = document.querySelector('#orders-page .page-title');
  if (ordersTitle) ordersTitle.innerHTML = '📦 ' + i18n.t('ordersTitle');

  const orderDetailTitle = document.querySelector('#order-detail-page .page-title');
  if (orderDetailTitle) orderDetailTitle.innerHTML = '📦 ' + i18n.t('orderDetails');

  // 注册页
  const registerTitle = document.querySelector('#register-page h2');
  if (registerTitle) registerTitle.textContent = i18n.t('createAccount');

  const registerLabels = {
    'register-name': i18n.t('nameLabel'),
    'register-phone': i18n.t('phoneLabel'),
    'register-wechat': i18n.t('wechatLabel'),
    'register-password': i18n.t('passwordLabel'),
    'reg-height': i18n.t('heightLabel'),
    'reg-weight': i18n.t('weightLabel'),
    'reg-address': i18n.t('addressLabel'),
    'reg-additional': i18n.t('specialNeedsLabel')
  };

  for (const [id, label] of Object.entries(registerLabels)) {
    const element = document.querySelector(`label[for="${id}"]`);
    if (element) element.textContent = label;
  }

  const regAdditional = document.querySelector('#reg-additional');
  if (regAdditional) regAdditional.placeholder = i18n.t('specialNeedsPlaceholder');

  const registerBtn = document.querySelector('#register-form button[type="submit"]');
  if (registerBtn) registerBtn.textContent = i18n.t('registerBtn');

  const switchAuthRegister = document.querySelector('#register-page .switch-auth');
  if (switchAuthRegister) {
    switchAuthRegister.innerHTML = i18n.t('haveAccount') + '<button onclick="app.navigate(\'login\')" style="background: none; border: none; color: var(--primary-color); text-decoration: underline; cursor: pointer;">' + i18n.t('goLogin') + '</button>';
  }

  // 登录页
  const loginTitle = document.querySelector('#login-page h2');
  if (loginTitle) loginTitle.textContent = i18n.t('userLogin');

  const loginLabels = {
    'login-phone': i18n.t('phoneLabel'),
    'login-password': i18n.t('passwordRequired')
  };

  for (const [id, label] of Object.entries(loginLabels)) {
    const element = document.querySelector(`label[for="${id}"]`);
    if (element) element.textContent = label;
  }

  const loginBtn = document.querySelector('#login-form button[type="submit"]');
  if (loginBtn) loginBtn.textContent = i18n.t('loginBtn');

  const switchAuthLogin = document.querySelector('#login-page .switch-auth');
  if (switchAuthLogin) {
    switchAuthLogin.innerHTML = i18n.t('noAccount') + '<button onclick="app.navigate(\'register\')" style="background: none; border: none; color: var(--primary-color); text-decoration: underline; cursor: pointer;">' + i18n.t('registerNow') + '</button>';
  }

  // 页脚
  const footer = document.querySelector('footer p');
  if (footer) {
    footer.innerHTML = i18n.t('footerText') + ' | <a href="/admin/orders" style="color: white; text-decoration: underline">' + i18n.t('viewAllOrders') + '</a>';
  }
};
