// pages/chat/chat.js
const api = require('../../utils/api.js');
 
Page({
  data: {
    conversationId: '',
    conversationInfo: {},
    messages: [],
    inputText: '',
    scrollToMessage: '',
    isLoading: true
  },
 
  onLoad(options) {
    const { conversation_id } = options;
    this.setData({
      conversationId: conversation_id
    });
    
    this.loadConversation();
    this.loadMessages();
  },
 
  // 加载对话信息
  loadConversation() {
    api.conversations({ user_id: wx.getStorageSync('userId') }).then(response => {
      const conversations = response.data.conversations;
      const conversation = conversations.find(c => c.id == this.data.conversationId);
      
      if (conversation) {
        wx.setNavigationBarTitle({
          title: conversation.title
        });
        
        this.setData({
          conversationInfo: conversation
        });
      }
    });
  },
 
  // 加载消息
  loadMessages() {
    this.setData({ isLoading: true });
    
    api.messages(this.data.conversationId).then(response => {
      this.setData({
        messages: response.data.messages,
        conversationInfo: response.data.conversation_info,
        isLoading: false,
        scrollToMessage: `message-${response.data.messages.length - 1}`
      });
    }).catch(error => {
      console.error('加载消息失败:', error);
      this.setData({ isLoading: false });
    });
  },
 
  // 发送消息
  onSendTap() {
    const { inputText } = this.data;
    
    if (!inputText.trim()) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }
 
    api.sendMessage(this.data.conversationId, {
      sender_id: wx.getStorageSync('userId'),
      content: inputText,
      message_type: 'text'
    }).then(response => {
      this.setData({
        inputText: ''
      });
      
      // 重新加载消息列表
      this.loadMessages();
    }).catch(error => {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    });
  },
 
  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  }
});