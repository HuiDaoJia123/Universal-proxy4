// pages/login/login.js
const api = require('../../utils/api.js');
const AuthManager = require('../../utils/auth.js');
 
Page({
  data: {
    loading: false,
    loginSuccess: false,
    isDev: true  // 开发环境标识
  },
 
  onLoad: function (options) {
    // 判断是否为开发工具
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ 
      isDev: systemInfo.platform === 'devtools' 
    });
  },
 
  // 微信一键登录 - 获取手机号
  onGetPhoneNumber(e) {
    console.log('获取手机号事件:', e);
    
    if (this.data.loading || this.data.loginSuccess) {
      return;
    }
    
    // 开发工具环境：直接使用模拟登录
    if (this.data.isDev) {
      console.log('开发工具环境，使用模拟登录');
      this.devModeLogin();
      return;
    }
    
    // 真机环境：检查用户是否同意授权
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '需要授权手机号才能继续',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    const phoneCode = e.detail.code;
    console.log('手机号授权码:', phoneCode);
    
    if (!phoneCode) {
      wx.showModal({
        title: '授权失败',
        content: '未能获取手机号授权，请重试',
        showCancel: false
      });
      return;
    }
    
    // 开始登录流程
    this.setData({ loading: true });
    
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 步骤1: 获取微信登录code
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('获取微信登录code成功:', res.code);
          
          // 步骤2: 获取用户基本信息
          this.getUserProfile(res.code, phoneCode);
        } else {
          console.error('获取微信登录code失败:', res.errMsg);
          this.showLoginError('获取登录凭证失败');
        }
      },
      fail: (err) => {
        console.error('wx.login失败:', err);
        this.showLoginError('微信登录失败');
      }
    });
  },
 
  // 开发工具模式登录
  devModeLogin() {
    this.setData({ loading: true });
    
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 获取微信登录code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 开发环境使用模拟手机号
          const mockPhone = '138' + Math.floor(Math.random() * 89999999 + 10000000).toString();
          console.log('开发环境模拟手机号:', mockPhone);
          
          // 模拟获取用户信息
          this.getUserProfile(res.code, mockPhone);
        }
      },
      fail: () => {
        this.showLoginError('登录失败');
      }
    });
  },
 
  // 获取用户授权信息
  getUserProfile(loginCode, phoneCodeOrPhone) {
    const isDevPhone = typeof phoneCodeOrPhone === 'string' && phoneCodeOrPhone.length === 11;
    
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('获取用户信息成功:', res.userInfo);
        
        // 步骤3: 发送到后端登录
        if (isDevPhone) {
          this.sendToBackend(loginCode, null, res.userInfo, phoneCodeOrPhone);
        } else {
          this.sendToBackend(loginCode, phoneCodeOrPhone, res.userInfo);
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        
        // 用户拒绝头像昵称授权，使用默认信息继续登录
        if (isDevPhone) {
          this.sendToBackend(loginCode, null, {
            nickName: '开发测试用户',
            avatarUrl: '/images/default-avatar.png'
          }, phoneCodeOrPhone);
        } else {
          this.sendToBackend(loginCode, phoneCodeOrPhone, {
            nickName: '微信用户',
            avatarUrl: '/images/default-avatar.png'
          });
        }
      }
    });
  },
 
  // 发送到后端登录
  sendToBackend(loginCode, phoneCode, userInfo, devPhone = null) {
    console.log('=== 调试信息 ===');
    console.log('api 对象:', api);
    console.log('api.BASE_URL:', api.BASE_URL);
    console.log('完整URL:', `${api.BASE_URL}/login/`);
    console.log('===============');
    
    const requestData = {
      login_type: 'wechat',
      code: loginCode,
      userInfo: userInfo
    };
    
    // 真机环境添加phone_code
    if (phoneCode) {
      requestData.phone_code = phoneCode;
    }
    
    // 开发环境添加dev_phone
    if (devPhone) {
      requestData.dev_phone = devPhone;
    }
    
    wx.request({
      url: `${api.BASE_URL}/login/`,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('后端登录响应:', res.data);
        
        wx.hideLoading();
        
        if (res.data.code === 200 && res.data.data) {
          const userData = res.data.data.user;
          const token = res.data.data.token;
          
          // ✅ 改进：使用 AuthManager 统一管理用户信息（更规范）
          AuthManager.saveUserInfo(userData, token);
          wx.setStorageSync('isLoggedIn', true);
          
          this.setData({
            loading: false,
            loginSuccess: true
          });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });
          
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          this.showLoginError(res.data.msg || '登录失败');
        }
      },
      fail: (err) => {
        console.error('后端登录请求失败:', err);
        wx.hideLoading();
        this.showLoginError('网络连接失败');
      }
    });
  },
 
  // 显示登录错误
  showLoginError(message) {
    wx.hideLoading();
    this.setData({ loading: false });
    
    wx.showModal({
      title: '登录失败',
      content: message,
      showCancel: false,
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '请重新点击登录按钮',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },
 
  // 手机号登录
  phoneLogin() {
    wx.showModal({
      title: '提示',
      content: '请使用微信一键登录更快捷',
      showCancel: false,
      confirmText: '我知道了'
    });
  },
 
  // 游客登录
  guestLogin() {
    wx.showModal({
      title: '提示',
      content: '请使用微信一键登录更快捷',
      showCancel: false,
      confirmText: '我知道了'
    });
  },
  
  // 用户协议
  viewUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=user'
    });
  },
  
  // 隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=privacy'
    });
  }
});