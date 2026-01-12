// frontend/utils/auth.js

/**
 * 认证信息管理工具
 * 统一管理用户的登录状态、实名认证状态和服务权限
 * 适配JWT令牌格式
 */
const AuthManager = {
  // 存储键名
  STORAGE_KEYS: {
    AUTH_INFO: 'authInfo',
    AUTH_STATUS: 'authStatus',
    USER_INFO: 'userInfo',
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    LOGIN_TOKEN: 'accessToken', // 兼容旧代码
    TOKEN_EXPIRE_TIME: 'tokenExpireTime'
  },
  
  // 令牌配置
  TOKEN_CONFIG: {
    // 提前刷新时间（提前5分钟刷新令牌）
    REFRESH_AHEAD_MINUTES: 5,
    // 默认访问令牌过期时间（30分钟，单位：毫秒）
    DEFAULT_ACCESS_EXPIRE: 30 * 60 * 1000,
    // 默认刷新令牌过期时间（7天，单位：毫秒）
    DEFAULT_REFRESH_EXPIRE: 7 * 24 * 60 * 60 * 1000
  },

  // 认证状态常量
  AUTH_STATUS: {
    NOT_STARTED: 'not_started',
    REVIEWING: 'reviewing', 
    SUCCESS: 'success',
    FAILED: 'failed'
  },

  // 申请状态常量
  APPLICATION_STATUS: {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // 私有变量 - 事件回调
  _permissionChangeCallback: null,

  /**
   * 保存用户登录信息（适配JWT格式）
   * @param {object} userData - 用户数据
   * @param {object} tokenData - 令牌数据 {access_token, refresh_token, expires_in}
   * @returns {boolean} - 是否保存成功
   */
  saveUserInfo: function(userData, tokenData) {
    try {
      // 统一处理头像字段：优先使用 avatar_url，其次使用 avatar 或 avatarUrl
      const normalizedInfo = {
        ...userData,
        avatar_url: userData.avatar_url || userData.avatar || userData.avatarUrl
      };
      
      // 清理可能存在的重复字段
      delete normalizedInfo.avatar;
      delete normalizedInfo.avatarUrl;
      
      const now = Date.now();
      const expiresIn = tokenData.expires_in || this.TOKEN_CONFIG.DEFAULT_ACCESS_EXPIRE / 1000;
      const expireTime = now + (expiresIn * 1000);
      
      // 用户信息带时间戳和令牌信息
      const userInfoWithTimestamp = {
        userInfo: normalizedInfo,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpireTime: expireTime,
        timestamp: now,
        // 兼容旧字段
        token: tokenData.access_token
      };
      
      // 分别存储
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, userInfoWithTimestamp);
      wx.setStorageSync(this.STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
      wx.setStorageSync(this.STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
      wx.setStorageSync(this.STORAGE_KEYS.TOKEN_EXPIRE_TIME, expireTime);
      
      console.log('用户登录信息保存成功（JWT格式）:', {
        userInfo: normalizedInfo,
        expireTime: new Date(expireTime).toLocaleString()
      });
      
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  },

  /**
   * 保存认证信息到本地存储
   * @param {object} authData - 认证信息
   * @returns {boolean} - 是否保存成功
   */
  saveAuthInfo: function(authData) {
    try {
      const authInfo = {
        realName: authData.realName,
        schoolName: authData.schoolName,
        studentId: authData.studentId,
        phone: authData.phone || '',
        studentCardImage: authData.studentCardImage || '',
        authTime: authData.authTime || new Date().toLocaleString(),
        updateTime: new Date().toLocaleString(),
        status: authData.status || this.AUTH_STATUS.SUCCESS
      };
      
      wx.setStorageSync(this.STORAGE_KEYS.AUTH_INFO, authInfo);
      wx.setStorageSync(this.STORAGE_KEYS.AUTH_STATUS, authInfo.status);
      
      console.log('认证信息保存成功:', authInfo);
      
      // 触发认证状态变更事件
      this.notifyAuthStatusChange(authInfo.status, authInfo);
      
      return true;
    } catch (error) {
      console.error('保存认证信息失败:', error);
      wx.showToast({
        title: '保存认证信息失败',
        icon: 'none'
      });
      return false;
    }
  },

  /**
   * 获取实名认证信息
   * @returns {object|null} - 认证信息对象或null
   */
  getAuthInfo: function() {
    try {
      const authInfo = wx.getStorageSync(this.STORAGE_KEYS.AUTH_INFO);
      return authInfo || null;
    } catch (error) {
      console.error('获取认证信息失败:', error);
      return null;
    }
  },

  /**
   * 检查是否已完成实名认证
   * @returns {boolean} - 是否已认证
   */
  isAuthenticated: function() {
    try {
      const authStatus = wx.getStorageSync(this.STORAGE_KEYS.AUTH_STATUS);
      return authStatus === this.AUTH_STATUS.SUCCESS;
    } catch (error) {
      console.error('检查认证状态失败:', error);
      return false;
    }
  },

  /**
   * 获取认证状态
   * @returns {string} - 认证状态
   */
  getAuthStatus: function() {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.AUTH_STATUS) || this.AUTH_STATUS.NOT_STARTED;
    } catch (error) {
      console.error('获取认证状态失败:', error);
      return this.AUTH_STATUS.NOT_STARTED;
    }
  },

  /**
   * 设置认证状态
   * @param {string} status - 认证状态
   * @param {object} authInfo - 认证信息（可选）
   */
  setAuthStatus: function(status, authInfo = null) {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.AUTH_STATUS, status);
      
      if (authInfo) {
        wx.setStorageSync(this.STORAGE_KEYS.AUTH_INFO, authInfo);
      }
      
      // 触发认证状态变更事件
      this.notifyAuthStatusChange(status, authInfo);
      
      return true;
    } catch (error) {
      console.error('设置认证状态失败:', error);
      return false;
    }
  },

  /**
   * 获取用户信息
   * @returns {object|null} - 用户信息
   */
  getUserInfo: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      
      if (!storedData) return null;
      
      // 解析存储的数据
      let parsedData;
      if (typeof storedData === 'string') {
        try {
          parsedData = JSON.parse(storedData);
        } catch (e) {
          // 如果是旧格式数据，直接返回
          return storedData;
        }
      } else {
        parsedData = storedData;
      }
      
      // 检查是否为带时间戳的新格式
      if (parsedData.userInfo) {
        // 检查缓存是否过期（7天）
        if (parsedData.timestamp && Date.now() - parsedData.timestamp > this.TOKEN_CONFIG.DEFAULT_REFRESH_EXPIRE) {
          console.log('用户信息缓存已过期（7天），自动清除');
          this.clearAllUserData();
          return null;
        }
        return parsedData.userInfo;
      }
      
      // 旧格式数据直接返回
      return parsedData;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  },

  /**
   * 获取访问令牌
   * @returns {string|null} - 访问令牌
   */
  getAccessToken: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (storedData && storedData.accessToken) {
        return storedData.accessToken;
      }
      // 兼容旧格式
      return wx.getStorageSync(this.STORAGE_KEYS.ACCESS_TOKEN) || null;
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      return null;
    }
  },

  /**
   * 获取刷新令牌
   * @returns {string|null} - 刷新令牌
   */
  getRefreshToken: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (storedData && storedData.refreshToken) {
        return storedData.refreshToken;
      }
      return wx.getStorageSync(this.STORAGE_KEYS.REFRESH_TOKEN) || null;
    } catch (error) {
      console.error('获取刷新令牌失败:', error);
      return null;
    }
  },

  /**
   * 获取令牌过期时间
   * @returns {number|null} - 过期时间戳
   */
  getTokenExpireTime: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (storedData && storedData.tokenExpireTime) {
        return storedData.tokenExpireTime;
      }
      return wx.getStorageSync(this.STORAGE_KEYS.TOKEN_EXPIRE_TIME) || null;
    } catch (error) {
      console.error('获取令牌过期时间失败:', error);
      return null;
    }
  },

  /**
   * 检查访问令牌是否过期
   * @returns {boolean} - 是否过期
   */
  isAccessTokenExpired: function() {
    const expireTime = this.getTokenExpireTime();
    if (!expireTime) return true;
    
    const now = Date.now();
    const refreshThreshold = this.TOKEN_CONFIG.REFRESH_AHEAD_MINUTES * 60 * 1000;
    
    return now >= (expireTime - refreshThreshold);
  },

  /**
   * 检查是否需要刷新令牌
   * @returns {boolean} - 是否需要刷新
   */
  shouldRefreshToken: function() {
    return this.isAccessTokenExpired();
  },

  /**
   * 检查用户是否已登录
   * @returns {boolean} - 是否已登录
   */
  isUserLoggedIn: function() {
    const accessToken = this.getAccessToken();
    const userInfo = this.getUserInfo();
    const isTokenValid = accessToken && !this.isAccessTokenExpired();
    return !!(isTokenValid && userInfo);
  },

  /**
   * 更新令牌信息
   * @param {object} tokenData - 新的令牌数据
   * @returns {boolean} - 是否更新成功
   */
  updateTokenInfo: function(tokenData) {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (!storedData) return false;
      
      const now = Date.now();
      const expiresIn = tokenData.expires_in || this.TOKEN_CONFIG.DEFAULT_ACCESS_EXPIRE / 1000;
      const expireTime = now + (expiresIn * 1000);
      
      const updatedData = {
        ...storedData,
        accessToken: tokenData.access_token || storedData.accessToken,
        refreshToken: tokenData.refresh_token || storedData.refreshToken,
        tokenExpireTime: expireTime,
        token: tokenData.access_token || storedData.token // 兼容旧字段
      };
      
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, updatedData);
      wx.setStorageSync(this.STORAGE_KEYS.ACCESS_TOKEN, updatedData.accessToken);
      wx.setStorageSync(this.STORAGE_KEYS.REFRESH_TOKEN, updatedData.refreshToken);
      wx.setStorageSync(this.STORAGE_KEYS.TOKEN_EXPIRE_TIME, expireTime);
      
      console.log('令牌信息更新成功:', {
        expireTime: new Date(expireTime).toLocaleString()
      });
      
      return true;
    } catch (error) {
      console.error('更新令牌信息失败:', error);
      return false;
    }
  },

  /**
   * 更新用户信息
   * @param {object} updatedData - 要更新的用户数据
   */
  updateUserInfo: function(updatedData) {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (!storedData) return false;
      
      // 统一处理头像字段
      const normalizedUpdate = {
        ...updatedData,
        avatar_url: updatedData.avatar_url || updatedData.avatar || updatedData.avatarUrl
      };
      
      // 清理可能存在的重复字段
      delete normalizedUpdate.avatar;
      delete normalizedUpdate.avatarUrl;
      
      // 更新用户信息，保留令牌信息
      const updatedUserInfo = storedData.userInfo ? 
        { ...storedData.userInfo, ...normalizedUpdate } : 
        normalizedUpdate;
      
      const newStoredData = {
        ...storedData,
        userInfo: updatedUserInfo,
        timestamp: storedData.timestamp || Date.now()
      };
      
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, newStoredData);
      console.log('用户信息更新成功:', updatedUserInfo);
      return true;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  },

  /**
   * 获取完整的用户档案信息（包含认证信息）
   * @returns {object} - 完整的用户档案
   */
  getUserProfile: function() {
    // 检查令牌是否过期
    const shouldRefresh = this.shouldRefreshToken();
    const isLoggedIn = this.isUserLoggedIn();
    
    if (shouldRefresh && isLoggedIn) {
      console.log('访问令牌即将过期，需要刷新');
    }
    
    const userInfo = this.getUserInfo();
    const authInfo = this.getAuthInfo();
    const isAuthenticated = this.isAuthenticated();
    const servicePermissions = this.getServicePermissions();
    const tokenExpireTime = this.getTokenExpireTime();
    
    return {
      isLoggedIn: isLoggedIn,
      isAuthenticated: isAuthenticated,
      authStatus: this.getAuthStatus(),
      userInfo: userInfo,
      authInfo: authInfo,
      tokenInfo: {
        accessToken: this.getAccessToken(),
        refreshToken: this.getRefreshToken(),
        expireTime: tokenExpireTime,
        shouldRefresh: shouldRefresh,
        expiresIn: tokenExpireTime ? Math.max(0, tokenExpireTime - Date.now()) : 0
      },
      hasCompleteProfile: isLoggedIn && isAuthenticated,
      servicePermissions: servicePermissions,
      cacheTimestamp: this.getCacheTimestamp()
    };
  },

  /**
   * 获取缓存时间戳
   * @returns {number|null} - 时间戳
   */
  getCacheTimestamp: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (!storedData) return null;
      
      return storedData.timestamp || null;
    } catch (error) {
      console.error('获取缓存时间戳失败:', error);
      return null;
    }
  },

  /**
   * 清除认证信息（用户重新认证时使用）
   */
  clearAuthInfo: function() {
    try {
      wx.removeStorageSync(this.STORAGE_KEYS.AUTH_INFO);
      wx.setStorageSync(this.STORAGE_KEYS.AUTH_STATUS, this.AUTH_STATUS.NOT_STARTED);
      console.log('认证信息已清除');
      
      // 触发认证状态变更事件
      this.notifyAuthStatusChange(this.AUTH_STATUS.NOT_STARTED, null);
      
      return true;
    } catch (error) {
      console.error('清除认证信息失败:', error);
      return false;
    }
  },

  /**
   * 清除所有用户数据（登出时使用）
   */
  clearAllUserData: function() {
    try {
      const keys = Object.values(this.STORAGE_KEYS);
      keys.forEach(key => {
        wx.removeStorageSync(key);
      });
      
      // 清除所有申请记录
      this.clearAllApplications();
      
      console.log('所有用户数据已清除');
      
      // 触发登出事件
      this.notifyLogout();
      
      return true;
    } catch (error) {
      console.error('清除用户数据失败:', error);
      return false;
    }
  },

  /**
   * 检查用户是否有权限访问特定功能
   * @param {string} permission - 权限名称
   * @returns {boolean} - 是否有权限
   */
  hasPermission: function(permission) {
    const profile = this.getUserProfile();
    
    switch (permission) {
      case 'substitute_class':
        return profile.isAuthenticated;
      case 'teacher_apply':
        return profile.isAuthenticated;
      case 'brusher_apply':
        return profile.isAuthenticated;
      case 'order_management':
        return profile.isLoggedIn;
      case 'service_access':
        return profile.servicePermissions.hasAnyService;
      default:
        return profile.isLoggedIn;
    }
  },

  /**
   * 检查用户是否有特定服务权限
   * @param {string} serviceType - 服务类型 (teacher, brusher)
   * @returns {boolean}
   */
  hasServicePermission: function(serviceType) {
    // 首先检查是否已认证
    if (!this.isAuthenticated()) {
      return false;
    }
    
    // 检查申请状态
    const applicationKey = `application_${serviceType}`;
    const application = wx.getStorageSync(applicationKey);
    
    return application && application.status === this.APPLICATION_STATUS.APPROVED;
  },

  /**
   * 获取用户服务权限状态
   * @returns {object}
   */
  getServicePermissions: function() {
    return {
      teacher: this.hasServicePermission('teacher'),
      brusher: this.hasServicePermission('brusher'),
      isAuthenticated: this.isAuthenticated(),
      hasAnyService: this.hasServicePermission('teacher') || this.hasServicePermission('brusher')
    };
  },

  /**
   * 获取特定服务的申请状态
   * @param {string} serviceType - 服务类型
   * @returns {object|null} 申请信息或null
   */
  getServiceApplicationStatus: function(serviceType) {
    const applicationKey = `application_${serviceType}`;
    return wx.getStorageSync(applicationKey) || null;
  },

  /**
   * 检查用户是否可以申请特定服务
   * @param {string} serviceType - 服务类型
   * @returns {object} 返回检查结果
   */
  canApplyService: function(serviceType) {
    const isAuthenticated = this.isAuthenticated();
    const hasPermission = this.hasServicePermission(serviceType);
    const existingApplication = this.getServiceApplicationStatus(serviceType);
    
    if (!isAuthenticated) {
      return {
        canApply: false,
        reason: 'need_auth',
        message: '需要先完成实名认证',
        action: 'goToAuth'
      };
    }
    
    if (hasPermission) {
      return {
        canApply: false,
        reason: 'already_approved',
        message: '您已获得该服务权限',
        action: 'goToService'
      };
    }
    
    if (existingApplication) {
      switch (existingApplication.status) {
        case this.APPLICATION_STATUS.REVIEWING:
          return {
            canApply: false,
            reason: 'under_review',
            message: '申请正在审核中，请耐心等待',
            action: 'wait'
          };
        case this.APPLICATION_STATUS.REJECTED:
          return {
            canApply: true,
            reason: 'can_reapply',
            message: '可以重新申请',
            action: 'reapply'
          };
        default:
          return {
            canApply: false,
            reason: 'unknown_status',
            message: '申请状态异常，请联系客服',
            action: 'contact_service'
          };
      }
    }
    
    return {
      canApply: true,
      reason: 'can_apply',
      message: '可以申请该服务',
      action: 'apply'
    };
  },

  /**
   * 更新服务申请状态
   * @param {string} serviceType - 服务类型
   * @param {object} updateData - 更新数据
   * @returns {boolean}
   */
  updateServiceApplication: function(serviceType, updateData) {
    try {
      const applicationKey = `application_${serviceType}`;
      const existingApplication = wx.getStorageSync(applicationKey);
      
      if (!existingApplication) {
        console.error('申请记录不存在');
        return false;
      }
      
      const updatedApplication = {
        ...existingApplication,
        ...updateData,
        updateTime: new Date().toLocaleString()
      };
      
      wx.setStorageSync(applicationKey, updatedApplication);
      console.log(`服务申请状态已更新:`, updatedApplication);
      
      // 触发权限变更事件
      this._notifyPermissionChange('application_updated', {
        serviceType,
        application: updatedApplication
      });
      
      return true;
    } catch (error) {
      console.error('更新申请状态失败:', error);
      return false;
    }
  },

  /**
   * 清除特定服务的申请记录
   * @param {string} serviceType - 服务类型
   * @returns {boolean}
   */
  clearServiceApplication: function(serviceType) {
    try {
      const applicationKey = `application_${serviceType}`;
      wx.removeStorageSync(applicationKey);
      console.log(`服务申请记录已清除: ${serviceType}`);
      
      // 触发权限变更事件
      this._notifyPermissionChange('application_cleared', {
        serviceType
      });
      
      return true;
    } catch (error) {
      console.error('清除申请记录失败:', error);
      return false;
    }
  },

  /**
   * 获取用户所有申请记录
   * @returns {object} 所有申请记录
   */
  getAllApplications: function() {
    try {
      return {
        teacher: wx.getStorageSync('application_teacher') || null,
        brusher: wx.getStorageSync('application_brusher') || null
      };
    } catch (error) {
      console.error('获取申请记录失败:', error);
      return {
        teacher: null,
        brusher: null
      };
    }
  },

  /**
   * 清除所有申请记录
   * @returns {boolean}
   */
  clearAllApplications: function() {
    try {
      const applications = ['teacher', 'brusher'];
      applications.forEach(serviceType => {
        const applicationKey = `application_${serviceType}`;
        wx.removeStorageSync(applicationKey);
      });
      console.log('所有申请记录已清除');
      return true;
    } catch (error) {
      console.error('清除申请记录失败:', error);
      return false;
    }
  },

  /**
   * 批量权限检查
   * @param {array} serviceTypes - 服务类型数组
   * @returns {object} 权限检查结果
   */
  batchCheckPermissions: function(serviceTypes) {
    const results = {};
    
    serviceTypes.forEach(serviceType => {
      results[serviceType] = {
        hasPermission: this.hasServicePermission(serviceType),
        canApply: this.canApplyService(serviceType),
        applicationStatus: this.getServiceApplicationStatus(serviceType)
      };
    });
    
    return results;
  },

  /**
   * 权限状态变更监听
   * @param {function} callback - 回调函数
   */
  onPermissionChange: function(callback) {
    if (typeof callback === 'function') {
      this._permissionChangeCallback = callback;
    }
  },

  /**
   * 触发认证状态变更事件
   * @private
   */
  notifyAuthStatusChange: function(status, authInfo) {
    // 触发权限变更事件
    this._notifyPermissionChange('auth_status_changed', {
      status,
      authInfo
    });
    
    // 页面间通信
    const eventChannel = this.getEventChannel();
    if (eventChannel) {
      eventChannel.emit('authStatusChanged', { status, authInfo });
    }
  },

  /**
   * 触发登出事件
   * @private
   */
  notifyLogout: function() {
    // 触发权限变更事件
    this._notifyPermissionChange('user_logout', {});
    
    // 页面间通信
    const eventChannel = this.getEventChannel();
    if (eventChannel) {
      eventChannel.emit('userLogout');
    }
  },

  /**
   * 触发权限变更事件
   * @private
   */
  _notifyPermissionChange: function(changeType, data) {
    if (this._permissionChangeCallback) {
      this._permissionChangeCallback({
        type: changeType,
        data: data,
        permissions: this.getServicePermissions(),
        profile: this.getUserProfile(),
        timestamp: new Date().getTime()
      });
    }
  },

  /**
   * 获取事件通道（用于页面间通信）
   * @private
   */
  getEventChannel: function() {
    try {
      // 获取当前页面的eventChannel
      const pages = getCurrentPages();
      if (pages.length > 0) {
        return pages[pages.length - 1].getOpenerEventChannel();
      }
    } catch (error) {
      console.log('无法获取事件通道:', error);
    }
    return null;
  },

  /**
   * 同步认证状态（从服务器获取最新状态）
   * @param {function} callback - 回调函数
   */
  syncAuthStatus: function(callback) {
    const api = require('./api.js');
    
    if (!this.isUserLoggedIn()) {
      callback && callback({ success: false, message: '用户未登录' });
      return;
    }
    
    const userInfo = this.getUserInfo();
    api.getUserProfile(userInfo.id)
      .then(response => {
        if (response.code === 200) {
          const serverAuthInfo = response.data.authInfo;
          if (serverAuthInfo) {
            this.setAuthStatus(serverAuthInfo.status, serverAuthInfo);
            callback && callback({ success: true, data: serverAuthInfo });
          } else {
            callback && callback({ success: true, data: null });
          }
        } else {
          callback && callback({ success: false, message: response.msg });
        }
      })
      .catch(error => {
        console.error('同步认证状态失败:', error);
        callback && callback({ success: false, message: '网络错误' });
      });
  },

  /**
   * 刷新访问令牌
   * @param {function} callback - 回调函数
   */
  refreshAccessToken: function(callback) {
    const api = require('./api.js');
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      callback && callback({ success: false, message: '刷新令牌不存在' });
      return;
    }
    
    api.refreshToken(refreshToken)
      .then(response => {
        if (response.code === 200) {
          // 更新令牌信息
          this.updateTokenInfo(response.data);
          callback && callback({ success: true, data: response.data });
        } else {
          console.error('刷新令牌失败:', response.msg);
          // 如果刷新失败，可能需要用户重新登录
          callback && callback({ success: false, message: response.msg });
        }
      })
      .catch(error => {
        console.error('刷新令牌请求失败:', error);
        callback && callback({ success: false, message: '网络错误' });
      });
  },

  /**
   * 自动检查并刷新令牌
   * @returns {Promise} - 刷新结果
   */
  checkAndRefreshTokenIfNeeded: function() {
    return new Promise((resolve, reject) => {
      if (!this.shouldRefreshToken()) {
        resolve({ success: true, refreshed: false, message: '令牌未过期' });
        return;
      }
      
      console.log('检测到令牌即将过期，自动刷新...');
      this.refreshAccessToken((result) => {
        if (result.success) {
          console.log('令牌刷新成功');
          resolve({ success: true, refreshed: true, data: result.data });
        } else {
          console.error('令牌刷新失败:', result.message);
          // 刷新失败但用户可能还有有效令牌
          if (this.isAccessTokenExpired()) {
            // 令牌已完全过期，需要重新登录
            this.clearAllUserData();
            reject({ success: false, message: '令牌已过期，请重新登录', needLogin: true });
          } else {
            resolve({ success: true, refreshed: false, message: '刷新失败但令牌仍有效' });
          }
        }
      });
    });
  },

  /**
   * 验证数据完整性
   * @returns {object} 验证结果
   */
  validateData: function() {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // 检查令牌信息
      const accessToken = this.getAccessToken();
      const refreshToken = this.getRefreshToken();
      const expireTime = this.getTokenExpireTime();
      
      if (!accessToken) {
        result.errors.push('访问令牌缺失');
        result.isValid = false;
      }
      
      if (!refreshToken) {
        result.warnings.push('刷新令牌缺失');
      }
      
      if (!expireTime) {
        result.warnings.push('令牌过期时间缺失');
      } else if (this.isAccessTokenExpired()) {
        result.warnings.push('访问令牌已过期或即将过期');
      }
      
      // 检查认证信息完整性
      const authInfo = this.getAuthInfo();
      if (authInfo && (!authInfo.realName || !authInfo.studentId)) {
        result.warnings.push('认证信息不完整');
      }
      
      // 检查用户信息完整性
      const userInfo = this.getUserInfo();
      if (userInfo && !userInfo.id) {
        result.warnings.push('用户信息缺少ID');
      }
      
      // 检查申请记录一致性
      const applications = this.getAllApplications();
      Object.keys(applications).forEach(serviceType => {
        const app = applications[serviceType];
        if (app && app.status === this.APPLICATION_STATUS.APPROVED) {
          if (!this.isAuthenticated()) {
            result.errors.push(`服务${serviceType}已批准但未实名认证`);
            result.isValid = false;
          }
        }
      });
      
    } catch (error) {
      result.errors.push('数据验证过程中发生错误');
      result.isValid = false;
    }
    
    return result;
  },

  /**
   * 修复数据不一致问题
   * @returns {object} 修复结果
   */
  repairData: function() {
    const validation = this.validateData();
    const repairResult = {
      repaired: [],
      failed: []
    };
    
    // 如果访问令牌已过期但刷新令牌存在，尝试刷新
    if (validation.warnings.some(w => w.includes('访问令牌已过期'))) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        console.log('尝试自动刷新过期令牌...');
        this.refreshAccessToken((result) => {
          if (result.success) {
            repairResult.repaired.push('已自动刷新访问令牌');
          } else {
            repairResult.failed.push('自动刷新令牌失败');
          }
        });
      }
    }
    
    // 修复认证状态不一致
    if (validation.errors.some(err => err.includes('已批准但未实名认证'))) {
      const applications = this.getAllApplications();
      Object.keys(applications).forEach(serviceType => {
        const app = applications[serviceType];
        if (app && app.status === this.APPLICATION_STATUS.APPROVED) {
          if (this.updateServiceApplication(serviceType, { 
            status: this.APPLICATION_STATUS.PENDING 
          })) {
            repairResult.repaired.push(`重置${serviceType}申请状态`);
          } else {
            repairResult.failed.push(`重置${serviceType}申请状态失败`);
          }
        }
      });
    }
    
    return repairResult;
  }
};

module.exports = AuthManager;