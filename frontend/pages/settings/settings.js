// pages/settings/settings.js
const app = getApp();

Page({
  data: {
    // 实名认证状态
    realNameVerified: false,
    
    // 通知设置
    notifySettings: {
      order: true,
      system: true
    },
    
    // 隐私设置
    privacySettings: {
      profileProtect: true,
      location: true
    },
    
    // 通用设置（动态获取）
    language: '',
    theme: '',
    cacheSize: '0.0MB',
    
    // 页面标题文本（用于i18n）
    pageTitle: '设置',
    
    // i18n文本数据
    texts: {
      settings: {
        title: '设置',
        account: '账号与安全',
        notifications: '通知设置',
        privacy: '隐私设置',
        general: '通用设置',
        profile: '个人信息',
        security: '账号安全',
        verification: '实名认证',
        orderNotify: '订单通知',
        systemMessage: '系统消息',
        profileProtect: '个人信息保护',
        locationInfo: '位置信息',
        blacklist: '黑名单管理',
        clearCache: '清除缓存',
        multiLanguage: '多语言',
        theme: '主题设置',
        feedback: '意见反馈',
        about: '关于我们',
        logout: '退出登录'
      },
      auth: {
        verified: '已认证',
        unverified: '未认证',
        login: '登录',
        register: '注册'
      },
      common: {
        confirm: '确定',
        cancel: '取消',
        loading: '加载中...',
        success: '成功',
        error: '错误',
        back: '返回',
        save: '保存'
      },
      messages: {
        cacheCleared: '缓存清除成功',
        languageChanged: '语言已切换',
        themeChanged: '主题已切换',
        settingsSaved: '设置已保存'
      }
    },
    
    // 骑手自动接单设置
    riderSettings: {
      autoGrabEnabled: false,
      maxOrders: 20,
      selectedCategories: [],
      categories: [] // 可选的订单分类列表
    },
    
    // 接单统计
    grabStats: {
      totalGrabs: 0,
      incompleteCount: 0,
      canGrab: true
    }
  },

  // ==================== 生命周期函数 ====================
  onLoad: function (options) {
    // 延迟初始化，确保app已经完全加载
    setTimeout(() => {
      this.initSettings();
      // 加载设置数据
      this.loadSettings();
      // 计算缓存大小
      this.calculateCacheSize();
      // 更新页面文本
      this.updatePageTexts();
      // 加载骑手设置
      this.loadRiderSettings();
    }, 100);
  },

  onShow: function () {
    // 页面显示时重新加载设置
    this.loadSettings();
    this.updatePageTexts();
    this.loadRiderSettings();
  },

  // ==================== 初始化函数 ====================
  initSettings: function() {
    if (app && app.globalData) {
      const currentLanguage = app.globalData.i18n ? app.globalData.i18n.getCurrentLocale() : '简体中文';
      const currentTheme = app.globalData.themeManager ? app.globalData.themeManager.getCurrentThemeName() : '浅色模式';
      
      this.setData({
        language: currentLanguage,
        theme: currentTheme
      });
    }
  },

  // ==================== 文本更新函数 ====================
  updatePageTexts: function() {
    if (!app || !app.globalData || !app.globalData.i18n) {
      return;
    }

    const i18n = app.globalData.i18n;
    this.setData({
      pageTitle: i18n.t('settings.title'),
      texts: {
        settings: {
          title: i18n.t('settings.title'),
          account: i18n.t('settings.account'),
          notifications: i18n.t('settings.notifications'),
          privacy: i18n.t('settings.privacy'),
          general: i18n.t('settings.general'),
          profile: i18n.t('settings.profile'),
          security: i18n.t('settings.security'),
          verification: i18n.t('settings.verification'),
          orderNotify: i18n.t('settings.orderNotify'),
          systemMessage: i18n.t('settings.systemMessage'),
          profileProtect: i18n.t('settings.profileProtect'),
          locationInfo: i18n.t('settings.locationInfo'),
          blacklist: i18n.t('settings.blacklist'),
          clearCache: i18n.t('settings.clearCache'),
          multiLanguage: i18n.t('settings.multiLanguage'),
          theme: i18n.t('settings.theme'),
          feedback: i18n.t('settings.feedback'),
          about: i18n.t('settings.about'),
          logout: i18n.t('settings.logout')
        },
        auth: {
          verified: i18n.t('auth.verified'),
          unverified: i18n.t('auth.unverified'),
          login: i18n.t('auth.login'),
          register: i18n.t('auth.register')
        },
        common: {
          confirm: i18n.t('common.confirm'),
          cancel: i18n.t('common.cancel'),
          loading: i18n.t('common.loading'),
          success: i18n.t('common.success'),
          error: i18n.t('common.error'),
          back: i18n.t('common.back'),
          save: i18n.t('common.save')
        },
        messages: {
          cacheCleared: i18n.t('messages.cacheCleared'),
          languageChanged: i18n.t('messages.languageChanged'),
          themeChanged: i18n.t('messages.themeChanged'),
          settingsSaved: i18n.t('messages.settingsSaved')
        }
      }
    });

    // 更新页面标题
    wx.setNavigationBarTitle({
      title: i18n.t('settings.title')
    });
  },

  // ==================== 设置加载/保存函数 ====================
  loadSettings: function() {
    const settings = wx.getStorageSync('appSettings') || {};
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 使用新的管理器获取语言和主题，如果没有则使用存储的值作为备选
    const currentLanguage = (app && app.globalData && app.globalData.i18n) ? 
      app.globalData.i18n.getCurrentLocale() : settings.language || '简体中文';
    const currentTheme = (app && app.globalData && app.globalData.themeManager) ? 
      app.globalData.themeManager.getCurrentThemeName() : settings.theme || '浅色模式';
    
    this.setData({
      realNameVerified: userInfo.realNameVerified || false,
      notifySettings: settings.notifySettings || this.data.notifySettings,
      privacySettings: settings.privacySettings || this.data.privacySettings,
      language: currentLanguage,
      theme: currentTheme
    });
  },

  saveSettings: function() {
    const settings = {
      notifySettings: this.data.notifySettings,
      privacySettings: this.data.privacySettings,
      language: this.data.language,
      theme: this.data.theme
    };
    wx.setStorageSync('appSettings', settings);
  },

  // ==================== 缓存相关函数 ====================
  calculateCacheSize: function() {
    // 这里模拟计算缓存大小
    const cacheSize = (Math.random() * 10).toFixed(1);
    this.setData({
      cacheSize: cacheSize + 'MB'
    });
  },

  clearCache: function() {
    const i18n = app ? app.globalData?.i18n : null;
    
    wx.showModal({
      title: i18n ? i18n.t('settings.clearCache') : '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      confirmText: i18n ? i18n.t('common.confirm') : '确定',
      cancelText: i18n ? i18n.t('common.cancel') : '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: i18n ? i18n.t('common.loading') : '清除中...',
          });
          
          // 模拟清除缓存
          setTimeout(() => {
            wx.hideLoading();
            this.setData({
              cacheSize: '0.0MB'
            });
            wx.showToast({
              title: i18n ? i18n.t('messages.cacheCleared') : '清除成功',
              icon: 'success'
            });
          }, 1000);
        }
      }
    });
  },

  // ==================== 导航函数 ====================
  navigateToEditProfile: function() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    });
  },

  navigateToAccountSecurity: function() {
    wx.navigateTo({
      url: '/pages/account-security/account-security'
    });
  },

  navigateToRealName: function() {
    wx.navigateTo({
      url: '/pages/real-name-auth/real-name-auth'
    });
  },

  navigateToBlacklist: function() {
    wx.navigateTo({
      url: '/pages/blacklist-management/blacklist-management'
    });
  },

  navigateToFeedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  navigateToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // ==================== 设置开关函数 ====================
  toggleOrderNotify: function(e) {
    this.setData({
      'notifySettings.order': e.detail.value
    });
    this.saveSettings();
  },

  toggleSystemNotify: function(e) {
    this.setData({
      'notifySettings.system': e.detail.value
    });
    this.saveSettings();
  },

  toggleProfileProtect: function(e) {
    this.setData({
      'privacySettings.profileProtect': e.detail.value
    });
    this.saveSettings();
  },

  toggleLocation: function(e) {
    this.setData({
      'privacySettings.location': e.detail.value
    });
    this.saveSettings();
  },

  // ==================== 语言/主题切换函数 ====================
  changeLanguage: function() {
    if (!app || !app.globalData || !app.globalData.i18n) {
      console.error('i18n系统未初始化');
      return;
    }

    const i18n = app.globalData.i18n;
    const availableLanguages = i18n.getAvailableLanguages();
    
    wx.showActionSheet({
      itemList: availableLanguages,
      success: (res) => {
        const selectedLanguage = availableLanguages[res.tapIndex];
        const languageCode = i18n.getLanguageCode(selectedLanguage);
        
        // 设置新的语言
        i18n.setLanguage(languageCode, selectedLanguage);
        
        // 更新页面数据
        this.setData({
          language: selectedLanguage
        });
        
        // 更新页面文本
        this.updatePageTexts();
        
        wx.showToast({
          title: i18n.t('messages.languageChanged'),
          icon: 'success'
        });
      }
    });
  },

  changeTheme: function() {
    if (!app || !app.globalData || !app.globalData.themeManager) {
      console.error('主题系统未初始化');
      return;
    }

    const themeManager = app.globalData.themeManager;
    const availableThemes = themeManager.getAvailableThemes();
    
    wx.showActionSheet({
      itemList: availableThemes,
      success: (res) => {
        const selectedTheme = availableThemes[res.tapIndex];
        let themeCode = themeManager.getThemeCode(selectedTheme);
        
        // 处理自动模式
        if (themeCode === 'auto') {
          themeManager.setAutoTheme();
          // 获取实际应用的主题
          themeCode = themeManager.getCurrentThemeCode();
        } else {
          themeManager.setTheme(themeCode, selectedTheme);
        }
        
        // 更新页面数据
        this.setData({
          theme: selectedTheme
        });
        
        // 应用主题变化到页面
        this.applyThemeToPage();
        
        const i18n = app.globalData.i18n;
        wx.showToast({
          title: i18n ? i18n.t('messages.themeChanged') : '主题已切换',
          icon: 'success'
        });
      }
    });
  },

  applyThemeToPage: function() {
    if (!app || !app.globalData || !app.globalData.themeManager) {
      return;
    }

    const currentTheme = app.globalData.themeManager.getCurrentTheme();
    if (!currentTheme) return;
    
    // 这里可以添加页面级别的主题应用逻辑
    // 比如动态更新样式变量等
    console.log('应用主题到设置页面:', currentTheme.name);
  },

  // ==================== 骑手设置相关函数 ====================
  loadRiderSettings: function() {
    if (!app || !app.request) return;
    
    app.request('/api/rider/settings/', 'GET', {}, (res) => {
      if (res.code === 100) {
        this.setData({
          'riderSettings.autoGrabEnabled': res.data.auto_grab_enabled,
          'riderSettings.maxOrders': res.data.max_orders,
          'riderSettings.selectedCategories': res.data.categories
        });
      }
    });
    
    // 加载订单分类列表
    app.request('/api/order-categories/', 'GET', {}, (res) => {
      if (res.code === 100) {
        this.setData({
          'riderSettings.categories': res.data
        });
      }
    });
    
    // 加载接单统计
    this.loadGrabStats();
  },

  loadGrabStats: function() {
    if (!app || !app.request) return;
    
    app.request('/api/rider/stats/', 'GET', {}, (res) => {
      if (res.code === 100) {
        this.setData({
          grabStats: res.data
        });
      }
    });
  },

  toggleAutoGrab: function(e) {
    this.setData({
      'riderSettings.autoGrabEnabled': e.detail.value
    });
    this.saveRiderSettings();
  },

  onCategoryChange: function(e) {
    const values = e.detail.value;
    const selectedCategories = this.data.riderSettings.categories.filter((_, index) => values.includes(index.toString()));
    
    this.setData({
      'riderSettings.selectedCategories': selectedCategories
    });
    
    // 如果选择了多个分类，显示警告
    if (selectedCategories.length > 1) {
      wx.showModal({
        title: '提示',
        content: '您选择了多个订单分类，这可能会影响接单效率，确认继续吗？',
        confirmText: '确定',
        cancelText: '重新选择',
        success: (res) => {
          if (res.confirm) {
            this.saveRiderSettings();
          } else {
            // 取消，重置选择
            this.setData({
              'riderSettings.selectedCategories': this.data.riderSettings.selectedCategories.filter(c => c.id === selectedCategories[0].id)
            });
          }
        }
      });
    } else {
      this.saveRiderSettings();
    }
  },

  onMaxOrdersChange: function(e) {
    let value = parseInt(e.detail.value) || 1;
    // 限制范围1-20
    if (value < 1) value = 1;
    if (value > 20) value = 20;
    
    this.setData({
      'riderSettings.maxOrders': value
    });
    this.saveRiderSettings();
  },

  saveRiderSettings: function() {
    if (!app || !app.request) return;
    
    const categoryIds = this.data.riderSettings.selectedCategories.map(c => c.id);
    
    app.request('/api/rider/settings/', 'POST', {
      auto_grab_enabled: this.data.riderSettings.autoGrabEnabled,
      max_orders: this.data.riderSettings.maxOrders,
      categories: categoryIds
    }, (res) => {
      if (res.code === 100) {
        wx.showToast({
          title: '设置已保存',
          icon: 'success'
        });
        
        // 如果有警告，显示警告信息
        if (res.warning) {
          wx.showModal({
            title: '提示',
            content: res.warning,
            showCancel: false
          });
        }
      } else {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        });
      }
    });
  },

  triggerAutoGrab: function() {
    if (!app || !app.request) return;
    
    if (!this.data.grabStats.canGrab) {
      wx.showModal({
        title: '无法接单',
        content: '您1小时内已有20单未完成，请等待完成或1小时后再试',
        showCancel: false
      });
      return;
    }
    
    wx.showLoading({ title: '正在接单...' });
    
    app.request('/api/rider/auto-grab/', 'POST', {}, (res) => {
      wx.hideLoading();
      
      if (res.code === 100) {
        wx.showModal({
          title: '接单成功',
          content: `订单号: ${res.data.order_no}\n分类: ${res.data.category}\n金额: ¥${res.data.price}`,
          confirmText: '查看订单',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.navigateTo({
                url: `/pages/order-detail/order-detail?orderId=${res.data.order_id}`
              });
            }
          }
        });
        
        // 刷新统计
        this.loadGrabStats();
      } else {
        wx.showToast({
          title: res.msg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // ==================== 退出登录函数 ====================
  logout: function() {
    const i18n = app ? app.globalData?.i18n : null;
    
    wx.showModal({
      title: i18n ? i18n.t('common.confirm') : '确认退出',
      content: '确定要退出登录吗？',
      confirmText: i18n ? i18n.t('common.confirm') : '确定',
      cancelText: i18n ? i18n.t('common.cancel') : '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLoggedIn');
          
          wx.showToast({
            title: i18n ? i18n.t('auth.logout') : '已退出登录',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  }
});
