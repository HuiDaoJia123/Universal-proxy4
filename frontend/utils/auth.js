// frontend/utils/auth.js

/**
 * 认证信息管理工具
 * 统一管理用户的登录状态、实名认证状态和服务权限
 */
const AuthManager = {
  // 存储键名
  STORAGE_KEYS: {
    AUTH_INFO: 'authInfo',
    AUTH_STATUS: 'authStatus',
    USER_TOKEN: 'userToken',
    USER_INFO: 'userInfo',
    LOGIN_TOKEN: 'token' // 与api.js中的token保持一致
  },
  
  // 缓存过期时间（7天）
  CACHE_EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000,

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
   * 保存用户登录信息（带缓存时间戳）
   * @param {object} userData - 用户数据
   * @param {string} token - 登录令牌
   */
  saveUserInfo: function(userData, token) {
    try {
      // 统一处理头像字段：优先使用 avatar_url，其次使用 avatar 或 avatarUrl
      const normalizedInfo = {
        ...userData,
        avatar_url: userData.avatar_url || userData.avatar || userData.avatarUrl
      };
      
      // 清理可能存在的重复字段
      delete normalizedInfo.avatar;
      delete normalizedInfo.avatarUrl;
      
      // 用户信息带时间戳
      const userInfoWithTimestamp = {
        userInfo: normalizedInfo,
        token: token,
        timestamp: Date.now()
      };
      
      // 分别存储以便兼容旧代码
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, userInfoWithTimestamp);
      wx.setStorageSync(this.STORAGE_KEYS.USER_TOKEN, token);
      wx.setStorageSync(this.STORAGE_KEYS.LOGIN_TOKEN, token); // 保持与api.js一致
      
      console.log('用户登录信息保存成功（已统一头像字段）:', normalizedInfo);
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  },

  /**
   * 获取用户信息（检查缓存过期）
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
      if (parsedData.timestamp) {
        // 检查缓存是否过期
        if (Date.now() - parsedData.timestamp > this.CACHE_EXPIRE_TIME) {
          console.log('用户信息缓存已过期，自动清除');
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
   * 获取用户token
   * @returns {string|null} - 用户token
   */
  getUserToken: function() {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.USER_TOKEN) || 
             wx.getStorageSync(this.STORAGE_KEYS.LOGIN_TOKEN) || null;
    } catch (error) {
      console.error('获取用户token失败:', error);
      return null;
    }
  },

  /**
   * 检查用户是否已登录
   * @returns {boolean} - 是否已登录
   */
  isUserLoggedIn: function() {
    const token = this.getUserToken();
    const userInfo = this.getUserInfo();
    return !!(token && userInfo);
  },

  /**
   * 更新用户信息
   * @param {object} updatedData - 要更新的用户数据
   */
  updateUserInfo: function(updatedData) {
    try {
      const userInfo = this.getUserInfo();
      if (userInfo) {
        // 统一处理头像字段
        const normalizedUpdate = {
          ...updatedData,
          avatar_url: updatedData.avatar_url || updatedData.avatar || updatedData.avatarUrl
        };
        
        // 清理可能存在的重复字段
        delete normalizedUpdate.avatar;
        delete normalizedUpdate.avatarUrl;
        
        // 获取完整的存储数据（包含时间戳）
        const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
        let parsedData;
        
        if (typeof storedData === 'string') {
          parsedData = JSON.parse(storedData);
        } else {
          parsedData = storedData;
        }
        
        // 更新用户信息并保留时间戳
        const newUserInfo = { ...userInfo, ...normalizedUpdate };
        const newStoredData = {
          userInfo: newUserInfo,
          token: parsedData.token || this.getUserToken(),
          timestamp: parsedData.timestamp || Date.now()
        };
        
        wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, newStoredData);
        console.log('用户信息更新成功（已统一头像字段）:', newUserInfo);
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  },

  /**
   * 刷新用户信息缓存时间
   * @returns {boolean} - 是否刷新成功
   */
  refreshUserCache: function() {
    try {
      const userInfo = this.getUserInfo();
      const token = this.getUserToken();
      
      if (userInfo && token) {
        return this.saveUserInfo(userInfo, token);
      }
      return false;
    } catch (error) {
      console.error('刷新用户缓存失败:', error);
      return false;
    }
  },

  /**
   * 检查缓存是否过期
   * @returns {boolean} - 是否过期
   */
  isCacheExpired: function() {
    try {
      const storedData = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO);
      if (!storedData) return true;
      
      let parsedData;
      if (typeof storedData === 'string') {
        parsedData = JSON.parse(storedData);
      } else {
        parsedData = storedData;
      }
      
      if (parsedData.timestamp) {
        return Date.now() - parsedData.timestamp > this.CACHE_EXPIRE_TIME;
      }
      
      // 旧格式数据视为未过期
      return false;
    } catch (error) {
      console.error('检查缓存过期失败:', error);
      return true;
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
   * 获取完整的用户档案信息（包含认证信息）
   * @returns {object} - 完整的用户档案
   */
  getUserProfile: function() {
    // 先检查缓存是否过期
    if (this.isCacheExpired()) {
      console.log('用户缓存已过期，清除数据');
      this.clearAllUserData();
      return {
        isLoggedIn: false,
        isAuthenticated: false,
        authStatus: this.AUTH_STATUS.NOT_STARTED,
        userInfo: null,
        authInfo: null,
        hasCompleteProfile: false,
        servicePermissions: this.getServicePermissions()
      };
    }
    
    const userInfo = this.getUserInfo();
    const authInfo = this.getAuthInfo();
    const isAuthenticated = this.isAuthenticated();
    const isLoggedIn = this.isUserLoggedIn();
    const servicePermissions = this.getServicePermissions();
    
    return {
      isLoggedIn: isLoggedIn,
      isAuthenticated: isAuthenticated,
      authStatus: this.getAuthStatus(),
      userInfo: userInfo,
      authInfo: authInfo,
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
      
      let parsedData;
      if (typeof storedData === 'string') {
        parsedData = JSON.parse(storedData);
      } else {
        parsedData = storedData;
      }
      
      return parsedData.timestamp || null;
    } catch (error) {
      console.error('获取缓存时间戳失败:', error);
      return null;
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
      // 检查缓存是否过期
      if (this.isCacheExpired()) {
        result.warnings.push('用户缓存已过期');
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
    
    // 如果缓存过期，清除所有数据
    if (validation.warnings.includes('用户缓存已过期')) {
      this.clearAllUserData();
      repairResult.repaired.push('已清除过期缓存数据');
      return repairResult;
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