const AuthManager = require('../../utils/auth.js');
const api = require('../../utils/api.js');
 
Page({
  data: {
    // 基本信息
    building: '',
    classroom: '',
    subject: '',
    studentName: '',
    studentId: '',
    phone: '',
    
    // 认证相关
    isUserAuthenticated: false,
    authInfo: null,
    
    // 代课时间
    selectedTime: null,
    classTimes: [
      { id: 1, range: '8:10-9:40', duration: '90分钟' },
      { id: 2, range: '9:55-11:25', duration: '90分钟' },
      { id: 3, range: '13:00-14:30', duration: '90分钟' },
      { id: 4, range: '14:40-16:00', duration: '80分钟' },
      { id: 5, range: '16:10-17:40', duration: '90分钟' },
      { id: 6, range: '17:50-19:00', duration: '70分钟' }
    ],
    
    // 附加服务 - 更新为新价格
    additionalServices: {
      exam: false,        // 考试10元
      homework: false,    // 作业8元
      discussion: false   // 讨论5元
    },
    additionalPrice: 0,
    
    // 加价模块
    priceBoost: 0,
    
    // 备注信息
    remark: '',
    
    // 价格计算 - 更新抽成率
    basePrice: 25,
    totalPrice: 25,
    commissionRate: 0.1,  // 10%抽成
    
    // 表单验证
    canSubmit: false
  },
 
  onLoad: function (options) {
    console.log('代课服务页面加载');
    
    if (!AuthManager.hasPermission('substitute_class')) {
      wx.showModal({
        title: '权限不足',
        content: '请先完成实名认证后再发布代课订单',
        confirmText: '去认证',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/real-name-auth/real-name-auth'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    this.autoFillFromAuth();
    this.validateForm();
  },
 
  onShow: function () {
    console.log('代课服务页面显示');
  },
 
  autoFillFromAuth: function() {
    const authInfo = AuthManager.getAuthInfo();
    const isAuthenticated = AuthManager.isAuthenticated();
    
    if (isAuthenticated && authInfo) {
      this.setData({
        studentName: authInfo.realName || '',
        studentId: authInfo.studentId || '',
        isUserAuthenticated: true,
        authInfo: authInfo
      });
      
      wx.showToast({
        title: '已自动填充认证信息',
        icon: 'none',
        duration: 1500
      });
      
      console.log('已从实名认证信息自动填充:', authInfo);
    } else {
      this.setData({
        isUserAuthenticated: false,
        authInfo: null
      });
      console.log('用户未完成实名认证，无法自动填充');
    }
  },
 
  goToRealNameAuth: function() {
    wx.navigateTo({
      url: '/pages/real-name-auth/real-name-auth'
    });
  },
 
  // 基本信息输入
  onBuildingInput: function(e) {
    this.setData({
      building: e.detail.value
    });
    this.validateForm();
  },
 
  onClassroomInput: function(e) {
    this.setData({
      classroom: e.detail.value
    });
    this.validateForm();
  },
 
  onSubjectInput: function(e) {
    this.setData({
      subject: e.detail.value
    });
    this.validateForm();
  },
 
  onStudentNameInput: function(e) {
    this.setData({
      studentName: e.detail.value
    });
    this.validateForm();
  },
 
  onStudentIdInput: function(e) {
    this.setData({
      studentId: e.detail.value
    });
    this.validateForm();
  },
 
  onPhoneInput: function(e) {
    this.setData({
      phone: e.detail.value
    });
    this.validateForm();
  },
 
  selectTime: function(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      selectedTime: time.id
    });
    this.validateForm();
  },
 
  // 切换附加服务
  toggleAdditionalService: function(e) {
    const service = e.currentTarget.dataset.service;
    const currentState = this.data.additionalServices[service];
    
    this.setData({
      [`additionalServices.${service}`]: !currentState
    });
    
    this.calculateAdditionalPrice();
    this.calculateTotalPrice();
  },
 
  // 计算附加服务价格 - 更新为新价格
  calculateAdditionalPrice: function() {
    let additionalPrice = 0;
    const services = this.data.additionalServices;
    
    // 新价格：考试10元，作业8元，讨论5元
    if (services.exam) additionalPrice += 10;
    if (services.homework) additionalPrice += 8;
    if (services.discussion) additionalPrice += 5;
    
    this.setData({
      additionalPrice: additionalPrice
    });
  },
 
  selectPriceBoost: function(e) {
    const boost = parseInt(e.currentTarget.dataset.boost);
    this.setData({
      priceBoost: boost
    });
    this.calculateTotalPrice();
  },
 
  onRemarkInput: function(e) {
    this.setData({
      remark: e.detail.value
    });
  },
 
  // 计算总价 - 添加抽成计算
  calculateTotalPrice: function() {
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
 
  validateForm: function() {
    const { 
      building, 
      classroom, 
      subject, 
      studentName, 
      studentId, 
      phone,
      selectedTime 
    } = this.data;
    
    const canSubmit = building && 
                     classroom && 
                     subject && 
                     studentName && 
                     studentId && 
                     phone &&
                     phone.length === 11 &&
                     selectedTime;
    
    this.setData({
      canSubmit: canSubmit
    });
  },
 
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
 
  goToApplyTeacher: function() {
    wx.navigateTo({
      url: '/pages/apply-audit/apply-audit?type=teacher',
    });
  },
 
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service?serviceType=substitute'
    });
  },
 
  submitOrder: function() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
 
    if (!this.validatePhone(this.data.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
 
    const selectedTimeObj = this.data.classTimes.find(time => time.id === this.data.selectedTime);
    
    wx.showModal({
      title: '确认代课订单',
      content: `您将发布代课需求：\n时间：${selectedTimeObj.range}\n地点：${this.data.building} ${this.data.classroom}\n科目：${this.data.subject}\n总计：¥${this.data.totalPrice.toFixed(2)}\n(平台抽成10%)`,
      success: (res) => {
        if (res.confirm) {
          this.processOrder();
        }
      }
    });
  },
 
  processOrder: function() {
    wx.showLoading({
      title: '发布中...',
    });
 
    const selectedTimeObj = this.data.classTimes.find(time => time.id === this.data.selectedTime);
    const userInfo = AuthManager.getUserInfo();
    
    const orderData = {
      // 订单基本信息
      building: this.data.building,
      classroom: this.data.classroom,
      subject: this.data.subject,
      studentName: this.data.studentName,
      studentId: this.data.studentId,
      phone: this.data.phone,
      classTime: selectedTimeObj.range,
      classTimeId: selectedTimeObj.id,
      
      // 价格信息 - 更新抽成
      basePrice: this.data.basePrice,
      additionalPrice: this.data.additionalPrice,
      priceBoost: this.data.priceBoost,
      totalPrice: this.data.totalPrice,
      commissionRate: this.data.commissionRate,
      platformCommission: this.data.platformCommission,
      riderEarnings: this.data.riderEarnings,
      
      // 附加服务
      additionalServices: this.data.additionalServices,
      
      // 其他信息
      remark: this.data.remark,
      isAuthUser: this.data.isUserAuthenticated,
      
      // 发布者信息
      publisherId: userInfo?.id || 'unknown',
      publisherName: userInfo?.username || userInfo?.name || '匿名用户'
    };
 
    api.submitSubstituteOrder(orderData)
      .then(response => {
        wx.hideLoading();
        
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        
        wx.showModal({
          title: '订单发布成功',
          content: '您的代课服务订单已发布，代课同学将很快接单！',
          showCancel: false,
          confirmText: '我知道了',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/diandan/diandan'
              });
            }
          }
        });
      })
      .catch(error => {
        wx.hideLoading();
        
        console.error('订单提交失败:', error);
        wx.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
      });
  }
});