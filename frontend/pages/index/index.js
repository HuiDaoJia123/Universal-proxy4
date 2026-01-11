// pages/index/index.js
Page({
  data: {
    // 通知栏文本
    noticeText: '',
    
    banners: [
      { id: 1, text: '骑手招募中，月入750+', bgClass: 'banner-1' },
      { id: 2, text: '悬赏任务发布中，价格合理', bgClass: 'banner-2' },
      { id: 3, text: '便民服务，快速响应', bgClass: 'banner-3' }
    ],
    services: [
      { 
        id: 1, 
        name: '代取快递', 
        iconPath: '/images/express-icon.png', 
        bgClass: 'bg-red',
        price: '2.5元/个',
        description: '代取快递服务，2.5元一个，特别重的包裹价格另算。'
      },
      { 
        id: 2, 
        name: '外卖代取', 
        iconPath: '/images/takeout-icon.png', 
        bgClass: 'bg-teal',
        price: '3元/个',
        description: '外卖代取服务，3元一个，快速送达。'
      },
      { 
        id: 3, 
        name: '超市代买', 
        iconPath: '/images/supermarket-icon.png', 
        bgClass: 'bg-blue',
        price: '按快递标准',
        description: '超市代买服务，收费标准按照代取快递标准计算。'
      },
      { 
        id: 4, 
        name: '悬赏任务', 
        iconPath: '/images/task-icon.png', 
        bgClass: 'bg-purple',
        price: '多种选择',
        description: '悬赏任务平台，包含代课、刷课等服务，价格合理，快速响应。'
      },
      { 
        id: 5, 
        name: '其他服务', 
        iconPath: '/images/zhidao-icon.png', 
        bgClass: 'bg-yellow',
        price: '多种套餐',
        description: '送水到寝，洗衣洗鞋,打印资料,代写,万能任务等多项服务。'
      }
    ]
  },
 
  onLoad: function (options) {
    this.loadNoticeContent();
  },
 
  onShow: function () {
    // 页面显示时的逻辑
  },
 
  // 加载通知内容（可从后端获取）
  loadNoticeContent: function() {
    // 通知内容列表，可以从后端API获取
    const noticeList = [
      '🔥 骑手招募中！月入750+，时间自由，悬赏任务等你来接！',
      '📢 新用户首单优惠，立减5元，悬赏任务发布免手续费！',
      '🎯 悬赏任务价格合理，代课25元/节，刷课3元/科',
      '⚡ 代取快递2.5元/个，外卖3元/个，超市代买按标准收费',
      '💰 其他服务：送水、洗衣、打印、代写等多项便民服务',
      '🏃‍♂️ 悬赏任务平台，快速响应，安全可靠'
    ];
    
    // 随机选择一个通知显示
    const randomIndex = Math.floor(Math.random() * noticeList.length);
    this.setData({
      noticeText: noticeList[randomIndex]
    });
 
    // 如果需要从后端获取通知内容，可以这样调用
    /*
    wx.request({
      url: 'https://your-api-endpoint/notices',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.content) {
          this.setData({
            noticeText: res.data.content
          });
        }
      },
      fail: (err) => {
        console.error('获取通知失败:', err);
        // 保持默认通知
      }
    });
    */
  },
 
  // 关闭通知栏
  onNoticeClose: function() {
    this.setData({
      noticeText: ''
    });
  },
 
  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service'
    });
  },
 
  // 点击服务项
  onServiceTap: function(e) {
    const service = e.currentTarget.dataset.service;
    
    if (service.name === '超市代买') {
      // 跳转到超市购物页面
      wx.navigateTo({
        url: '/pages/supermarket/supermarket'
      });
    } else if (service.name === '代取快递') {
      // 跳转到代取快递页面
      wx.navigateTo({
        url: '/pages/fetch-express/fetch-express'
      });
    } else if (service.name === '外卖代取') {
      // 跳转到外卖代取页面
      wx.navigateTo({
        url: '/pages/takeout-fetch/takeout-fetch'
      });
    } else if (service.name === '悬赏任务') {
      // 跳转到悬赏任务页面
      wx.navigateTo({
        url: '/pages/reward-task/reward-task'
      });
    } else if (service.name === '其他服务') {
      // 跳转到其他服务页面
      wx.navigateTo({
        url: '/pages/other-services/other-services'
      });
    } else {
      wx.showModal({
        title: service.name,
        content: service.description + '\n\n价格: ' + service.price,
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  }
})