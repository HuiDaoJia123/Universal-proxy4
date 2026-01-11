// pages/real-name-auth/real-name-auth.js
const AuthManager = require('../../utils/auth.js');
const api = require('../../utils/api.js');
 
Page({
  data: {
    // 认证状态: not_started(未开始), reviewing(审核中), success(成功), failed(失败)
    authStatus: 'not_started',
    
    // 状态配置（图标、标题、描述、徽章）
    statusConfig: {
      icon: '/assets/icons/auth-not-started.png',
      title: '未认证',
      desc: '完成学生认证，享受学生专属特权',
      badge: '未认证'
    },
    
    // 表单数据
    formData: {
      realName: '',
      schoolName: '',
      studentId: '',
      studentCardImage: '' // 学生证照片临时路径
    },
    
    // 协议状态
    agreementChecked: false,
    showAgreementModal: false,
    
    // 提交状态
    isSubmitting: false,
    canSubmit: false,
    
    // 认证信息（审核中/成功/失败时展示）
    authInfo: {
      realName: '',
      schoolName: '',
      studentId: '',
      authTime: '', // 认证通过时间
      submitTime: '', // 提交时间
      failReason: '学生证信息不清晰，无法识别姓名和学号' // 失败原因（默认示例）
    }
  },
 
  onLoad: function(options) {
    console.log('学生认证页面加载完成，页面参数:', options);
    
    // 从缓存或API获取真实认证状态
    this.checkAuthStatus();
  },
 
  onShow: function() {
    console.log('学生认证页面显示');
    // 检查认证状态是否有更新
    this.checkAuthStatus();
  },
 
  onReady: function() {
    console.log('学生认证页面渲染完成');
  },
 
  /**
   * 检查认证状态
   */
  checkAuthStatus: function() {
    // 首先检查本地存储的认证状态
    const localStatus = AuthManager.getAuthStatus();
    const localAuthInfo = AuthManager.getAuthInfo();
    
    if (localStatus && localStatus !== 'not_started') {
      this.updateStatusConfig(localStatus);
      this.setData({
        authStatus: localStatus,
        authInfo: this.formatAuthInfo(localAuthInfo, localStatus)
      });
      return;
    }
    
    // 如果本地没有状态，使用模拟数据
    const mockStatus = 'not_started'; // 可选值：not_started/reviewing/success/failed
    this.updateStatusConfig(mockStatus);
    this.setData({
      authStatus: mockStatus,
      authInfo: this.getMockAuthInfo(mockStatus)
    });
  },
 
  /**
   * 格式化认证信息
   */
  formatAuthInfo: function(authInfo, status) {
    if (!authInfo) return {};
    
    if (status === 'success') {
      return {
        realName: authInfo.realName,
        schoolName: authInfo.schoolName,
        studentId: authInfo.studentId,
        authTime: authInfo.authTime,
        submitTime: '',
        failReason: ''
      };
    } else if (status === 'reviewing') {
      return {
        realName: authInfo.realName,
        schoolName: authInfo.schoolName,
        studentId: authInfo.studentId,
        submitTime: authInfo.updateTime,
        failReason: ''
      };
    }
    
    return authInfo;
  },
 
  /**
   * 更新状态配置（根据状态切换图标、标题等）
   * @param {string} status - 认证状态
   */
  updateStatusConfig: function(status) {
    const configMap = {
      not_started: {
        icon: '/assets/icons/auth-not-started.png',
        title: '未认证',
        desc: '完成学生认证，享受学生专属特权',
        badge: '未认证'
      },
      reviewing: {
        icon: '/assets/icons/auth-reviewing.png',
        title: '审核中',
        desc: '您的认证信息正在审核中，请耐心等待',
        badge: '审核中'
      },
      success: {
        icon: '/assets/icons/auth-success.png',
        title: '已认证',
        desc: '您已完成学生认证',
        badge: '已认证'
      },
      failed: {
        icon: '/assets/icons/auth-failed.png',
        title: '认证失败',
        desc: '认证失败，请重新提交信息',
        badge: '未认证'
      }
    };
    
    this.setData({
      statusConfig: configMap[status]
    });
  },
 
  /**
   * 获取模拟认证信息（根据状态返回对应数据）
   * @param {string} status - 认证状态
   * @returns {object} 认证信息
   */
  getMockAuthInfo: function(status) {
    const formData = this.data.formData;
    const now = new Date();
    
    switch (status) {
      case 'reviewing':
        return {
          ...formData,
          submitTime: this.formatTime(now),
          failReason: ''
        };
      case 'success':
        return {
          ...formData,
          authTime: this.formatTime(new Date(now.getTime() - 24 * 60 * 60 * 1000)), // 昨天的时间
          submitTime: '',
          failReason: ''
        };
      case 'failed':
        return {
          ...formData,
          submitTime: '',
          failReason: '学生证信息不清晰，无法识别姓名和学号'
        };
      default:
        return this.data.authInfo;
    }
  },
 
  /**
   * 输入真实姓名
   */
  onRealNameInput: function(e) {
    this.setData({
      'formData.realName': e.detail.value.trim()
    }, this.checkFormValidity); // 输入后检查表单有效性
  },
 
  /**
   * 输入学校名称
   */
  onSchoolNameInput: function(e) {
    this.setData({
      'formData.schoolName': e.detail.value.trim()
    }, this.checkFormValidity);
  },
 
  /**
   * 输入学号
   */
  onStudentIdInput: function(e) {
    this.setData({
      'formData.studentId': e.detail.value.trim()
    }, this.checkFormValidity);
  },
 
  /**
   * 选择学生证照片
   */
  chooseStudentCardImage: function() {
    wx.chooseImage({
      count: 1, // 仅允许选择1张
      sizeType: ['compressed'], // 压缩图片
      sourceType: ['album', 'camera'], // 相册/相机
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.studentCardImage': tempFilePath
        }, this.checkFormValidity);
        
        wx.showToast({
          title: '图片上传成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择学生证照片失败:', err);
        wx.showToast({
          title: '选择照片失败，请重试',
          icon: 'none'
        });
      }
    });
  },
 
  /**
   * 切换协议勾选状态
   */
  toggleAgreement: function() {
    this.setData({
      agreementChecked: !this.data.agreementChecked
    }, this.checkFormValidity);
  },
 
  /**
   * 检查表单是否有效（所有字段填写完整 + 协议勾选）
   */
  checkFormValidity: function() {
    const { realName, schoolName, studentId, studentCardImage } = this.data.formData;
    const { agreementChecked } = this.data;
    
    // 表单有效条件：所有字段非空 + 协议勾选
    const isValid = realName !== '' && 
                   schoolName !== '' && 
                   studentId !== '' && 
                   studentCardImage !== '' && 
                   agreementChecked;
    
    this.setData({
      canSubmit: isValid
    });
  },
 
  /**
   * 提交认证申请
   */
  submitAuth: function() {
    // 防止重复提交
    if (!this.data.canSubmit || this.data.isSubmitting) return;
    
    this.setData({
      isSubmitting: true
    });
    
    // 显示加载提示
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    // 先上传学生证图片
    api.uploadImage(this.data.formData.studentCardImage)
      .then(response => {
        // 图片上传成功，提交认证信息
        const authData = {
          realName: this.data.formData.realName,
          schoolName: this.data.formData.schoolName,
          studentId: this.data.formData.studentId,
          studentCardImage: response.data.url
        };
        
        return api.submitRealNameAuth(authData);
      })
      .then(response => {
        wx.hideLoading();
        
        // 保存认证信息到本地存储
        const authData = {
          realName: this.data.formData.realName,
          schoolName: this.data.formData.schoolName,
          studentId: this.data.formData.studentId,
          studentCardImage: this.data.formData.studentCardImage
        };
        
        AuthManager.saveAuthInfo(authData);
        
        // 更新页面状态
        this.setData({
          isSubmitting: false,
          authStatus: 'reviewing',
          authInfo: {
            ...this.data.formData,
            submitTime: this.formatTime(new Date())
          }
        });
        
        this.updateStatusConfig('reviewing');
        
        wx.showToast({
          title: '提交成功，进入审核',
          icon: 'success',
          duration: 2000
        });
        
      })
      .catch(error => {
        wx.hideLoading();
        this.setData({
          isSubmitting: false
        });
        
        console.error('认证提交失败:', error);
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      });
  },
 
  /**
   * 格式化时间（YYYY-MM-DD HH:mm:ss）
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的时间字符串
   */
  formatTime: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },
 
  /**
   * 查看认证协议
   */
  viewAgreement: function(e) {
    // 阻止事件冒泡（避免触发父元素的toggleAgreement）
    e && e.stopPropagation && e.stopPropagation();
    
    // 跳转到专门的协议页面
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=student-auth'
    });
  },
 
  /**
   * 隐藏协议弹窗
   */
  hideAgreementModal: function() {
    this.setData({
      showAgreementModal: false
    });
  },
 
  /**
   * 联系客服
   */
  contactService: function() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567', // 替换为真实客服电话
      fail: (err) => {
        console.error('拨打客服电话失败:', err);
        wx.showToast({
          title: '无法拨打，请稍后重试',
          icon: 'none'
        });
      }
    });
  },
 
  /**
   * 返回上一页
   */
  navigateBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/my/my'
        });
      }
    });
  }
});