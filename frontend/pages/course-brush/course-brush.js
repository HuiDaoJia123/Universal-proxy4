const AuthManager = require('../../utils/auth.js');
const api = require('../../utils/api.js');
 
Page({
  data: {
    // 表单数据
    formData: {
      subject: '',
      studentName: '',
      studentId: '',
      school: '',
      phone: '',
      platformAccount: '',
      platformPassword: '',
      remark: ''
    },
    
    // 价格相关 - 更新为新价格
    basePrice: 3,           // 从30元改为3元
    additionalPrice: 0,
    priceBoost: 0,
    totalPrice: 3,
    commissionRate: 0.1,    // 10%抽成
    
    // 附加服务 - 更新为新价格
    additionalServices: {
      exam: false,          // 考试10元
      homework: false,       // 作业8元
      discussion: false     // 讨论5元
    },
    
    // 加价选项
    boostOptions: [0, 5, 10, 15],
    
    // 表单验证
    canSubmit: false
  },
 
  onLoad(options) {
    this.autoFillUserInfo();
  },
 
  // 自动填充用户信息
  autoFillUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      'formData.studentName': userInfo.username || '',
      'formData.studentId': userInfo.studentId || '',
      'formData.phone': userInfo.phone || ''
    }, () => {
      this.checkFormValidity();
    });
  },
 
  // 输入框变化事件
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    }, () => {
      this.checkFormValidity();
    });
  },
 
  // 切换附加服务
  toggleAdditionalService(e) {
    const { service } = e.currentTarget.dataset;
    const currentState = this.data.additionalServices[service];
    
    this.setData({
      [`additionalServices.${service}`]: !currentState
    }, () => {
      this.calculateAdditionalPrice();
      this.calculateTotalPrice();
    });
  },
 
  // 选择加价金额
  selectPriceBoost(e) {
    const { boost } = e.currentTarget.dataset;
    this.setData({
      priceBoost: boost
    }, () => {
      this.calculateTotalPrice();
    });
  },
 
  // 计算附加服务价格 - 更新为新价格
  calculateAdditionalPrice() {
    let price = 0;
    const services = this.data.additionalServices;
    
    // 新价格：考试10元，作业8元，讨论5元
    if (services.exam) price += 10;
    if (services.homework) price += 8;
    if (services.discussion) price += 5;
    
    this.setData({
      additionalPrice: price
    });
  },
 
  // 计算总价 - 添加抽成计算
  calculateTotalPrice() {
    const baseTotal = this.data.basePrice + this.data.additionalPrice + this.data.priceBoost;
    const commission = (this.data.basePrice + this.data.additionalPrice) * this.data.commissionRate;
    // 加价部分不抽成
    const riderEarnings = (this.data.basePrice + this.data.additionalPrice) * (1 - this.data.commissionRate) + this.data.priceBoost;
    
    this.setData({
      totalPrice: baseTotal,
      platformCommission: commission,
      riderEarnings: riderEarnings
    });
  },
 
  // 检查表单是否可提交
  checkFormValidity() {
    const { formData } = this.data;
    const isFilled = Object.values(formData).every(value => value.trim() !== '');
    const isPhoneValid = /^1[3-9]\d{9}$/.test(formData.phone);
    
    this.setData({
      canSubmit: isFilled && isPhoneValid
    });
  },
 
  // 申请成为刷客
  goToApplyBrusher() {
    wx.navigateTo({
      url: '/pages/apply-audit/apply-audit?type=brusher'
    });
  },
 
  // 联系客服
  contactCustomerService() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=course-brush'
    });
  },
 
  // 提交订单
  submitOrder() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整且正确的信息',
        icon: 'none'
      });
      return;
    }
 
    wx.showModal({
      title: '确认提交',
      content: `您的订单信息：\n科目：${this.data.formData.subject}\n总价：¥${this.data.totalPrice.toFixed(2)}\n(平台抽成10%)\n\n提交后将无法修改，请确认信息无误。`,
      confirmText: '确认提交',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.processOrder();
        }
      }
    });
  },
 
  // 处理订单提交
  processOrder() {
    wx.showLoading({
      title: '提交中...'
    });
 
    // 保存订单到本地存储
    const orders = wx.getStorageSync('courseBrushOrders') || [];
    const userInfo = wx.getStorageSync('userInfo') || {};
    const newOrder = {
      id: Date.now(),
      orderNo: 'SK' + Date.now(),
      createTime: new Date().toLocaleString(),
      ...this.data.formData,
      additionalServices: this.data.additionalServices,
      price: this.data.totalPrice,
      commissionRate: this.data.commissionRate,
      platformCommission: this.data.platformCommission,
      riderEarnings: this.data.riderEarnings,
      status: 'pending',
      publisherId: userInfo.id || 'user_' + Date.now(),
      publisherName: userInfo.username || userInfo.name || '匿名用户'
    };
 
    orders.unshift(newOrder);
    wx.setStorageSync('courseBrushOrders', orders);
 
    wx.hideLoading();
    wx.showToast({
      title: '订单提交成功',
      icon: 'success'
    });
 
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/diandan/diandan'
      });
    }, 1500);
  }
});