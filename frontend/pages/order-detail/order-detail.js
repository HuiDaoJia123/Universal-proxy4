// pages/order-detail/order-detail.js
Page({
  data: {
    order: null,
    orderStatus: {
      'pending': { text: '待接单', color: '#FF6B6B', bgColor: 'rgba(255, 107, 107, 0.1)' },
      'accepted': { text: '已接单', color: '#1E90FF', bgColor: 'rgba(30, 144, 255, 0.1)' },
      'in_progress': { text: '进行中', color: '#FFA07A', bgColor: 'rgba(255, 160, 122, 0.1)' },
      'completed': { text: '已完成', color: '#4ECDC4', bgColor: 'rgba(78, 205, 196, 0.1)' },
      'canceled': { text: '已取消', color: '#999', bgColor: 'rgba(153, 153, 153, 0.1)' },
      'expired': { text: '已过期', color: '#999', bgColor: 'rgba(153, 153, 153, 0.1)' }
    },
    payStatus: {
      'paid': { text: '已支付', color: '#4ECDC4' },
      'unpaid': { text: '未支付', color: '#FF6B6B' },
      'refunded': { text: '已退款', color: '#999' }
    },
    timeline: [],
    showCancelDialog: false,
    showRatingDialog: false,
    ratingData: {
      score: 5,
      content: '',
      tags: []
    },
    ratingTags: [
      '服务态度好', '准时高效', '价格合理', '沟通顺畅', '专业可靠',
      '超出预期', '很有耐心', '值得推荐', '下次还来'
    ]
  },

  onLoad: function (options) {
    const { orderId, serviceType } = options;
    console.log('订单详情页面加载:', { orderId, serviceType });
    
    if (orderId) {
      this.loadOrderDetail(orderId, serviceType);
    } else {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载订单详情
  loadOrderDetail: function(orderId, serviceType) {
    const orderIdNum = parseInt(orderId);
    
    // 根据服务类型从对应的存储中查找订单
    const storageKeys = ['expressOrders', 'takeoutOrders', 'supermarketOrders', 
                        'substituteOrders', 'brushOrders', 'otherOrders'];
    
    let foundOrder = null;
    
    for (let key of storageKeys) {
      const orders = wx.getStorageSync(key) || [];
      const order = orders.find(item => item.id === orderIdNum);
      if (order) {
        foundOrder = order;
        break;
      }
    }
    
    if (foundOrder) {
      this.processOrderData(foundOrder);
    } else {
      // 如果没找到，使用模拟数据
      this.loadMockOrderDetail(orderIdNum, serviceType);
    }
  },

  // 处理订单数据
  processOrderData: function(order) {
    // 生成时间线
    const timeline = this.generateTimeline(order);
    
    this.setData({
      order: order,
      timeline: timeline
    });
    
    console.log('订单详情加载成功:', order);
  },

  // 加载模拟订单详情
  loadMockOrderDetail: function(orderId, serviceType) {
    const mockOrders = {
      'express': {
        id: orderId,
        orderNo: 'DD' + orderId,
        serviceName: '代取快递',
        serviceType: 'express',
        createTime: '2023-05-20 10:30:25',
        price: 5.00,
        status: 'completed',
        payStatus: 'paid',
        publisherId: 'user_001',
        publisherName: '张三',
        acceptorId: 'rider_001',
        acceptorName: '李四骑手',
        // 快递特有信息
        pickupAddress: '南门菜鸟驿站',
        pickupCode: 'A12345',
        expressCompany: '顺丰快递',
        deliveryAddress: '3号楼201室',
        phone: '13800138000',
        weight: 'small',
        specialNote: '请小心轻放，里面有易碎品',
        deliveryTime: '尽快送达',
        countdown: 0,
        acceptDeadline: '2023-05-20 10:40:25',
        completedTime: '2023-05-20 11:15:30'
      },
      'takeout': {
        id: orderId,
        orderNo: 'WM' + orderId,
        serviceName: '外卖代取',
        serviceType: 'takeout',
        createTime: '2023-05-20 12:15:20',
        price: 3.00,
        status: 'in_progress',
        payStatus: 'paid',
        publisherId: 'user_002',
        publisherName: '李同学',
        acceptorId: 'rider_002',
        acceptorName: '王骑手',
        // 外卖特有信息
        takeoutLocation: '北门外卖点',
        shopName: '麦当劳',
        pickupCode: 'B67890',
        deliveryAddress: '5号楼302室',
        phone: '13800138001',
        takeoutType: 'normal',
        quantity: 1,
        specialRequest: '需要餐具',
        deliveryTime: '30分钟内',
        countdown: 1200
      }
    };
    
    const order = mockOrders[serviceType] || mockOrders.express;
    this.processOrderData(order);
  },

  // 生成时间线
  generateTimeline: function(order) {
    const timeline = [];
    
    // 订单创建
    timeline.push({
      time: order.createTime,
      title: '订单创建',
      description: '用户提交订单',
      status: 'completed',
      icon: 'create'
    });
    
    // 支付成功
    if (order.payStatus === 'paid') {
      timeline.push({
        time: this.getTimeAfter(order.createTime, 1),
        title: '支付成功',
        description: `支付金额 ¥${order.price}`,
        status: 'completed',
        icon: 'payment'
      });
    }
    
    // 接单时间
    if (order.status === 'accepted' || order.status === 'in_progress' || order.status === 'completed') {
      timeline.push({
        time: this.getTimeAfter(order.createTime, 2),
        title: '骑手接单',
        description: `接单骑手：${order.acceptorName || '未知骑手'}`,
        status: 'completed',
        icon: 'accept'
      });
    }
    
    // 开始处理
    if (order.status === 'in_progress' || order.status === 'completed') {
      timeline.push({
        time: this.getTimeAfter(order.createTime, 5),
        title: '开始处理',
        description: '骑手开始处理订单',
        status: 'completed',
        icon: 'progress'
      });
    }
    
    // 完成订单
    if (order.status === 'completed') {
      timeline.push({
        time: order.completedTime || this.getTimeAfter(order.createTime, 15),
        title: '订单完成',
        description: '订单已完成服务',
        status: 'completed',
        icon: 'complete'
      });
    }
    
    // 取消订单
    if (order.status === 'canceled') {
      timeline.push({
        time: this.getTimeAfter(order.createTime, 3),
        title: '订单取消',
        description: '用户取消订单',
        status: 'canceled',
        icon: 'cancel'
      });
    }
    
    return timeline;
  },

  // 获取相对时间
  getTimeAfter: function(baseTime, minutes) {
    const base = new Date(baseTime);
    base.setMinutes(base.getMinutes() + minutes);
    return base.toLocaleString();
  },

  // 联系发布者/接单者
  contactUser: function() {
    const order = this.data.order;
    const contactName = order.acceptorName || order.publisherName;
    
    wx.showActionSheet({
      itemList: [`联系${contactName}`, '联系客服'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.startChat();
        } else if (res.tapIndex === 1) {
          this.contactCustomerService();
        }
      }
    });
  },

  // 开始聊天
  startChat: function() {
    const order = this.data.order;
    wx.navigateTo({
      url: `/pages/order-chat/order-chat?orderId=${order.id}&serviceProviderId=${order.acceptorId || order.publisherId}&serviceProvider=${order.acceptorName || order.publisherName}`
    });
  },

  // 联系客服
  contactCustomerService: function() {
    wx.navigateTo({
      url: `/pages/customer-service/customer-service?orderId=${this.data.order.id}`
    });
  },

  // 取消订单
  cancelOrder: function() {
    const order = this.data.order;
    
    if (order.status !== 'pending') {
      wx.showToast({
        title: '当前状态不可取消',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showCancelDialog: true
    });
  },

  // 确认取消订单
  confirmCancelOrder: function() {
    const order = this.data.order;
    
    wx.showLoading({
      title: '取消中...',
    });
    
    // 模拟取消请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新订单状态
      this.updateOrderStatus({
        status: 'canceled',
        payStatus: 'refunded',
        cancelTime: new Date().toLocaleString()
      });
      
      this.setData({
        showCancelDialog: false
      });
      
      wx.showToast({
        title: '订单已取消',
        icon: 'success'
      });
    }, 1500);
  },

  // 隐藏取消对话框
  hideCancelDialog: function() {
    this.setData({
      showCancelDialog: false
    });
  },

  // 确认完成订单
  confirmComplete: function() {
    const order = this.data.order;
    
    if (order.status !== 'accepted' && order.status !== 'in_progress') {
      wx.showToast({
        title: '当前状态不可确认完成',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？确认后订单将无法修改。',
      success: (res) => {
        if (res.confirm) {
          this.completeOrder();
        }
      }
    });
  },

  // 完成订单
  completeOrder: function() {
    wx.showLoading({
      title: '确认中...',
    });
    
    // 模拟完成请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新订单状态
      this.updateOrderStatus({
        status: 'completed',
        completedTime: new Date().toLocaleString(),
        countdown: 0
      });
      
      wx.showToast({
        title: '订单已完成',
        icon: 'success'
      });
      
      // 显示评价提示
      setTimeout(() => {
        this.showRatingDialog();
      }, 1000);
    }, 1500);
  },

  // 显示评价对话框
  showRatingDialog: function() {
    this.setData({
      showRatingDialog: true,
      ratingData: {
        score: 5,
        content: '',
        tags: []
      }
    });
  },

  // 隐藏评价对话框
  hideRatingDialog: function() {
    this.setData({
      showRatingDialog: false
    });
  },

  // 选择评分
  selectRatingScore: function(e) {
    const score = parseInt(e.currentTarget.dataset.score);
    this.setData({
      'ratingData.score': score
    });
  },

  // 选择评价标签
  toggleRatingTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = this.data.ratingData.tags;
    
    if (tags.includes(tag)) {
      // 移除标签
      this.setData({
        'ratingData.tags': tags.filter(t => t !== tag)
      });
    } else {
      // 添加标签（最多3个）
      if (tags.length < 3) {
        this.setData({
          'ratingData.tags': [...tags, tag]
        });
      } else {
        wx.showToast({
          title: '最多选择3个标签',
          icon: 'none'
        });
      }
    }
  },

  // 输入评价内容
  onRatingContentInput: function(e) {
    this.setData({
      'ratingData.content': e.detail.value
    });
  },

  // 提交评价
  submitRating: function() {
    const { score, content, tags } = this.data.ratingData;
    
    if (score === 0) {
      wx.showToast({
        title: '请选择评分',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '提交中...',
    });
    
    // 模拟提交评价
    setTimeout(() => {
      wx.hideLoading();
      
      // 保存评价数据
      const ratings = wx.getStorageSync('orderRatings') || {};
      ratings[this.data.order.id] = {
        orderId: this.data.order.id,
        score: score,
        content: content,
        tags: tags,
        createTime: new Date().toLocaleString()
      };
      wx.setStorageSync('orderRatings', ratings);
      
      // 更新订单状态
      this.updateOrderStatus({
        rated: true,
        ratingScore: score
      });
      
      this.setData({
        showRatingDialog: false
      });
      
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });
    }, 1500);
  },

  // 更新订单状态
  updateOrderStatus: function(updates) {
    const order = { ...this.data.order, ...updates };
    const timeline = this.generateTimeline(order);
    
    this.setData({
      order: order,
      timeline: timeline
    });
    
    // 更新存储中的订单数据
    this.updateOrderInStorage(order);
  },

  // 更新存储中的订单
  updateOrderInStorage: function(updatedOrder) {
    const storageKeys = ['expressOrders', 'takeoutOrders', 'supermarketOrders', 
                        'substituteOrders', 'brushOrders', 'otherOrders'];
    
    for (let key of storageKeys) {
      const orders = wx.getStorageSync(key) || [];
      const index = orders.findIndex(item => item.id === updatedOrder.id);
      if (index !== -1) {
        orders[index] = updatedOrder;
        wx.setStorageSync(key, orders);
        break;
      }
    }
  },

  // 复制订单号
  copyOrderNo: function() {
    const orderNo = this.data.order.orderNo;
    wx.setClipboardData({
      data: orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        });
      }
    });
  },

  // 查看服务详情
  viewServiceDetail: function() {
    const order = this.data.order;
    let content = '';
    
    switch(order.serviceType) {
      case 'express':
        content = `取件地址：${order.pickupAddress}\n取件码：${order.pickupCode}\n快递公司：${order.expressCompany}\n送达地址：${order.deliveryAddress}\n联系电话：${order.phone}\n快递重量：${this.getWeightText(order.weight)}\n特殊说明：${order.specialNote || '无'}`;
        break;
      case 'takeout':
        content = `取餐地址：${order.takeoutLocation}\n店铺名称：${order.shopName}\n取餐码：${order.pickupCode}\n送达地址：${order.deliveryAddress}\n外卖类型：${this.getTakeoutTypeText(order.takeoutType)}\n份数：${order.quantity}份\n特殊要求：${order.specialRequest || '无'}`;
        break;
      case 'supermarket':
        content = `商品数量：${order.goodsList ? order.goodsList.length : 0}件\n送达地址：${order.deliveryAddress}\n联系电话：${order.phone}\n备注：${order.remark || '无'}`;
        break;
      case 'substitute':
        content = `上课地点：${order.building} ${order.classroom}\n科目：${order.subject}\n上课时间：${order.classTime}\n学生姓名：${order.studentName}\n学号：${order.studentId}\n附加服务：${this.getAdditionalServicesText(order.additionalServices)}\n备注：${order.remark || '无'}`;
        break;
      case 'courseBrush':
        content = `刷课平台：${order.platform}\n科目名称：${order.courseName}\n学生姓名：${order.name}\n学号：${order.studentId}\n学校：${order.school}\n特殊要求：${order.requirements || '无'}`;
        break;
      case 'other':
        content = `服务要求：${order.requirements}\n送达地址：${order.address}\n联系电话：${order.phone}\n期望时间：${order.expectedTime || '无'}\n备注：${order.remarks || '无'}`;
        break;
      default:
        content = '暂无详细信息';
    }
    
    wx.showModal({
      title: '服务详情',
      content: content,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 获取重量文本
  getWeightText: function(weight) {
    const weightMap = {
      'small': '小件',
      'medium': '中件',
      'large': '大件',
      'heavy': '特重件'
    };
    return weightMap[weight] || weight;
  },

  // 获取外卖类型文本
  getTakeoutTypeText: function(type) {
    const typeMap = {
      'normal': '普通外卖',
      'drink': '饮品',
      'multiple': '多份外卖'
    };
    return typeMap[type] || type;
  },

  // 获取附加服务文本
  getAdditionalServicesText: function(services) {
    if (!services) return '无';
    
    const serviceTexts = [];
    if (services.noteTaking) serviceTexts.push('课堂笔记');
    if (services.homework) serviceTexts.push('代写作业');
    if (services.presentation) serviceTexts.push('演讲内容');
    if (services.answering) serviceTexts.push('课堂回答问题');
    
    return serviceTexts.length > 0 ? serviceTexts.join('、') : '无';
  },

  // 分享订单
  onShareAppMessage: function() {
    const order = this.data.order;
    return {
      title: `我在校园生活助手下单了${order.serviceName}`,
      path: `/pages/order-detail/order-detail?orderId=${order.id}&serviceType=${order.serviceType}`
    };
  }
})