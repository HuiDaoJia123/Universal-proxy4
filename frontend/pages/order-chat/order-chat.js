// pages/order-chat/order-chat.js
Page({
  data: {
    messages: [],
    inputMessage: '',
    userInfo: {
      avatarUrl: '/images/default-avatar.png'
    },
    serviceProvider: '',
    serviceProviderId: '',
    serviceProviderType: 'rider',
    orderId: '',
    bannedWords: [
      '违禁词1', '违禁词2', '违禁词3', 
      '政治', '暴力', '色情', '赌博', '毒品',
      '微信', 'QQ', '电话', '转账', '红包',
      '加好友', '私聊', '线下', '见面'
    ]
  },
 
  onLoad: function (options) {
    // 获取参数
    const { orderId, serviceProviderId, serviceProvider } = options;
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    this.setData({
      orderId: orderId,
      serviceProviderId: serviceProviderId,
      serviceProvider: serviceProvider,
      userInfo: userInfo,
      serviceProviderType: serviceProviderId.startsWith('rider') ? 'rider' : 'substitute'
    });
 
    // 加载聊天记录
    this.loadChatHistory();
  },
 
  onShow: function () {
    // 页面显示时的逻辑
  },
 
  // 加载聊天记录
  loadChatHistory: function() {
    // 模拟加载聊天记录
    const messages = [
      {
        id: 1,
        sender: 'provider',
        content: '您好，我是为您服务的' + (this.data.serviceProviderType === 'rider' ? '骑手' : '代课同学'),
        time: '09:30'
      },
      {
        id: 2,
        sender: 'provider',
        content: this.data.serviceProviderType === 'rider' ? 
          '请问您的具体取件地址是什么？' : 
          '请问课程的具体要求是什么？',
        time: '09:31'
      }
    ];
    
    this.setData({ messages });
  },
 
  // 输入消息
  onInputMessage: function(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },
 
  // 验证消息内容
  validateMessage: function(content) {
    const { bannedWords } = this.data;
    
    // 检查是否包含屏蔽词
    for (let word of bannedWords) {
      if (content.toLowerCase().includes(word.toLowerCase())) {
        return {
          valid: false,
          message: `消息包含敏感词汇，请重新输入`,
          filteredContent: this.filterContent(content)
        };
      }
    }
    
    // 检查消息长度
    if (content.length > 500) {
      return {
        valid: false,
        message: '消息长度不能超过500字符',
        filteredContent: content
      };
    }
    
    return {
      valid: true,
      message: '内容合规',
      filteredContent: content
    };
  },
 
  // 过滤内容（将敏感词替换为*）
  filterContent: function(content) {
    const { bannedWords } = this.data;
    let filteredContent = content;
    
    for (let word of bannedWords) {
      const regex = new RegExp(word, 'gi');
      filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
    }
    
    return filteredContent;
  },
 
  // 发送消息
  sendMessage: function() {
    const message = this.data.inputMessage.trim();
    if (!message) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }
 
    // 验证消息内容
    const validation = this.validateMessage(message);
    
    if (!validation.valid) {
      wx.showModal({
        title: '内容审核提示',
        content: validation.message,
        showCancel: false,
        success: () => {
          // 可选择是否自动替换为过滤后的内容
          if (validation.filteredContent !== message) {
            wx.showModal({
              title: '内容替换',
              content: '是否将敏感词替换为*后发送？',
              success: (res) => {
                if (res.confirm) {
                  this.doSendMessage(validation.filteredContent);
                }
              }
            });
          }
        }
      });
      return;
    }
 
    this.doSendMessage(message);
  },
 
  // 实际发送消息
  doSendMessage: function(message) {
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
 
    // 调用服务器API进行二次检查
    this.checkContentOnServer(message).then((serverCheck) => {
      if (!serverCheck.is_valid) {
        // 服务器检查发现违规，撤回消息
        this.retractMessage(messages.length);
        wx.showModal({
          title: '消息已拦截',
          content: '您的消息包含不当内容，已被系统拦截',
          showCancel: false
        });
      } else {
        // 服务器检查通过，模拟对方回复
        setTimeout(() => {
          this.addProviderResponse();
        }, 1500);
      }
    }).catch(() => {
      // 服务器检查失败，仍然允许发送
      setTimeout(() => {
        this.addProviderResponse();
      }, 1500);
    });
  },
 
  // 撤回消息
  retractMessage: function(messageId) {
    const messages = this.data.messages.filter(msg => msg.id !== messageId);
    this.setData({ messages });
  },
 
  // 服务器内容检查
  checkContentOnServer: function(content) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:8000/api/check-content/',
        method: 'POST',
        data: {
          content: content,
          content_type: 'chat',
          user_id: this.data.userInfo.id || null
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.data);
          } else {
            reject(new Error('服务器检查失败'));
          }
        },
        fail: reject
      });
    });
  },
 
  // 添加服务方回复
  addProviderResponse: function() {
    const messages = this.data.messages;
    
    const responses = [
      '好的，收到',
      '明白了，我会按照您的要求处理',
      '请稍等，我正在处理',
      '已完成，请确认'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    messages.push({
      id: messages.length + 1,
      sender: 'provider',
      content: randomResponse,
      time: this.getCurrentTime()
    });
 
    this.setData({ messages });
    this.scrollToBottom();
  },
 
  // 举报不当内容
  reportContent: function(e) {
    const messageId = e.currentTarget.dataset.id;
    
    wx.showActionSheet({
      itemList: ['举报不当内容'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '举报确认',
            content: '确定要举报这条消息吗？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.submitReport(messageId);
              }
            }
          });
        }
      }
    });
  },
 
  // 提交举报
  submitReport: function(messageId) {
    wx.showToast({
      title: '举报已提交',
      icon: 'success'
    });
    
    // 这里可以调用API提交举报
    console.log('举报消息ID:', messageId);
  },
 
  // 请求客服介入
  requestCustomerService: function() {
    wx.showModal({
      title: '客服介入',
      content: '确定要请求客服介入处理此订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/customer-service/customer-service?orderId=${this.data.orderId}`
          });
        }
      }
    });
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
  }
})