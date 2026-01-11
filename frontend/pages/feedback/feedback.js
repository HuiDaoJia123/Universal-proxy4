// pages/feedback/feedback.js
Page({
  data: {
    // 反馈类型选项
    feedbackTypes: [
      {
        value: 'bug',
        name: '功能异常',
        icon: '/assets/icons/bug.png'
      },
      {
        value: 'suggestion',
        name: '产品建议',
        icon: '/assets/icons/suggestion.png'
      },
      {
        value: 'experience',
        name: '体验问题',
        icon: '/assets/icons/experience.png'
      },
      {
        value: 'content',
        name: '内容问题',
        icon: '/assets/icons/content.png'
      },
      {
        value: 'performance',
        name: '性能问题',
        icon: '/assets/icons/performance.png'
      },
      {
        value: 'other',
        name: '其他问题',
        icon: '/assets/icons/other.png'
      }
    ],
    
    // 屏蔽词列表（示例，实际应从服务器获取）
    bannedWords: [
      '违法', '诈骗', '赌博', '色情', '毒品', '暴力', 
      '恐怖', '反动', '政治', '宗教', '敏感',
      // 这里可以添加更多屏蔽词
    ],
    
    // 反馈数据
    feedbackData: {
      type: '',
      content: '',
      images: [],
      contact: {
        phone: '',
        email: ''
      }
    },
    
    // 表单状态
    canSubmit: false,
    isSubmitting: false,
    showSuccessModal: false,
    contentWarning: '', // 内容警告信息
    isValidContent: true // 内容是否合规
  },
 
  onLoad: function(options) {
    // 页面加载时的初始化
    this.checkFormValidity();
    this.loadBannedWords();
  },
 
  // 加载屏蔽词
  loadBannedWords: function() {
    // 从服务器获取最新的屏蔽词列表
    wx.request({
      url: 'http://127.0.0.1:8000/api/banned-words/',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const words = res.data.data.map(item => item.word.toLowerCase());
          this.setData({
            bannedWords: words
          });
        }
      },
      fail: (err) => {
        console.error('加载屏蔽词失败:', err);
        // 使用默认屏蔽词
      }
    });
  },
 
  // 选择反馈类型
  selectType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'feedbackData.type': type
    }, this.checkFormValidity);
  },
 
  // 输入反馈内容
  onContentInput: function(e) {
    const content = e.detail.value;
    this.setData({
      'feedbackData.content': content
    });
    
    // 实时检查内容
    this.validateContent(content);
    this.checkFormValidity();
  },
 
  // 内容验证函数
  validateContent: function(content) {
    const { bannedWords } = this.data;
    let contentWarning = '';
    let isValidContent = true;
    const matchedWords = [];
    
    // 检查屏蔽词
    const lowerContent = content.toLowerCase();
    for (let word of bannedWords) {
      if (lowerContent.includes(word)) {
        matchedWords.push(word);
        isValidContent = false;
      }
    }
    
    if (matchedWords.length > 0) {
      contentWarning = `内容包含不当词汇: ${matchedWords.join(', ')}，请修改后重新提交`;
    } else if (content.length < 10) {
      contentWarning = '反馈内容至少需要10个字符';
      isValidContent = false;
    } else if (content.length > 500) {
      contentWarning = '反馈内容不能超过500个字符';
      isValidContent = false;
    }
    
    this.setData({
      contentWarning,
      isValidContent: isValidContent || content.length === 0
    });
    
    return isValidContent && content.length >= 10 && content.length <= 500;
  },
 
  // 内容过滤函数（替换屏蔽词为*）
  filterContent: function(content) {
    const { bannedWords } = this.data;
    let filteredContent = content;
    
    // 替换屏蔽词
    for (let word of bannedWords) {
      const regex = new RegExp(word, 'gi');
      filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
    }
    
    return filteredContent;
  },
 
  // 选择图片
  chooseImage: function() {
    if (this.data.feedbackData.images.length >= 3) return;
    
    wx.chooseImage({
      count: 3 - this.data.feedbackData.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...this.data.feedbackData.images, ...res.tempFilePaths];
        this.setData({
          'feedbackData.images': newImages
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
 
  // 移除图片
  removeImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.feedbackData.images.filter((_, i) => i !== index);
    this.setData({
      'feedbackData.images': images
    });
  },
 
  // 输入手机号
  onPhoneInput: function(e) {
    this.setData({
      'feedbackData.contact.phone': e.detail.value
    });
  },
 
  // 输入邮箱
  onEmailInput: function(e) {
    this.setData({
      'feedbackData.contact.email': e.detail.value
    });
  },
 
  // 检查表单是否有效
  checkFormValidity: function() {
    const { type, content } = this.data.feedbackData;
    const { isValidContent } = this.data;
    const isValid = type && content.trim().length >= 10 && isValidContent;
    
    this.setData({
      canSubmit: isValid
    });
  },
 
  // 提交反馈
  submitFeedback: function() {
    if (!this.data.canSubmit || this.data.isSubmitting) return;
    
    // 验证联系方式格式
    if (this.data.feedbackData.contact.phone && 
        !this.validatePhone(this.data.feedbackData.contact.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.feedbackData.contact.email && 
        !this.validateEmail(this.data.feedbackData.contact.email)) {
      wx.showToast({
        title: '邮箱格式不正确',
        icon: 'none'
      });
      return;
    }
    
    // 最后一次验证内容
    if (!this.validateContent(this.data.feedbackData.content)) {
      wx.showToast({
        title: '内容包含不当词汇',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isSubmitting: true
    });
    
    // 先过滤内容，然后上传图片
    const filteredContent = this.filterContent(this.data.feedbackData.content);
    
    this.uploadImages().then((imageUrls) => {
      const submitData = {
        type: this.data.feedbackData.type,
        content: filteredContent, // 使用过滤后的内容
        images: imageUrls,
        contact: this.data.feedbackData.contact,
        timestamp: new Date().toISOString(),
        version: this.getSystemInfo()
      };
      
      return this.submitToServer(submitData);
    }).then(() => {
      this.setData({
        isSubmitting: false,
        showSuccessModal: true
      });
    }).catch((error) => {
      console.error('提交失败:', error);
      this.setData({
        isSubmitting: false
      });
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    });
  },
 
  // 上传图片到服务器
  uploadImages: function() {
    const images = this.data.feedbackData.images;
    if (images.length === 0) {
      return Promise.resolve([]);
    }
    
    // 模拟图片上传
    return new Promise((resolve) => {
      setTimeout(() => {
        const imageUrls = images.map((_, index) => 
          `https://example.com/feedback/images/${Date.now()}_${index}.jpg`
        );
        resolve(imageUrls);
      }, 1000);
    });
  },
 
  // 提交到服务器
  submitToServer: function(data) {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('提交的反馈数据:', data);
        // 这里应该是实际的API调用
        resolve();
      }, 1500);
    });
  },
 
  // 验证手机号
  validatePhone: function(phone) {
    const pattern = /^1[3-9]\d{9}$/;
    return pattern.test(phone);
  },
 
  // 验证邮箱
  validateEmail: function(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },
 
  // 获取系统信息
  getSystemInfo: function() {
    const systemInfo = wx.getSystemInfoSync();
    return {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion
    };
  },
 
  // 隐藏成功弹窗
  hideSuccessModal: function() {
    this.setData({
      showSuccessModal: false
    });
  },
 
  // 跳转到反馈历史
  navigateToHistory: function() {
    wx.navigateTo({
      url: '/pages/feedback-history/feedback-history'
    });
  },
 
  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  }
});