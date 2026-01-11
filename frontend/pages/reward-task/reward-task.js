// pages/reward-task/reward-task.js
Page({
  data: {
    selectedService: null, // 'substitute' 或 'brush'
    
    // 代课服务数据
    substituteData: {
      building: '',
      classroom: '',
      subject: '',
      studentName: '',
      studentId: '',
      remark: ''
    },
    substituteAdditional: {
      noteTaking: false,
      homework: false,
      presentation: false,
      answering: false
    },
    
    // 刷课服务数据
    brushData: {
      subject: '',
      studentName: '',
      studentId: '',
      school: '',
      phone: '',
      platformAccount: '',
      platformPassword: '',
      remark: ''
    },
    brushAdditional: {
      exam: false,
      homework: false,
      discussion: false
    },
    
    // 代课时间选项
    classTimes: [
      { id: 1, range: '第1-2节', duration: '08:00-09:40' },
      { id: 2, range: '第3-4节', duration: '10:00-11:40' },
      { id: 3, range: '第5-6节', duration: '14:00-15:40' },
      { id: 4, range: '第7-8节', duration: '16:00-17:40' },
      { id: 5, range: '第9-10节', duration: '19:00-20:40' }
    ],
    selectedTime: null,
    
    // 价格相关
    basePrice: 0,
    additionalPrice: 0,
    priceBoost: 0,
    totalPrice: 0,
    
    canSubmit: false
  },
 
  onLoad: function (options) {
    // 页面加载时的逻辑
  },
 
  // 选择服务类型
  selectServiceType: function(e) {
    const service = e.currentTarget.dataset.service;
    this.setData({
      selectedService: service,
      selectedTime: null,
      priceBoost: 0
    }, () => {
      this.calculatePrice();
      this.validateForm();
    });
  },
 
  // 代课服务输入处理
  onSubstituteInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      ['substituteData.' + field]: value
    }, () => {
      this.validateForm();
    });
  },
 
  // 刷课服务输入处理
  onBrushInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      ['brushData.' + field]: value
    }, () => {
      this.validateForm();
    });
  },
 
  // 选择代课时间
  selectTime: function(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      selectedTime: time.id
    }, () => {
      this.validateForm();
    });
  },
 
  // 切换代课附加服务
  toggleSubstituteAdditional: function(e) {
    const service = e.currentTarget.dataset.service;
    this.setData({
      ['substituteAdditional.' + service]: !this.data.substituteAdditional[service]
    }, () => {
      this.calculatePrice();
    });
  },
 
  // 切换刷课附加服务
  toggleBrushAdditional: function(e) {
    const service = e.currentTarget.dataset.service;
    this.setData({
      ['brushAdditional.' + service]: !this.data.brushAdditional[service]
    }, () => {
      this.calculatePrice();
    });
  },
 
  // 选择加价
  selectPriceBoost: function(e) {
    const boost = parseInt(e.currentTarget.dataset.boost);
    this.setData({
      priceBoost: boost
    }, () => {
      this.calculatePrice();
    });
  },
 
  // 计算价格
  calculatePrice: function() {
    let basePrice = 0;
    let additionalPrice = 0;
 
    if (this.data.selectedService === 'substitute') {
      basePrice = 25;
      // 代课附加服务价格
      if (this.data.substituteAdditional.noteTaking) additionalPrice += 5;
      if (this.data.substituteAdditional.homework) additionalPrice += 10;
      if (this.data.substituteAdditional.presentation) additionalPrice += 15;
      if (this.data.substituteAdditional.answering) additionalPrice += 8;
    } else if (this.data.selectedService === 'brush') {
      basePrice = 3.5;
      // 刷课附加服务价格
      if (this.data.brushAdditional.exam) additionalPrice += 10;
      if (this.data.brushAdditional.homework) additionalPrice += 8;
      if (this.data.brushAdditional.discussion) additionalPrice += 5;
    }
 
    const totalPrice = basePrice + additionalPrice + this.data.priceBoost;
 
    this.setData({
      basePrice,
      additionalPrice,
      totalPrice
    });
  },
 
  // 验证表单
  validateForm: function() {
    let canSubmit = false;
 
    if (this.data.selectedService === 'substitute') {
      const { building, classroom, subject, studentName, studentId } = this.data.substituteData;
      canSubmit = building && classroom && subject && studentName && studentId && this.data.selectedTime;
    } else if (this.data.selectedService === 'brush') {
      const { subject, studentName, studentId, school, phone, platformAccount, platformPassword } = this.data.brushData;
      canSubmit = subject && studentName && studentId && school && phone && platformAccount && platformPassword && this.validatePhone(phone);
    }
 
    this.setData({ canSubmit });
  },
 
  // 验证手机号
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
 
  // 修改后的跳转到申请成为服务者页面
  goToApplyService: function() {
    wx.showModal({
      title: '申请成为服务者',
      content: '成为服务者需要通过人工审核，审核通过后您就可以接单赚取零花钱了。是否继续申请？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          // 用户点击确定，显示服务类型选择
          wx.showActionSheet({
            itemList: ['申请成为代课同学', '申请成为刷客'],
            success: (res) => {
              if (res.tapIndex === 0) {
                // 跳转到代课同学申请页面
                wx.navigateTo({
                  url: '/pages/apply-substitute/apply-substitute'
                });
              } else if (res.tapIndex === 1) {
                // 跳转到刷客申请页面
                wx.navigateTo({
                  url: '/pages/apply-brusher/apply-brusher'
                });
              }
            }
          });
        }
      }
    });
  },
 
  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=reward'
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
 
    wx.showLoading({
      title: '发布中...',
    });
 
    // 构建订单数据
    const orderData = {
      serviceType: this.data.selectedService,
      totalPrice: this.data.totalPrice,
      priceBoost: this.data.priceBoost,
      timestamp: new Date().getTime()
    };
 
    if (this.data.selectedService === 'substitute') {
      orderData.substituteData = this.data.substituteData;
      orderData.substituteAdditional = this.data.substituteAdditional;
      orderData.selectedTime = this.data.selectedTime;
    } else {
      orderData.brushData = this.data.brushData;
      orderData.brushAdditional = this.data.brushAdditional;
    }
 
    // 模拟提交到服务器
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '发布成功！',
        icon: 'success'
      });
 
      // 跳转到订单详情或订单列表
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 2000);
  }
})