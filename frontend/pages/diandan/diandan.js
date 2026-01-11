// pages/diandan/diandan.js
Page({
  data: {
    currentTab: 'my',
    currentFilter: 'all',
    currentSort: 'time',
    searchDate: '',
    
    // 订单数据
    myOrders: [],
    schoolOrders: [],
    acceptedOrders: [],
    
    // 过滤后的订单
    filteredMyOrders: [],
    filteredSchoolOrders: [],
    filteredAcceptedOrders: [],
    
    // 服务类型筛选选项
    serviceFilters: [
      { value: 'all', name: '全部' },
      { value: 'express', name: '快递' },
      { value: 'takeout', name: '外卖' },
      { value: 'supermarket', name: '超市' },
      { value: 'substitute', name: '代课' },
      { value: 'courseBrush', name: '刷课' },
      { value: 'other', name: '其他' },
      { value: 'other', name: '>ᴗoಣ' }
    ],
    
    // 计时器
    countdownTimer: null
  },

  onLoad: function (options) {
    // 设置默认搜索日期为今天
    const today = this.getTodayDate();
    this.setData({
      searchDate: today
    });
    
    // 初始化订单数据
    this.loadOrdersFromStorage();
    // 启动倒计时
    this.startCountdown();
  },

  onShow: function () {
    // 每次页面显示时重新加载订单列表
    this.loadOrdersFromStorage();
  },

  onUnload: function () {
    // 清除计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  // 获取今天日期
  getTodayDate: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 从本地存储加载所有订单
  loadOrdersFromStorage: function() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUserId = userInfo.id;
    
    if (!currentUserId) {
      console.log('用户未登录，无法加载订单');
      return;
    }

    // 从各服务加载订单
    const expressOrders = wx.getStorageSync('expressOrders') || [];
    const takeoutOrders = wx.getStorageSync('takeoutOrders') || [];
    const supermarketOrders = wx.getStorageSync('supermarketOrders') || [];
    const substituteOrders = wx.getStorageSync('substituteOrders') || [];
    const brushOrders = wx.getStorageSync('brushOrders') || [];
    const otherOrders = wx.getStorageSync('otherOrders') || [];
    
    // 合并所有订单，确保每个订单都有必要字段
    const allOrders = [
      ...expressOrders,
      ...takeoutOrders,
      ...supermarketOrders,
      ...substituteOrders,
      ...brushOrders,
      ...otherOrders
    ].map(order => {
      // 确保每个订单都有必要的基础字段
      return {
        id: order.id || Date.now() + Math.random(),
        orderNo: order.orderNo || `DD${Date.now()}`,
        serviceName: order.serviceName || '未知服务',
        serviceType: order.serviceType || 'other',
        createTime: order.createTime || new Date().toLocaleString(),
        price: order.price || 0,
        status: order.status || 'pending',
        payStatus: order.payStatus || 'paid',
        publisherId: order.publisherId || currentUserId,
        acceptorId: order.acceptorId || null,
        countdown: order.countdown || 600,
        acceptDeadline: order.acceptDeadline || new Date(Date.now() + 10 * 60 * 1000).toLocaleString(),
        // 保留原有字段
        ...order
      };
    });

    // 分类订单
    const myOrders = allOrders.filter(order => order.publisherId === currentUserId);
    const schoolOrders = allOrders.filter(order => 
      order.status === 'pending' && order.publisherId !== currentUserId
    );
    const acceptedOrders = allOrders.filter(order => 
      order.acceptorId === currentUserId
    );

    this.setData({
      myOrders: myOrders,
      schoolOrders: schoolOrders,
      acceptedOrders: acceptedOrders
    });

    // 过滤订单
    this.filterOrders();
  },

  // 切换订单类型标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab,
      currentFilter: 'all' // 切换标签时重置筛选
    });
    this.filterOrders();
  },

  // 切换服务类型筛选
  changeFilter: function(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      currentFilter: filter
    });
    this.filterOrders();
  },

  // 切换排序方式
  changeSort: function(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({
      currentSort: sort
    });
    this.filterOrders();
  },

  // 日期搜索输入
  onDateInput: function(e) {
    this.setData({
      searchDate: e.detail.value
    });
    this.filterOrders();
  },

  // 搜索当天订单
  searchTodayOrders: function() {
    this.setData({
      searchDate: this.getTodayDate()
    });
    this.filterOrders();
  },

  // 过滤和排序订单
  filterOrders: function() {
    const { currentTab, currentFilter, currentSort, searchDate, myOrders, schoolOrders, acceptedOrders } = this.data;
    
    // 过滤我的订单
    let filteredMyOrders = myOrders;
    if (currentTab === 'my' && currentFilter !== 'all') {
      filteredMyOrders = myOrders.filter(order => order.status === currentFilter);
    }
    
    // 过滤学校订单
    let filteredSchoolOrders = schoolOrders;
    if (currentTab === 'school') {
      // 服务类型筛选
      if (currentFilter !== 'all') {
        filteredSchoolOrders = schoolOrders.filter(order => order.serviceType === currentFilter);
      }
      
      // 按日期筛选
      if (searchDate) {
        filteredSchoolOrders = filteredSchoolOrders.filter(order => {
          const orderDate = order.createTime.split(' ')[0];
          return orderDate === searchDate;
        });
      }
      
      // 排序
      filteredSchoolOrders = this.sortOrders(filteredSchoolOrders, currentSort);
    }
    
    // 过滤接单订单
    let filteredAcceptedOrders = acceptedOrders;
    if (currentTab === 'accepted' && currentFilter !== 'all') {
      filteredAcceptedOrders = acceptedOrders.filter(order => order.status === currentFilter);
    }
    
    this.setData({
      filteredMyOrders: filteredMyOrders,
      filteredSchoolOrders: filteredSchoolOrders,
      filteredAcceptedOrders: filteredAcceptedOrders
    });
  },

  // 排序订单
  sortOrders: function(orders, sortType) {
    return orders.sort((a, b) => {
      if (sortType === 'time') {
        // 按创建时间倒序（最新的在前）
        return new Date(b.createTime) - new Date(a.createTime);
      } else if (sortType === 'price') {
        // 按价格倒序（价格高的在前）
        return b.price - a.price;
      }
      return 0;
    });
  },

  // 启动倒计时
  startCountdown: function() {
    const that = this;
    this.data.countdownTimer = setInterval(() => {
      that.updateCountdowns();
    }, 1000);
  },

  // 更新所有订单的倒计时
  updateCountdowns: function() {
    const updatedMyOrders = this.data.myOrders.map(order => {
      if (order.countdown > 0 && (order.status === 'pending' || order.status === 'accepted')) {
        return {
          ...order,
          countdown: order.countdown - 1
        };
      }
      return order;
    });
    
    // 更新学校订单倒计时
    const updatedSchoolOrders = this.data.schoolOrders.map(order => {
      if (order.countdown > 0 && order.status === 'pending') {
        const newCountdown = order.countdown - 1;
        // 如果倒计时结束，标记订单为过期
        if (newCountdown <= 0) {
          return {
            ...order,
            countdown: 0,
            status: 'expired'
          };
        }
        return {
          ...order,
          countdown: newCountdown
        };
      }
      return order;
    });
    
    // 更新接单订单倒计时
    const updatedAcceptedOrders = this.data.acceptedOrders.map(order => {
      if (order.countdown > 0 && (order.status === 'accepted' || order.status === 'in_progress')) {
        return {
          ...order,
          countdown: order.countdown - 1
        };
      }
      return order;
    });
    
    this.setData({
      myOrders: updatedMyOrders,
      schoolOrders: updatedSchoolOrders,
      acceptedOrders: updatedAcceptedOrders
    });
    
    // 重新过滤订单
    this.filterOrders();
  },

  // 获取状态文本
  getStatusText: function(status) {
    const statusTexts = {
      'pending': '待接单',
      'accepted': '已接单',
      'in_progress': '进行中',
      'completed': '已完成',
      'canceled': '已取消',
      'expired': '已过期'
    };
    return statusTexts[status] || '未知';
  },

  // 获取支付状态文本
  getPayStatusText: function(payStatus) {
    const payStatusTexts = {
      'paid': '已支付',
      'unpaid': '未支付',
      'refunded': '已退款'
    };
    return payStatusTexts[payStatus] || '未知';
  },

  // 格式化倒计时显示
  formatCountdown: function(seconds) {
    if (seconds <= 0) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // 抢单
  grabOrder: function(e) {
    const order = e.currentTarget.dataset.order;
    const that = this;

    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/my/my'
            });
          }
        }
      });
      return;
    }

    // 模拟抢单确认
    wx.showModal({
      title: '确认接单',
      content: `确定要接取这个${order.serviceName}订单吗？接单后需要在规定时间内完成。`,
      success: (res) => {
        if (res.confirm) {
          // 更新订单状态
          this.updateOrderStatus(order.id, {
            status: 'accepted',
            acceptorId: userInfo.id,
            acceptorName: userInfo.username || userInfo.name || '接单者',
            countdown: 1800 // 30分钟处理时间
          });
          
          wx.showToast({
            title: '接单成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 更新订单状态的通用方法
  updateOrderStatus: function(orderId, updates) {
    // 更新所有相关存储的订单状态
    const storageKeys = ['expressOrders', 'takeoutOrders', 'supermarketOrders', 'substituteOrders', 'brushOrders', 'otherOrders'];
    
    storageKeys.forEach(key => {
      const orders = wx.getStorageSync(key) || [];
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, ...updates };
        }
        return order;
      });
      wx.setStorageSync(key, updatedOrders);
    });
    
    // 重新加载订单
    this.loadOrdersFromStorage();
  },

  // 取消订单
  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？取消后款项将原路退回。',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, {
            status: 'canceled',
            payStatus: 'refunded'
          });
          
          wx.showToast({
            title: '订单已取消',
            icon: 'success'
          });
        }
      }
    });
  },

  // 开始处理订单
  startProgress: function(e) {
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.acceptedOrders.find(item => item.id === orderId);
    
    let countdown = 7200; // 默认2小时
    if (order.serviceType === 'courseBrush') {
      countdown = 86400; // 刷课1天
    } else if (order.serviceType === 'substitute') {
      countdown = 5400; // 代课90分钟
    }
    
    this.updateOrderStatus(orderId, {
      status: 'in_progress',
      countdown: countdown
    });
    
    wx.showToast({
      title: '开始处理订单',
      icon: 'success'
    });
  },

  // 确认完成
  confirmComplete: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, {
            status: 'completed',
            countdown: 0
          });
          
          wx.showToast({
            title: '订单已完成',
            icon: 'success'
          });
        }
      }
    });
  },

  // 开始聊天
  startChat: function(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order-chat/order-chat?orderId=${order.id}&serviceProviderId=${order.acceptorId || ''}&serviceProvider=${order.acceptorName || '客服'}`
    });
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const order = e.currentTarget.dataset.order;
    
    let content = `订单号: ${order.orderNo}\n服务类型: ${order.serviceName}\n价格: ¥${order.price}\n`;
    
    // 根据不同服务类型显示不同信息
    if (order.serviceType === 'courseBrush') {
      content += `刷课平台: ${order.platform || '未指定'}\n`;
      content += `科目名称: ${order.courseName || '未指定'}\n`;
      content += `学校: ${order.school || '未指定'}\n`;
      content += `学号: ${order.studentId || '未指定'}\n`;
      if (order.requirements) {
        content += `特殊要求: ${order.requirements}\n`;
      }
    } else if (order.serviceType === 'express') {
      content += `取件地址: ${order.pickupAddress || '未指定'}\n`;
      content += `快递公司: ${order.expressCompany || '未指定'}\n`;
      content += `送达地址: ${order.deliveryAddress || '未指定'}\n`;
    } else if (order.serviceType === 'takeout') {
      content += `取餐地址: ${order.takeoutLocation || '未指定'}\n`;
      content += `店铺名称: ${order.shopName || '未指定'}\n`;
      content += `送达地址: ${order.deliveryAddress || '未指定'}\n`;
    } else if (order.serviceType === 'supermarket') {
      content += `商品数量: ${order.goodsList ? order.goodsList.length : 0}件\n`;
      if (order.remark) {
        content += `备注: ${order.remark}\n`;
      }
    } else if (order.serviceType === 'substitute') {
      content += `上课地点: ${order.building || '未指定'} ${order.classroom || '未指定'}\n`;
      content += `科目: ${order.subject || '未指定'}\n`;
    } else if (order.serviceType === 'other') {
      content += `服务要求: ${order.requirements || '未指定'}\n`;
      content += `送达地址: ${order.address || '未指定'}\n`;
    }
    
    content += `创建时间: ${order.createTime}\n`;
    content += `状态: ${this.getStatusText(order.status)}`;
    
    wx.showModal({
      title: '订单详情',
      content: content,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 评价订单
  rateOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '跳转到评价页面',
      icon: 'none'
    });
    // 这里可以跳转到评价页面
    // wx.navigateTo({
    //   url: `/pages/rating/rating?orderId=${orderId}`
    // });
  },

  // 再次下单
  orderAgain: function(e) {
    const order = e.currentTarget.dataset.order;
    
    // 根据服务类型跳转到对应的下单页面
    const servicePages = {
      'courseBrush': '/pages/course-brush/course-brush',
      'express': '/pages/fetch-express/fetch-express',
      'takeout': '/pages/takeout-fetch/takeout-fetch',
      'supermarket': '/pages/supermarket/supermarket',
      'substitute': '/pages/substitute-class/substitute-class',
      'other': '/pages/other-services/other-services'
    };
    
    const targetPage = servicePages[order.serviceType];
    if (targetPage) {
      wx.navigateTo({
        url: targetPage
      });
    } else {
      wx.showToast({
        title: '再次下单',
        icon: 'none'
      });
    }
  },

  // 去下单
  goToIndex: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
})