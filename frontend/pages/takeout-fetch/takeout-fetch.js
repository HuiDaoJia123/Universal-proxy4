// pages/takeout-fetch/takeout-fetch.js
Page({
  data: {
    // 表单数据
    takeoutLocation: '',
    locationIndex: 0,
    shopName: '',
    pickupCode: '',
    deliveryAddress: '',
    phone: '',
    specialRequest: '',
    deliveryTime: '',
    deliveryTimeIndex: 0,
    
    // 选项数据
    takeoutLocations: [
      '北门外卖点',
      '南门外卖点',
      '东门外卖点',
      '西门外卖点',
      '校内外卖柜',
      '其他位置'
    ],
    deliveryTimes: [
      '尽快送达',
      '30分钟内',
      '1小时内',
      '2小时内'
    ],
    
    // 价格数据
    serviceFee: '3.00',
    totalPrice: '3.00',
    
    // 表单验证
    canSubmit: false
  },
 
  onLoad: function (options) {
    // 页面加载时的逻辑
    console.log('外卖代取页面加载');
  },
 
  onShow: function () {
    // 页面显示时的逻辑
    console.log('外卖代取页面显示');
  },
 
  // 选择取餐地址
  onLocationChange: function(e) {
    const index = e.detail.value;
    this.setData({
      locationIndex: index,
      takeoutLocation: this.data.takeoutLocations[index]
    });
    this.checkForm();
  },
 
  // 输入店铺名称
  onShopNameInput: function(e) {
    this.setData({
      shopName: e.detail.value
    });
    this.checkForm();
  },
 
  // 输入取餐码
  onPickupCodeInput: function(e) {
    this.setData({
      pickupCode: e.detail.value
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
 
  // 输入特殊要求
  onSpecialRequestInput: function(e) {
    this.setData({
      specialRequest: e.detail.value
    });
  },
 
  // 选择送达时间
  onDeliveryTimeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      deliveryTimeIndex: index,
      deliveryTime: this.data.deliveryTimes[index]
    });
    this.checkForm();
  },
 
  // 计算价格 - 固定价格
  calculatePrice: function() {
    this.setData({
      serviceFee: '2.50',
      totalPrice: '2.50'
    });
  },
 
  // 检查表单是否可提交
  checkForm: function() {
    const { 
      takeoutLocation, 
      shopName, 
      pickupCode, 
      deliveryAddress, 
      phone, 
      deliveryTime 
    } = this.data;
    
    const canSubmit = takeoutLocation && shopName && pickupCode && 
                     deliveryAddress && phone && deliveryTime;
    
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
 
    // 直接提交订单
    this.processOrder();
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
    const orders = wx.getStorageSync('takeoutOrders') || [];
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    const newOrder = {
      id: Date.now(),
      orderNo: 'WM' + Date.now(),
      serviceName: '外卖代取',
      serviceType: 'takeout',
      createTime: new Date().toLocaleString(),
      price: parseFloat(this.data.totalPrice),
      status: 'pending',
      payStatus: 'paid',
      publisherId: userInfo.id || 'user_' + Date.now(),
      publisherName: userInfo.username || userInfo.name || '匿名用户',
      acceptorId: null,
      acceptorName: null,
      // 外卖特有信息
      takeoutLocation: this.data.takeoutLocation,
      shopName: this.data.shopName,
      pickupCode: this.data.pickupCode,
      deliveryAddress: this.data.deliveryAddress,
      phone: this.data.phone,
      specialRequest: this.data.specialRequest,
      deliveryTime: this.data.deliveryTime,
      countdown: 600,
      acceptDeadline: new Date(Date.now() + 10 * 60 * 1000).toLocaleString()
    };
 
    orders.unshift(newOrder);
    wx.setStorageSync('takeoutOrders', orders);
    
    console.log('外卖订单保存成功:', newOrder);
    
    // 显示订单发布成功提示
    wx.showModal({
      title: '订单发布成功',
      content: '您的外卖代取订单已发布，骑手将很快接单！',
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
      url: '/pages/customer-service/customer-service?serviceType=takeout'
    });
  }
})