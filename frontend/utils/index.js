// pages/index/index.js

// 1. 导入 API 服务
import { getServiceList } from '../../api/index.js';

// 2. 导入页面路径配置
import { pagePaths } from '../../config/services.js';

// 3. 从 utils/index.js 导入通用工具函数
import { checkLogin, goToLogin, showError } from '../../utils/index.js';

// 4. (可选) 如果需要格式化日期，可以从 formatters.js 导入
// import { formatDate } from '../../utils/formatters.js';

Page({
  data: {
    banners: [
      { id: 1, text: '骑手招募中，月入5000+', bgClass: 'banner-1' },
      { id: 2, text: '代课服务25元/节', bgClass: 'banner-2' },
      { id: 3, text: '刷课服务3.5元/科', bgClass: 'banner-3' }
    ],
    services: []
  },

  /**
   * 页面加载时调用
   */
  onLoad: function (options) {
    this.fetchServices();
  },

  /**
   * 从 API 获取服务列表
   */
  fetchServices() {
    getServiceList()
      .then(services => {
        // 4. (示例) 如果需要对服务列表中的日期进行格式化
        // const formattedServices = services.map(service => {
        //   if (service.createTime) {
        //     service.createTime = formatDate(service.createTime);
        //   }
        //   return service;
        // });

        this.setData({
          services: services // 使用格式化后的数据或原始数据
        });
      })
      .catch(err => {
        console.error('获取服务列表失败:', err);
        // 使用通用工具显示错误
        showError('获取服务列表失败');
      });
  },

  // 联系客服
  contactCustomerService: function() {
    // 示例：检查用户是否登录
    if (!checkLogin()) {
      goToLogin();
      return;
    }

    wx.navigateTo({
      url: pagePaths.customerService
    });
  },

  // 点击服务项
  onServiceTap: function(e) {
    const service = e.currentTarget.dataset.service;
    
    if (service && service.pagePath) {
      wx.navigateTo({
        url: service.pagePath
      });
    } else {
      wx.showModal({
        title: service.name,
        content: `${service.description}\n\n价格: ${service.price}`,
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  }
})