// 购物车管理
class Cart {
  constructor() {
    this.items = this.loadFromStorage();
  }

  // 从 localStorage 加载
  loadFromStorage() {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : {};
  }

  // 保存到 localStorage
  saveToStorage() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  // 添加到购物车
  addItem(dish) {
    const id = dish.id;
    if (this.items[id]) {
      this.items[id].quantity++;
    } else {
      this.items[id] = {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        category: dish.category,
        quantity: 1
      };
    }
    this.saveToStorage();
  }

  // 更新数量
  updateQuantity(dishId, quantity) {
    if (quantity <= 0) {
      this.removeItem(dishId);
    } else {
      if (this.items[dishId]) {
        this.items[dishId].quantity = quantity;
        this.saveToStorage();
      }
    }
  }

  // 移除项目
  removeItem(dishId) {
    delete this.items[dishId];
    this.saveToStorage();
  }

  // 清空购物车
  clear() {
    this.items = {};
    this.saveToStorage();
  }

  // 获取购物车项目数组
  getItems() {
    return Object.values(this.items);
  }

  // 获取购物车总价
  getTotal() {
    return Object.values(this.items).reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }

  // 获取购物车项目数量
  getCount() {
    return Object.values(this.items).reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);
  }

  // 是否为空
  isEmpty() {
    return Object.keys(this.items).length === 0;
  }
}

// 创建全局购物车实例
window.cart = new Cart();
