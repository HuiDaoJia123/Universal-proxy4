// pages/customer-service/customer-service.js
Page({
  data: {
    messages: [
      {
        id: 1,
        sender: 'service',
        content: '您好，我是校园生活助手客服，有什么可以帮助您的吗？',
        time: '10:00'
      }
    ],
    inputMessage: '',
    userInfo: {
      avatarUrl: '/images/default-avatar.png'
    }
  },

  onLoad: function (options) {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      userInfo: userInfo
    });
    
    // 如果有订单ID，说明是客服介入
    if (options.orderId) {
      this.setData({
        orderId: options.orderId
      });
      
      // 添加客服介入的欢迎消息
      const messages = this.data.messages;
      messages.push({
        id: 2,
        sender: 'service',
        content: '检测到您有订单需要客服介入处理，请详细描述您遇到的问题。',
        time: this.getCurrentTime()
      });
      
      this.setData({ messages });
    }
  },

  onShow: function () {
    // 页面显示时的逻辑
  },

  // 输入消息
  onInputMessage: function(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },

  // 发送消息
  sendMessage: function() {
    const message = this.data.inputMessage.trim();
    if (!message) return;

    // 添加用户消息
    const messages = this.data.messages;
    messages.push({
      id: messages.length + 1,
      sender: 'user',
      content: message,
      time: this.getCurrentTime()
    });

    this.setData({
      messages: messages,
      inputMessage: ''
    });

    // 滚动到底部
    this.scrollToBottom();

    // 模拟客服回复
    setTimeout(() => {
      this.addServiceResponse(message);
    }, 1000);
  },

  // 添加客服回复
  addServiceResponse: function(userMessage) {
    const messages = this.data.messages;
    
    // 简单的关键词回复（在实际应用中应由后端处理）
    let response = '感谢您的反馈，我们会尽快处理您的问题。';
    
    if (userMessage.includes('骑手') || userMessage.includes('配送')) {
      response = '关于骑手的问题，我们会联系相关骑手并尽快给您回复。';
    } else if (userMessage.includes('退款') || userMessage.includes('取消')) {
      response = '退款问题需要1-3个工作日处理，请耐心等待。';
    } else if (userMessage.includes('代课') || userMessage.includes('上课')) {
      response = '代课服务问题我们会联系代课同学核实情况。';
    }
    
    messages.push({
      id: messages.length + 1,
      sender: 'service',
      content: response,
      time: this.getCurrentTime()
    });

    this.setData({ messages });
    this.scrollToBottom();
  },

  // 发送常见问题
  sendFAQ: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      inputMessage: question
    });
    this.sendMessage();
  },

  // 滚动到底部
  scrollToBottom: function() {
    setTimeout(() => {
      wx.createSelectorQuery().select('#chat-content').boundingClientRect(function(rect){
        wx.pageScrollTo({
          scrollTop: rect.bottom
        })
      }).exec()
    }, 100);
  },

  // 获取当前时间
  getCurrentTime: function() {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  // 打电话
  makePhoneCall: function() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    });
  }
})
