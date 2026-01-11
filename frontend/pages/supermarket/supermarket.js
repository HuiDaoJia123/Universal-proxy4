// pages/supermarket/supermarket.js
Page({
  data: {
    goodsList: [],
    newGoodsName: '',
    newGoodsPrice: '',
    remark: '',
    phone: '',
    deliveryAddress: '',
    totalPrice: 0,
    canSubmit: false
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
    console.log('超市代买页面加载');
    
    // 尝试自动填充用户信息
    this.autoFillFromProfile();
  },

  onShow: function () {
    // 页面显示时的逻辑
    console.log('超市代买页面显示');
  },

  // 从个人信息自动填充
  autoFillFromProfile: function() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    this.setData({
      phone: userInfo.phone || ''
    });
  },

  // 输入商品名称
  onGoodsNameInput: function(e) {
    this.setData({
      newGoodsName: e.detail.value
    });
  },

  // 输入商品价格
  onGoodsPriceInput: function(e) {
    this.setData({
      newGoodsPrice: e.detail.value
    });
  },

  // 输入备注
  onRemarkInput: function(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  // 输入联系电话
  onPhoneInput: function(e) {
    this.setData({
      phone: e.detail.value
    });
    this.checkForm();
  },

  // 输入送达地址
  onDeliveryAddressInput: function(e) {
    this.setData({
      deliveryAddress: e.detail.value
    });
    this.checkForm();
  },

  // 添加商品
  addGoods: function() {
    const { newGoodsName, newGoodsPrice, goodsList } = this.data;
    
    if (!newGoodsName.trim()) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!newGoodsPrice || isNaN(parseFloat(newGoodsPrice))) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      });
      return;
    }

    const newGoods = {
      id: Date.now() + Math.random(),
      name: newGoodsName,
      price: parseFloat(newGoodsPrice).toFixed(2),
      count: 1
    };

    this.setData({
      goodsList: [...goodsList, newGoods],
      newGoodsName: '',
      newGoodsPrice: ''
    });

    this.calculateTotal();
    this.checkForm();
  },

  // 增加商品数量
  increaseGoods: function(e) {
    const id = e.currentTarget.dataset.id;
    const goodsList = this.data.goodsList.map(item => {
      if (item.id === id) {
        item.count += 1;
      }
      return item;
    });
    this.setData({ goodsList });
    this.calculateTotal();
  },

  // 减少商品数量
  decreaseGoods: function(e) {
    const id = e.currentTarget.dataset.id;
    let goodsList = this.data.goodsList.map(item => {
      if (item.id === id) {
        item.count -= 1;
      }
      return item;
    });
    // 移除数量为0的商品
    goodsList = goodsList.filter(item => item.count > 0);
    this.setData({ goodsList });
    this.calculateTotal();
    this.checkForm();
  },

  // 删除商品
  deleteGoods: function(e) {
    const id = e.currentTarget.dataset.id;
    const goodsList = this.data.goodsList.filter(item => item.id !== id);
    this.setData({ goodsList });
    this.calculateTotal();
    this.checkForm();
  },

  // 计算总价
  calculateTotal: function() {
    const total = this.data.goodsList.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.count));
    }, 0);
    this.setData({
      totalPrice: total.toFixed(2)
    });
  },

  // 检查表单是否可提交
  checkForm: function() {
    const { goodsList, phone, deliveryAddress } = this.data;
    
    const canSubmit = goodsList.length > 0 && 
                     phone && 
                     phone.length === 11 && 
                     deliveryAddress;
    
    this.setData({
      canSubmit: canSubmit
    });
  },

  // 验证手机号
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 提交订单
  submitOrder: function() {
    const { goodsList, totalPrice, remark, phone, deliveryAddress } = this.data;
    
    if (goodsList.length === 0) {
      wx.showToast({
        title: '请添加商品',
        icon: 'none'
      });
      return;
    }

    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    if (!this.validatePhone(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...',
    });

    // 模拟网络请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 保存订单到本地存储
      this.saveOrderToStorage();

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      
      // 清空数据
      this.setData({
        goodsList: [],
        totalPrice: 0,
        remark: '',
        deliveryAddress: ''
      });
    }, 1500);
  },

  // 保存订单到本地存储
  saveOrderToStorage: function() {
    const orders = wx.getStorageSync('supermarketOrders') || [];
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    const newOrder = {
      id: Date.now(),
      orderNo: 'SM' + Date.now(),
      serviceName: '超市代买',
      serviceType: 'supermarket',
      createTime: new Date().toLocaleString(),
      price: parseFloat(this.data.totalPrice),
      status: 'pending',
      payStatus: 'paid',
      publisherId: userInfo.id || 'user_' + Date.now(),
      publisherName: userInfo.username || userInfo.name || '匿名用户',
      acceptorId: null,
      acceptorName: null,
      // 超市代买特有信息
      goodsList: this.data.goodsList,
      remark: this.data.remark,
      phone: this.data.phone,
      deliveryAddress: this.data.deliveryAddress,
      countdown: 600,
      acceptDeadline: new Date(Date.now() + 10 * 60 * 1000).toLocaleString()
    };

    orders.unshift(newOrder);
    wx.setStorageSync('supermarketOrders', orders);
    
    console.log('超市订单保存成功:', newOrder);
    
    // 显示订单发布成功提示
    wx.showModal({
      title: '订单发布成功',
      content: '您的超市代买订单已发布，骑手将很快接单！',
      showCancel: false,
      confirmText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到订单页面
          wx.switchTab({
            url: '/pages/diandan/diandan'
          });
        }
      }
    });
  },

  // 跳转到骑手申请
  goToRiderApply: function() {
    wx.navigateTo({
      url: '/pages/rider-apply/rider-apply'
    });
  },

  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=supermarket'
    });
  }
})