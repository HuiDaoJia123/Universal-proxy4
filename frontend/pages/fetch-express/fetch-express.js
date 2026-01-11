// pages/fetch-express/fetch-express.js
Page({
  data: {
    // 表单数据
    pickupAddress: '',
    pickupCode: '',
    expressCompany: '',
    expressCompanyIndex: 0,
    deliveryAddress: '',
    phone: '',
    weight: 'small',
    specialNote: '',
    
    // 选项数据
    expressCompanies: [
      '顺丰快递',
      '中通快递',
      '圆通快递',
      '申通快递',
      '韵达快递',
      '京东快递',
      '邮政快递',
      '其他快递'
    ],

    
    // 价格数据
    serviceFee: '2.50',
    totalPrice: '2.50',
    
    // 表单验证
    canSubmit: false
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
    console.log('代取快递页面加载');
  },

  onShow: function () {
    // 页面显示时的逻辑
    console.log('代取快递页面显示');
  },

  // 输入取件地址
  onPickupAddressInput: function(e) {
    this.setData({
      pickupAddress: e.detail.value
    });
    this.checkForm();
  },

  // 输入取件码
  onPickupCodeInput: function(e) {
    this.setData({
      pickupCode: e.detail.value
    });
    this.checkForm();
  },

  // 选择快递公司
  onExpressCompanyChange: function(e) {
    const index = e.detail.value;
    this.setData({
      expressCompanyIndex: index,
      expressCompany: this.data.expressCompanies[index]
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

  // 输入联系电话
  onPhoneInput: function(e) {
    this.setData({
      phone: e.detail.value
    });
    this.checkForm();
  },

  // 选择快递重量
  selectWeight: function(e) {
    const weight = e.currentTarget.dataset.weight;
    this.setData({
      weight: weight
    });
    this.calculatePrice();
  },

  // 输入特殊说明
  onSpecialNoteInput: function(e) {
    this.setData({
      specialNote: e.detail.value
    });
  },



  // 计算价格
  calculatePrice: function() {
    let serviceFee = 2.50;
    
    switch(this.data.weight) {
      case 'small':
        serviceFee = 2.50;
        break;
      case 'medium':
        serviceFee = 3.50;
        break;
      case 'large':
        serviceFee = 5.00;
        break;
      case 'heavy':
        serviceFee = 0; // 需要客服联系确定价格
        break;
    }
    
    this.setData({
      serviceFee: serviceFee.toFixed(2),
      totalPrice: serviceFee.toFixed(2)
    });
  },

  // 检查表单是否可提交
  checkForm: function() {
    const { 
      pickupAddress, 
      pickupCode, 
      expressCompany, 
      deliveryAddress, 
      phone
    } = this.data;
    
    const canSubmit = pickupAddress && pickupCode && expressCompany && 
                     deliveryAddress && phone && deliveryTime;
    
    this.setData({
      canSubmit: canSubmit
    });
  },

  // 提交订单
  submitOrder: function() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    if (!this.validatePhone(this.data.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 如果是特重件，提示需要联系客服
    if (this.data.weight === 'heavy') {
      wx.showModal({
        title: '特重件提示',
        content: '您的快递属于特重件，价格需要联系客服确定。确认提交订单吗？',
        success: (res) => {
          if (res.confirm) {
            this.processOrder();
          }
        }
      });
    } else {
      this.processOrder();
    }
  },

  // 验证手机号
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 处理订单
  processOrder: function() {
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
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 2000);
  },

  // 保存订单到本地存储
  saveOrderToStorage: function() {
    const orders = wx.getStorageSync('expressOrders') || [];
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    const newOrder = {
      id: Date.now(),
      orderNo: 'DD' + Date.now(),
      serviceName: '代取快递',
      serviceType: 'express',
      createTime: new Date().toLocaleString(),
      price: parseFloat(this.data.totalPrice),
      status: 'pending',
      payStatus: 'paid',
      publisherId: userInfo.id || 'user_' + Date.now(),
      publisherName: userInfo.username || userInfo.name || '匿名用户',
      acceptorId: null,
      acceptorName: null,
      // 快递特有信息
      pickupAddress: this.data.pickupAddress,
      pickupCode: this.data.pickupCode,
      expressCompany: this.data.expressCompany,
      deliveryAddress: this.data.deliveryAddress,
      phone: this.data.phone,
      weight: this.data.weight,
      specialNote: this.data.specialNote,
      countdown: 600, // 10分钟抢单时间
      acceptDeadline: new Date(Date.now() + 10 * 60 * 1000).toLocaleString()
    };

    orders.unshift(newOrder);
    wx.setStorageSync('expressOrders', orders);
    
    console.log('快递订单保存成功:', newOrder);
    
    // 显示订单发布成功提示
    wx.showModal({
      title: '订单发布成功',
      content: '您的代取快递订单已发布，骑手将很快接单！',
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

  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=express'
    });
  }
})