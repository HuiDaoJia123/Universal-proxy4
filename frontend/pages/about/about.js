// pages/about/about.js
Page({
  data: {
    // 公司信息
    companyInfo: {
      introduction: '我们是一家专注于提供高品质生活服务的科技公司，致力于通过技术创新改善人们的生活品质。自2025年成立以来，我们始终坚持以用户为中心，提供安全、便捷、可靠的服务体验。',
      stats: {
        users: '500万',
        services: '1000万',
        cities: '200'
      },
      copyright: '© *********公司 版权所有'
    },
    
    // 优势列表
    advantages: [
      {
        id: 1,
        icon: '/assets/icons/quality.png',
        title: '品质保证',
        description: '严格筛选服务人员，确保服务质量'
      },
      {
        id: 2,
        icon: '/assets/icons/safety.png',
        title: '安全保障',
        description: '全流程保障用户信息安全'
      },
      {
        id: 3,
        icon: '/assets/icons/speed.png',
        title: '快速响应',
        description: '24小时客服，快速解决问题'
      },
      {
        id: 4,
        icon: '/assets/icons/price.png',
        title: '价格透明',
        description: '明码标价，无隐藏收费'
      }
    ],
    
    // 版本信息
    versionInfo: {
      appName: '生活服务',
      version: '1.0',
      releaseDate: '2024-05-20',
      size: '45.2 MB',
      features: [
        '基础服务功能完善',
        '用户界面简洁易用',
        '订单管理系统稳定',
        '支付流程安全可靠'
      ]
    },
    
    // 联系信息
    contactInfo: {
      phone: '400-123-4567'
    },
    
    // 更新信息
    updateInfo: {
      hasUpdate: false,
      version: '1.1.0',
      size: '48.5 MB',
      features: [
        '新增会员专享服务',
        '优化搜索算法',
        '提升应用启动速度',
        '修复若干已知问题'
      ]
    },
    
    // 弹窗状态
    showUpdateModal: false
  },

  onLoad: function(options) {
    // 页面加载时的初始化
    this.checkAppVersion();
  },

  // 检查应用版本
  checkAppVersion: function() {
    // 这里可以调用API检查是否有新版本
    // 模拟检查结果
    const hasUpdate = false; // 设置为true测试更新弹窗
    
    if (hasUpdate) {
      this.setData({
        'updateInfo.hasUpdate': true,
        showUpdateModal: true
      });
    }
  },

  // 检查更新
  checkForUpdate: function() {
    wx.showLoading({
      title: '检查中...',
    });
    
    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        showUpdateModal: true
      });
    }, 1500);
  },

  // 开始更新
  startUpdate: function() {
    wx.showLoading({
      title: '下载更新...',
    });
    
    // 模拟下载过程
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '更新完成',
        icon: 'success'
      });
      this.hideUpdateModal();
    }, 2000);
  },

  // 隐藏更新弹窗
  hideUpdateModal: function() {
    this.setData({
      showUpdateModal: false
    });
  },

  // 拨打电话
  makePhoneCall: function() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactInfo.phone
    });
  },

  // 查看用户协议
  viewUserAgreement: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/user-agreement'
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/privacy-policy'
    });
  },

  // 查看免责声明
  viewDisclaimer: function() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=https://example.com/disclaimer'
    });
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  }
});