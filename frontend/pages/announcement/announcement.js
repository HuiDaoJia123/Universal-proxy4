// pages/announcement/announcement.js
const api = require('../../utils/api.js');
 
Page({
  data: {
    currentTab: 'intro', // 当前标签页：intro, guide, user_notice, rider_notice
    currentAnnouncement: {
      title: '',
      content: '',
      created_at: ''
    },
    loading: false
  },
 
  onLoad: function(options) {
    // 如果有传入的tab参数，则跳转到对应的tab
    if (options.tab) {
      this.setData({
        currentTab: options.tab
      });
    }
    
    // 加载公告内容
    this.loadAnnouncement();
  },
 
  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab !== this.data.currentTab) {
      this.setData({
        currentTab: tab,
        loading: true,
        currentAnnouncement: {
          title: '',
          content: '',
          created_at: ''
        }
      });
      this.loadAnnouncement();
    }
  },
 
  // 加载公告内容
  loadAnnouncement: function() {
    const { currentTab } = this.data;
    
    // 先显示本地默认内容
    this.showDefaultContent(currentTab);
    
    // 然后尝试从后端获取最新内容
    this.fetchAnnouncementFromServer(currentTab);
  },
 
  // 显示本地默认内容
  showDefaultContent: function(type) {
    const defaultContents = {
      'intro': {
        title: '软件介绍',
        content: '欢迎使用我们的校园服务平台！\n\n本平台致力于为校园用户提供便捷的代取快递、外卖代取、超市代买、代课刷课等多种服务。\n\n我们的使命是让校园生活更加便利，为用户提供安全、高效、可靠的服务体验。',
        created_at: '2024-01-01'
      },
      'guide': {
        title: '新手指导',
        content: '📱 首次使用指南\n\n1. 注册登录\n- 使用微信登录，完善个人信息\n- 实名认证后可享受更多服务\n\n2. 发布订单\n- 选择服务类型\n- 填写详细需求信息\n- 确认价格后发布\n\n3. 查看订单\n- 在"我的订单"中查看订单状态\n- 可与骑手实时沟通\n\n4. 完成订单\n- 确认收货后评价骑手\n- 及时反馈问题',
        created_at: '2024-01-01'
      },
      'user_notice': {
        title: '用户须知',
        content: '📋 用户使用须知\n\n1. 订单规范\n- 请如实填写订单信息\n- 禁止发布违规内容\n- 取消订单需提前说明\n\n2. 支付说明\n- 支持微信支付\n- 订单完成后自动扣款\n- 退款按平台规则处理\n\n3. 评价机制\n- 请客观评价服务\n- 恶意评价将影响信誉\n\n4. 客服支持\n- 遇到问题及时联系客服\n- 提供订单截图等证据',
        created_at: '2024-01-01'
      },
      'rider_notice': {
        title: '骑手须知',
        content: '🚴 骑手工作须知\n\n1. 接单要求\n- 认真查看订单详情\n- 确认能够按时送达\n- 接单后及时联系用户\n\n2. 服务标准\n- 保持良好服务态度\n- 准时送达不延误\n- 妥善保管物品\n\n3. 收益说明\n- 按服务类型获得佣金\n- 加价部分全额归骑手\n- 好评可提升优先级\n\n4. 违规处理\n- 违规将扣除信誉分\n- 严重违规将封号\n- 投诉会调查处理',
        created_at: '2024-01-01'
      }
    };
 
    this.setData({
      currentAnnouncement: defaultContents[type] || { title: '暂无内容', content: '', created_at: '' },
      loading: false
    });
  },
 
  // 从服务器获取公告内容
  fetchAnnouncementFromServer: function(type) {
    // 如果配置了后端API，则调用
    try {
      api.getAnnouncementByType(type)
        .then(res => {
          if (res.code === 200 && res.data) {
            this.setData({
              currentAnnouncement: res.data
            });
          }
        })
        .catch(err => {
          console.log('获取公告失败，使用本地默认内容:', err);
        });
    } catch (error) {
      console.log('API调用失败:', error);
    }
  }
});