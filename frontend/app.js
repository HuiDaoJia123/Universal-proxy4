// frontend/app.js
const AuthManager = require('./utils/auth.js');
const api = require('./utils/api.js');
const i18n = require('./i18n/index.js');
const themeManager = require('./theme/index.js');
 
App({
  onLaunch() {
    console.log('小程序启动');
    
    // 初始化 i18n 和主题系统
    this.initI18nAndTheme();
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
 
    // 初始化用户数据
    this.initUserData();
    
    // 检查网络状态
    this.checkNetworkStatus();
    
    // 初始化微信登录（根据需要）
    this.initWxLogin();
  },
 
  onShow() {
    console.log('小程序显示');
    // 可以在这里处理页面显示时的逻辑
  },
 
  onHide() {
    console.log('小程序隐藏');
    // 可以在这里处理页面隐藏时的逻辑
  },
 
  onError(error) {
    console.error('小程序错误:', error);
  },
 
  /**
   * 初始化国际化(i18n)和主题系统
   */
  initI18nAndTheme() {
    console.log('初始化 i18n 和主题系统');
    
    // 初始化 i18n
    this.globalData.i18n = i18n;
    
    // 初始化主题
    this.globalData.themeManager = themeManager;
    themeManager.applyTheme();  // 现在这个函数应该存在了
    
    // 监听系统主题变化（如果设置了自动模式）
    if (wx.onThemeChange) {
      wx.onThemeChange((res) => {
        console.log('系统主题变化:', res.theme);
        if (themeManager.getCurrentThemeCode() === 'auto') {
          themeManager.setAutoTheme();
        }
      });
    }
  },
 
  /**
   * 初始化用户数据
   */
  initUserData() {
    const profile = AuthManager.getUserProfile();
    this.globalData.userProfile = profile;
    
    // 监听权限变更
    AuthManager.onPermissionChange((changeInfo) => {
      console.log('权限状态变更:', changeInfo);
      this.globalData.userProfile = AuthManager.getUserProfile();
      
      // 可以在这里做一些全局处理
      this.handlePermissionChange(changeInfo);
    });
  },
 
  /**
   * 处理权限变更
   */
  handlePermissionChange(changeInfo) {
    switch (changeInfo.type) {
      case 'user_logout':
        // 用户登出，可以跳转到登录页
        console.log('用户已登出');
        break;
      case 'auth_status_changed':
        // 认证状态变更
        console.log('认证状态已变更:', changeInfo.data.status);
        break;
      case 'application_updated':
        // 申请状态变更
        console.log('申请状态已更新:', changeInfo.data);
        break;
    }
  },
 
  /**
   * 检查网络状态
   */
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showModal({
            title: this.globalData.i18n ? this.globalData.i18n.t('common.error') : '网络连接失败',
            content: this.globalData.i18n ? this.globalData.i18n.t('messages.networkError') : '请检查网络连接后重新启动应用',
            showCancel: false
          });
        } else {
          console.log('网络状态正常:', res.networkType);
          this.globalData.networkType = res.networkType;
        }
      }
    });
  },
 
  /**
   * 初始化微信登录
   */
  initWxLogin() {
    // 根据业务需求决定是否需要自动微信登录
    // 这里只是示例代码，实际使用时根据需求调整
    const userInfo = AuthManager.getUserInfo();
    const token = AuthManager.getUserToken();
    
    if (userInfo && token) {
      console.log('用户已登录，无需重复登录');
      return;
    }
    
    /*
    // 可选的自动微信登录
    wx.login({
      success: res => {
        if (res.code) {
          console.log('微信登录code:', res.code);
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          api.userLogin({ code: res.code })
            .then(response => {
              console.log('微信登录成功:', response);
            })
            .catch(error => {
              console.log('微信登录失败:', error);
            });
        }
      }
    });
    */
  },
 
  /**
   * 获取应用版本信息
   */
  getAppVersion() {
    return {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      environment: __wxConfig.envVersion || 'develop'
    };
  },
 
  /**
   * 同步用户状态
   */
  syncUserStatus() {
    // 如果用户已登录，同步最新状态
    if (AuthManager.isUserLoggedIn()) {
      const userInfo = AuthManager.getUserInfo();
      if (userInfo && userInfo.id) {
        api.getUserProfile(userInfo.id)
          .then(response => {
            if (response.success && response.data) {
              // 更新本地用户信息
              if (response.data.userInfo) {
                AuthManager.saveUserInfo(response.data.userInfo, AuthManager.getUserToken());
              }
              
              // 更新认证状态
              if (response.data.authInfo) {
                AuthManager.setAuthStatus(response.data.authInfo.status, response.data.authInfo);
              }
            }
          })
          .catch(error => {
            console.log('同步用户状态失败:', error);
          });
      }
    }
  },
 
  /**
   * 获取国际化文本（全局方法）
   */
  t(key) {
    return this.globalData.i18n ? this.globalData.i18n.t(key) : key;
  },
 
  /**
   * 获取主题变量（全局方法）
   */
  getThemeVar(path) {
    return this.globalData.themeManager ? this.globalData.themeManager.getThemeVariable(path) : null;
  },
 
  /**
   * 切换语言（全局方法）
   */
  changeLanguage(languageCode, localeName) {
    if (this.globalData.i18n) {
      this.globalData.i18n.setLanguage(languageCode, localeName);
    }
  },
 
  /**
   * 切换主题（全局方法）
   */
  changeTheme(themeCode, themeName) {
    if (this.globalData.themeManager) {
      this.globalData.themeManager.setTheme(themeCode, themeName);
    }
  },
 
  /**
   * 全局数据
   */
  globalData: {
    userInfo: null,
    userProfile: null,
    networkType: 'unknown',
    systemInfo: null,
    i18n: null,              // i18n 管理器
    themeManager: null,      // 主题管理器
    appConfig: {
      baseURL: 'http://127.0.0.1:8000/api',
      uploadURL: 'http://127.0.0.1:8000/api/upload/',
      timeout: 10000
    }
  }
});