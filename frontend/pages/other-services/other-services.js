// pages/other-services/other-services.js
Page({
  data: {
    services: [
      {
        id: 1,
        name: '送水到寝',
        emoji: '💧',
        bgClass: 'bg-blue',
        price: '3元/桶',
        description: '送水到寝服务，3元一桶，直接送到宿舍门口',
        basePrice: 3
      },
      {
        id: 2,
        name: '洗衣服务',
        emoji: '👕',
        bgClass: 'bg-teal',
        price: '8-15元/件',
        description: '洗衣服务，8-15元一件，专业清洗',
        basePrice: 10
      },
      {
        id: 3,
        name: '洗鞋服务',
        emoji: '👟',
        bgClass: 'bg-orange',
        price: '10-20元/双',
        description: '洗鞋服务，10-20元一双，专业清洗',
        basePrice: 15
      },
      {
        id: 4,
        name: '打印资料',
        emoji: '📄',
        bgClass: 'bg-green',
        price: '0.5元/页',
        description: '打印资料服务，0.5元一页，支持各种格式',
        basePrice: 5
      },
      {
        id: 5,
        name: '代写服务',
        emoji: '✍️',
        bgClass: 'bg-red',
        price: '按难度定价',
        description: '代写服务，按难度定价，专业文案撰写',
        basePrice: 20
      },
      {
        id: 6,
        name: '万能任务',
        emoji: '🔧',
        bgClass: 'bg-yellow',
        price: '双方协商',
        description: '万能任务，其他个性化需求，价格双方协商',
        basePrice: 15
      }
    ],
    currentService: null,
    selectedService: null,
    formData: {
      requirements: '',
      address: '',
      phone: '',
      expectedTime: '',
      remarks: ''
    },
    totalPrice: 0,
    isFormValid: false
  },

  onLoad: function (options) {
    // 尝试自动填充用户信息
    this.autoFillFromProfile();
    
    console.log('其他服务页面加载');
  },

  onShow: function () {
    console.log('其他服务页面显示');
  },

  // 从个人信息自动填充
  autoFillFromProfile: function() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    this.setData({
      'formData.phone': userInfo.phone || ''
    });
  },

  // 选择服务
  selectService: function(e) {
    const service = e.currentTarget.dataset.service;
    this.setData({
      currentService: service.id,
      selectedService: service,
      totalPrice: service.basePrice
    });
    this.validateForm();
  },

  // 输入服务要求
  onRequirementsInput: function(e) {
    this.setData({
      'formData.requirements': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  // 输入地址
  onAddressInput: function(e) {
    this.setData({
      'formData.address': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  // 输入手机号
  onPhoneInput: function(e) {
    this.setData({
      'formData.phone': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  // 选择期望时间
  onTimeChange: function(e) {
    this.setData({
      'formData.expectedTime': e.detail.value
    });
  },

  // 输入备注
  onRemarksInput: function(e) {
    this.setData({
      'formData.remarks': e.detail.value
    });
  },

  // 验证表单
  validateForm: function() {
    const { requirements, address, phone } = this.data.formData;
    const { currentService } = this.data;
    
    const isValid = currentService && 
                   requirements.trim() && 
                   address.trim() && 
                   phone.trim() && 
                   phone.length === 11;
    
    this.setData({
      isFormValid: isValid
    });
  },

  // 验证手机号
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=other'
    });
  },

  // 提交订单
  submitOrder: function() {
    if (!this.data.isFormValid) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    if (!this.validatePhone(this.data.formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...',
    });

    // 模拟提交到服务器
    setTimeout(() => {
      wx.hideLoading();

      // 保存订单到本地存储
      this.saveOrderToStorage();

      wx.showModal({
        title: '提交成功',
        content: '您的服务申请已提交！客服将在24小时内联系您确认订单详情。',
        showCancel: false,
        confirmText: '我知道了',
        success: (res) => {
          if (res.confirm) {
            // 返回首页
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        }
      });
    }, 2000);
  },

  // 保存订单到本地存储
  saveOrderToStorage: function() {
    const orders = wx.getStorageSync('otherOrders') || [];
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    const newOrder = {
      id: Date.now(),
      orderNo: 'OT' + Date.now(),
      serviceName: this.data.selectedService.name,
      serviceType: 'other',
      createTime: new Date().toLocaleString(),
      price: this.data.totalPrice,
      status: 'pending',
      payStatus: 'paid',
      publisherId: userInfo.id || 'user_' + Date.now(),
      publisherName: userInfo.username || userInfo.name || '匿名用户',
      acceptorId: null,
      acceptorName: null,
      // 其他服务特有信息
      requirements: this.data.formData.requirements,
      address: this.data.formData.address,
      phone: this.data.formData.phone,
      expectedTime: this.data.formData.expectedTime,
      remarks: this.data.formData.remarks,
      countdown: 600,
      acceptDeadline: new Date(Date.now() + 10 * 60 * 1000).toLocaleString()
    };

    orders.unshift(newOrder);
    wx.setStorageSync('otherOrders', orders);
    
    console.log('其他服务订单保存成功:', newOrder);
  }
});