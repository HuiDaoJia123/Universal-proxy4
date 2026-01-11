// pages/my/my.js
const api = require('../../utils/api.js');
const AuthManager = require('../../utils/auth.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatar: '',
      name: '',
      phone: ''
    },
    wallet: {
      balance: '0.00'
    },
    stats: {
      orderCount: 0,
      completedCount: 0,
      walletBalance: '0.00'
    },
    menuList: [
      {
        id: 1,
        icon: '/images/icon-order.png',
        title: '我的订单',
        subtitle: '查看全部订单',
        url: '/pages/diandan/diandan'
      },
      {
        id: 2,
        icon: '/images/icon-wallet.png',
        title: '我的钱包',
        subtitle: '余额、提现、明细',
        url: '/pages/wallet/wallet'
      },
      {
        id: 3,
        icon: '/images/icon-location.png',
        title: '收货地址',
        subtitle: '管理收货地址',
        url: '/pages/address-management/address-management'
      },
      {
        id: 4,
        icon: '/images/icon-profile.png',
        title: '个人资料',
        subtitle: '编辑个人信息',
        url: '/pages/edit-profile/edit-profile'
      },
      {
        id: 5,
        icon: '/images/icon-verify.png',
        title: '实名认证',
        subtitle: '完成认证享受更多服务',
        url: '/pages/real-name-auth/real-name-auth'
      },
      {
        id: 6,
        icon: '/images/icon-rider.png',
        title: '骑手申请',
        subtitle: '成为骑手赚取收入',
        url: '/pages/rider-apply/rider-apply'
      },
      {
        id: 7,
        icon: '/images/icon-settings.png',
        title: '设置',
        subtitle: '账号安全、隐私设置',
        url: '/pages/settings/settings'
      }
    ]
  },

  onLoad: function (options) {
    this.checkLoginStatus();
  },

  onShow: function () {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      this.loadUserStats();
    }
  },

  onPullDownRefresh: function () {
    if (this.data.isLoggedIn) {
      this.loadUserStats();
    }
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const isLoggedIn = AuthManager.isUserLoggedIn();
    
    if (isLoggedIn) {
      const userInfo = AuthManager.getUserInfo();
      console.log('用户信息:', userInfo);
      this.setData({
        isLoggedIn: true,
        userInfo: {
          avatar: userInfo.avatar || '/images/default-avatar.png',
          name: userInfo.name || '用户',
          phone: userInfo.phone || '',
          is_verified: userInfo.is_verified || false
        }
      });
      
      // 同步用户信息到后端（可选）
      this.syncUserInfo();
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {
          avatar: '/images/default-avatar.png',
          name: '点击登录',
          phone: ''
        }
      });
    }
  },

  // 微信登录
  handleLogin() {
    if (this.data.isLoggedIn) return;
    
    wx.showModal({
      title: '登录提示',
      content: '请先进行登录',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  // 获取手机号登录
  getPhoneNumber: function(e) {
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({
        title: '需要授权手机号才能继续',
        icon: 'none'
      });
      return;
    }
    
    const code = e.detail.code;
    this.wechatLogin(code);
  },

  wechatLogin: function(phoneCode) {
    wx.showLoading({ title: '登录中...' });
    
    api.request('/user/login/', {
      login_type: 'wechat',
      phone_code: phoneCode
    }, 'POST').then(res => {
      wx.hideLoading();
      if (res.code === 200) {
        // 保存用户信息
        AuthManager.saveUserInfo(res.data.user, res.data.token);
        this.checkLoginStatus();
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '登录失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 加载用户统计数据
  loadUserStats: function() {
    const userInfo = AuthManager.getUserInfo();
    
    if (!userInfo || !userInfo.id) {
      return;
    }
    
    // 获取钱包余额
    api.getWalletInfo(userInfo.id).then(res => {
      if (res.code === 200 && res.data) {
        this.setData({
          'wallet.balance': res.data.balance || '0.00',
          'stats.walletBalance': res.data.balance || '0.00'
        });
      }
    }).catch(err => {
      console.error('获取钱包信息失败:', err);
    });
    
    // 获取订单统计
    api.request('/order/stats/', { user_id: userInfo.id }, 'GET').then(res => {
      if (res.code === 200 && res.data) {
        this.setData({
          'stats.orderCount': res.data.total_orders || 0,
          'stats.completedCount': res.data.completed_orders || 0
        });
      }
    }).catch(err => {
      console.error('获取订单统计失败:', err);
    });
  },

  // 跳转到认证页面
  navigateToVerify: function() {
    if (this.data.userInfo.is_verified) {
      wx.showToast({
        title: '已完成认证',
        icon: 'success'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/real-name-auth/real-name-auth'
    });
  },

  // 编辑资料
  editProfile: function() {
    if (!this.data.isLoggedIn) {
      this.handleLogin();
      return;
    }
    
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    });
  },

  // 菜单项点击
  onMenuTap: function(e) {
    const item = e.currentTarget.dataset.item;
    
    if (!this.data.isLoggedIn && item.id !== 7) { // 设置页不需要登录
      this.handleLogin();
      return;
    }
    
    if (item.url) {
      if (item.url.startsWith('/pages/diandan')) {
        wx.switchTab({
          url: item.url
        });
      } else {
        wx.navigateTo({
          url: item.url
        });
      }
    }
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#00982D',
      success: (res) => {
        if (res.confirm) {
          // 清除本地数据
          AuthManager.clearAllUserData();
          
          // 通知后端退出
          const userInfo = this.data.userInfo;
          if (userInfo.id) {
            api.request('/user/logout/', { user_id: userInfo.id }, 'POST', { 
              hideLoading: true 
            }).catch(err => {
              console.error('退出登录请求失败:', err);
            });
          }
          
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatar: '/images/default-avatar.png',
              name: '点击登录',
              phone: ''
            },
            wallet: { balance: '0.00' },
            stats: {
              orderCount: 0,
              completedCount: 0,
              walletBalance: '0.00'
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 联系客服
  contactService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service'
    });
  },

  // 同步用户信息到后端（可选）
  syncUserInfo: function() {
    const userInfo = AuthManager.getUserInfo();
    const token = AuthManager.getUserToken();
    
    if (!userInfo.id || !token) {
      return;
    }
    
    // 记录用户访问日志（可选）
    api.request('/user/login-log/', {
      user_id: userInfo.id,
      action: 'page_visit',
      page: 'my'
    }, 'POST', { hideLoading: true }).catch(err => {
      console.error('记录访问日志失败:', err);
    });
  }
});