// pages/notification-center/notification-center.js
const api = require('../../utils/api.js');
 
Page({
  data: {
    currentTab: 0,
    tabs: ['通知', '消息'],
    notifications: [],
    conversations: [],
    unreadCount: 0,
    loading: false
  },
 
  onLoad(options) {
    this.loadNotifications();
    this.loadConversations();
  },
 
  onShow() {
    this.loadNotifications();
    this.loadConversations();
  },
 
  onPullDownRefresh() {
    this.loadNotifications();
    this.loadConversations();
    wx.stopPullDownRefresh();
  },
 
  // 切换标签
  onTabTap(e) {
    const tabIndex = e.currentTarget.dataset.index;
    this.setData({
      currentTab: tabIndex
    });
  },
 
  // 加载通知
  loadNotifications() {
    const userId = wx.getStorageSync('userId');
    
    this.setData({ loading: true });
    
    api.notifications({ user_id: userId }).then(response => {
      this.setData({
        notifications: response.data.notifications,
        unreadCount: response.data.unread_count,
        loading: false
      });
    }).catch(error => {
      console.error('加载通知失败:', error);
      this.setData({ loading: false });
      this.loadLocalNotifications();
    });
  },
 
  // 加载本地通知（降级方案）
  loadLocalNotifications() {
    const notifications = wx.getStorageSync('userNotifications') || [];
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    this.setData({
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        content: notif.content,
        data: notif.data || {},
        status: notif.read ? 'read' : 'unread',
        created_at: notif.time
      })),
      unreadCount: notifications.filter(n => !n.read).length
    });
  },
 
  // 加载对话列表
  loadConversations() {
    const userId = wx.getStorageSync('userId');
    
    api.conversations({ user_id: userId }).then(response => {
      this.setData({
        conversations: response.data.conversations
      });
    }).catch(error => {
      console.error('加载对话失败:', error);
    });
  },
 
  // 点击通知
  onNotificationTap(e) {
    const { index } = e.currentTarget.dataset;
    const notification = this.data.notifications[index];
    
    // 标记为已读
    if (notification.status === 'unread') {
      api.markNotificationRead(notification.id).then(() => {
        // 更新本地状态
        const notifications = this.data.notifications;
        notifications[index].status = 'read';
        this.setData({
          notifications: notifications,
          unreadCount: Math.max(0, this.data.unreadCount - 1)
        });
      }).catch(error => {
        console.error('标记已读失败:', error);
      });
    }
 
    // 处理跳转逻辑
    this.handleNotificationRedirect(notification);
  },
 
  // 处理通知跳转
  handleNotificationRedirect(notification) {
    const { type, data } = notification;
    
    switch (type) {
      case 'audit_result':
        wx.navigateTo({
          url: `/pages/apply-audit/apply-audit?type=${data.audit_type}&result=${data.result}`
        });
        break;
      
      case 'order_status':
        if (data.order_id) {
          wx.navigateTo({
            url: `/pages/order-detail/order-detail?id=${data.order_id}`
          });
        }
        break;
      
      case 'payment':
        wx.navigateTo({
          url: `/pages/wallet/wallet`
        });
        break;
      
      case 'chat_message':
        if (data.conversation_id) {
          wx.navigateTo({
            url: `/pages/chat/chat?conversation_id=${data.conversation_id}`
          });
        }
        break;
      
      default:
        wx.showToast({
          title: '通知已查看',
          icon: 'none'
        });
    }
  },
 
  // 点击对话
  onConversationTap(e) {
    const { index } = e.currentTarget.dataset;
    const conversation = this.data.conversations[index];
    
    wx.navigateTo({
      url: `/pages/chat/chat?conversation_id=${conversation.id}`
    });
  },
 
  // 清除所有通知
  onClearAllTap() {
    wx.showModal({
      title: '确认清除',
      content: '是否要清除所有通知？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userNotifications');
          this.setData({ 
            notifications: [],
            unreadCount: 0
          });
        }
      }
    });
  },
 
  // 标记所有为已读
  onMarkAllRead() {
    const userId = wx.getStorageSync('userId');
    const unreadNotifications = this.data.notifications.filter(n => n.status === 'unread');
    
    if (unreadNotifications.length === 0) {
      wx.showToast({
        title: '没有未读通知',
        icon: 'none'
      });
      return;
    }
 
    // 批量标记已读
    Promise.all(unreadNotifications.map(notif => 
      api.markNotificationRead(notif.id)
    )).then(() => {
      // 更新本地状态
      const notifications = this.data.notifications.map(n => ({
        ...n,
        status: 'read'
      }));
      
      this.setData({
        notifications: notifications,
        unreadCount: 0
      });
      
      wx.showToast({
        title: '全部标记为已读',
        icon: 'success'
      });
    }).catch(error => {
      console.error('批量标记失败:', error);
    });
  }
});