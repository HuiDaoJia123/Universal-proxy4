// pages/rating/rating.js
Page({
  data: {
    // 订单信息
    orderInfo: {
      orderNo: 'DD20240520001',
      serviceName: '深度家电清洗服务',
      category: '家电清洗',
      amount: 158.00,
      createTime: '2024-05-20 14:30',
      serviceImage: '/assets/images/service-sample.jpg'
    },
    
    // 评分数据
    ratingData: {
      overallScore: 0,
      attitudeScore: 0,
      professionalScore: 0,
      responseScore: 0,
      comment: '',
      anonymous: false
    },
    
    // 评价标签
    ratingTags: [
      { id: 1, name: '服务周到', selected: false },
      { id: 2, name: '专业可靠', selected: false },
      { id: 3, name: '响应迅速', selected: false },
      { id: 4, name: '价格合理', selected: false },
      { id: 5, name: '干净整洁', selected: false },
      { id: 6, name: '沟通顺畅', selected: false },
      { id: 7, name: '守时准时', selected: false },
      { id: 8, name: '解决问题', selected: false }
    ],
    
    // 表单状态
    isFormValid: false,
    isSubmitting: false,
    showSuccessModal: false
  },

  onLoad: function(options) {
    // 从订单详情页传递过来的订单ID
    if (options.orderId) {
      this.fetchOrderInfo(options.orderId);
    }
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '评价服务'
    });
  },

  // 获取订单信息
  fetchOrderInfo: function(orderId) {
    // 模拟API调用获取订单信息
    const mockOrderInfo = {
      orderNo: 'DD20240520' + orderId,
      serviceName: '深度家电清洗服务',
      category: '家电清洗',
      amount: 158.00,
      createTime: '2024-05-20 14:30',
      serviceImage: '/assets/images/service-sample.jpg'
    };
    
    this.setData({
      orderInfo: mockOrderInfo
    });
  },

  // 设置总体评分
  setOverallScore: function(e) {
    const score = parseInt(e.currentTarget.dataset.score);
    this.setData({
      'ratingData.overallScore': score
    }, this.checkFormValidity);
  },

  // 设置分项评分
  setDetailScore: function(e) {
    const { type, score } = e.currentTarget.dataset;
    this.setData({
      [`ratingData.${type}`]: parseInt(score)
    });
  },

  // 切换标签选择
  toggleTag: function(e) {
    const tagId = parseInt(e.currentTarget.dataset.tag);
    const ratingTags = this.data.ratingTags.map(tag => {
      if (tag.id === tagId) {
        return { ...tag, selected: !tag.selected };
      }
      return tag;
    });
    
    this.setData({
      ratingTags
    });
  },

  // 输入评价内容
  onCommentInput: function(e) {
    this.setData({
      'ratingData.comment': e.detail.value
    });
  },

  // 切换匿名评价
  toggleAnonymous: function() {
    this.setData({
      'ratingData.anonymous': !this.data.ratingData.anonymous
    });
  },

  // 检查表单是否有效
  checkFormValidity: function() {
    const { overallScore } = this.data.ratingData;
    const isValid = overallScore > 0;
    
    if (this.data.isFormValid !== isValid) {
      this.setData({
        isFormValid: isValid
      });
    }
  },

  // 提交评价
  submitRating: function() {
    if (!this.data.isFormValid || this.data.isSubmitting) return;
    
    this.setData({
      isSubmitting: true
    });
    
    // 模拟API提交
    setTimeout(() => {
      this.setData({
        isSubmitting: false,
        showSuccessModal: true
      });
    }, 1500);
  },

  // 隐藏成功弹窗
  hideSuccessModal: function() {
    this.setData({
      showSuccessModal: false
    });
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 返回订单页面
  navigateToOrder: function() {
    wx.navigateBack();
  }
});