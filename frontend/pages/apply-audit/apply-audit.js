// pages/apply-audit/apply-audit.js
const AuthManager = require('../../utils/auth.js');
const api = require('../../utils/api.js');
 
Page({
  data: {
    serviceType: '',
    serviceName: '',
    serviceTitle: '',
    serviceDescription: '',
    serviceRequirements: [],
    serviceBenefits: [],
    
    // 替换为你在微信公众平台申请的 "审核结果通知" 模板ID
    auditTemplateId: 'YOUR_AUDIT_TEMPLATE_ID',
    
    // 申请状态
    isSubmitting: false,
    canSubmit: false,
    
    // 表单数据
    formData: {
      realName: '',
      studentId: '',
      phone: '',
      schoolName: '',
      major: '',
      grade: '',
      selfIntroduction: '',
      skills: '',
      availableTime: '',
      experience: '',
      specialty: '',
      tools: '',
      serviceRange: ''
    },
    
    // 认证状态
    isUserAuthenticated: false,
    authInfo: null,
    
    // 申请状态
    applicationStatus: 'pending', // pending, reviewing, approved, rejected
    applicationInfo: null
  },
 
  onLoad: function (options) {
    console.log('申请审核页面加载', options);
    const { type } = options;
    
    if (!type) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
 
    let serviceName = '';
    let serviceTitle = '';
    let serviceDescription = '';
    let serviceRequirements = [];
    let serviceBenefits = [];
    
    if (type === 'brusher') {
      serviceName = '刷客';
      serviceTitle = '申请成为刷客';
      serviceDescription = '帮助同学完成在线课程作业、考试等任务，获得专业报酬';
      serviceRequirements = [
        '必须完成实名认证',
        '具备专业的刷课技能',
        '熟悉各平台操作流程',
        '保证账号安全和隐私保护',
        '按时完成刷课任务',
        '具备良好的责任心'
      ];
      serviceBenefits = [
        '灵活的工作时间',
        '丰厚的报酬待遇',
        '技能提升机会',
        '专业的培训支持',
        '完善的保障体系'
      ];
    } else if (type === 'teacher') {
      serviceName = '代课同学';
      serviceTitle = '申请成为代课同学';
      serviceDescription = '代替同学上课、记笔记、完成课堂任务，为有需要的同学提供专业服务';
      serviceRequirements = [
        '必须完成实名认证',
        '在校大学生，学籍真实有效',
        '具备良好的学习能力和责任心',
        '能够按时完成代课任务',
        '遵守平台规定和服务规范',
        '具备良好的沟通能力'
      ];
      serviceBenefits = [
        '稳定的收入来源',
        '灵活的时间安排',
        '丰富学习经历',
        '建立人脉关系',
        '获得实践机会'
      ];
    } else {
      wx.showToast({ title: '未知的服务类型', icon: 'error' });
      wx.navigateBack();
      return;
    }
 
    this.setData({
      serviceType: type,
      serviceName: serviceName,
      serviceTitle: serviceTitle,
      serviceDescription: serviceDescription,
      serviceRequirements: serviceRequirements,
      serviceBenefits: serviceBenefits
    });
 
    // 检查认证状态和自动填充
    this.checkAuthAndAutoFill();
    
    // 检查是否已有申请记录
    this.checkExistingApplication();
  },
 
  onShow: function() {
    // 页面显示时更新认证状态
    this.checkAuthAndAutoFill();
  },
 
  /**
   * 检查认证状态并自动填充
   */
  checkAuthAndAutoFill: function() {
    const authInfo = AuthManager.getAuthInfo();
    const isAuthenticated = AuthManager.isAuthenticated();
    
    if (isAuthenticated && authInfo) {
      this.setData({
        'formData.realName': authInfo.realName || '',
        'formData.schoolName': authInfo.schoolName || '',
        'formData.studentId': authInfo.studentId || '',
        'formData.phone': authInfo.phone || '',
        isUserAuthenticated: true,
        authInfo: authInfo
      });
      
      this.validateForm();
      console.log('已从实名认证信息自动填充:', authInfo);
    } else {
      this.setData({
        isUserAuthenticated: false,
        authInfo: null
      });
      console.log('用户未完成实名认证');
    }
  },
 
  /**
   * 检查是否已有申请记录
   */
  checkExistingApplication: function() {
    const applicationKey = `application_${this.data.serviceType}`;
    const existingApplication = wx.getStorageSync(applicationKey);
    
    if (existingApplication) {
      this.setData({
        applicationStatus: existingApplication.status,
        applicationInfo: existingApplication,
        formData: existingApplication.formData || this.data.formData
      });
    }
  },
 
  /**
   * 表单输入处理
   */
  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value.trim();
    
    this.setData({
      [`formData.${field}`]: value
    }, this.validateForm);
  },
 
  /**
   * 验证表单
   */
  validateForm: function() {
    const { realName, studentId, phone, schoolName, selfIntroduction } = this.data.formData;
    
    let isValid = realName && 
                  studentId && 
                  phone && 
                  phone.length === 11 &&
                  schoolName && 
                  selfIntroduction &&
                  this.data.isUserAuthenticated;
    
    // 根据服务类型添加额外验证
    if (this.data.serviceType === 'teacher') {
      const { skills, availableTime, experience } = this.data.formData;
      isValid = isValid && skills && availableTime && experience;
    } else if (this.data.serviceType === 'brusher') {
      const { specialty, tools, serviceRange } = this.data.formData;
      isValid = isValid && specialty && tools && serviceRange;
    }
    
    this.setData({
      canSubmit: isValid
    });
  },
 
  /**
   * 验证手机号
   */
  validatePhone: function(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
 
  /**
   * 提交申请
   */
  submitApplication: function() {
    if (!this.data.canSubmit || this.data.isSubmitting) {
      return;
    }
 
    // 验证手机号格式
    if (!this.validatePhone(this.data.formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
 
    this.setData({
      isSubmitting: true
    });
 
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
 
    const applicationData = {
      serviceType: this.data.serviceType,
      serviceName: this.data.serviceName,
      formData: this.data.formData,
      userId: AuthManager.getUserInfo()?.id || 'unknown',
      userName: AuthManager.getUserInfo()?.username || '未知用户',
      submitTime: new Date().toLocaleString(),
      status: 'pending'
    };
 
    // 调用API提交申请
    api.submitApplication(applicationData)
      .then(response => {
        wx.hideLoading();
        
        // 保存申请信息到本地存储
        const applicationKey = `application_${this.data.serviceType}`;
        wx.setStorageSync(applicationKey, {
          ...applicationData,
          id: response.data.applicationId,
          status: 'reviewing'
        });
        
        this.setData({
          isSubmitting: false,
          applicationStatus: 'reviewing',
          applicationInfo: applicationData
        });
        
        wx.showToast({
          title: '申请提交成功',
          icon: 'success'
        });
        
        // 请求订阅通知
        this.requestSubscribeMessage();
      })
      .catch(error => {
        wx.hideLoading();
        this.setData({
          isSubmitting: false
        });
        
        console.error('申请提交失败:', error);
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      });
  },
 
  /**
   * 请求用户订阅审核结果通知
   */
  requestSubscribeMessage() {
    const { auditTemplateId } = this.data;
 
    if (auditTemplateId === 'YOUR_AUDIT_TEMPLATE_ID') {
      console.warn('请在 apply-audit.js 中替换 auditTemplateId 为你的真实模板ID');
      return;
    }
 
    wx.requestSubscribeMessage({
      tmplIds: [auditTemplateId],
      success: (res) => {
        console.log('订阅消息请求成功', res);
        if (res[auditTemplateId] === 'accept') {
          wx.showToast({
            title: '已成功订阅审核通知',
            icon: 'success'
          });
          wx.setStorageSync(`subscribed_${this.data.serviceType}`, true);
        } else if (res[auditTemplateId] === 'reject') {
          wx.showToast({
            title: '你已拒绝接收审核通知，请在微信设置中重新授权',
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (err) => {
        console.error('订阅消息请求失败', err);
        wx.showToast({
          title: '订阅通知失败',
          icon: 'error'
        });
      }
    });
  },
 
  /**
   * 跳转到实名认证
   */
  goToRealNameAuth: function() {
    wx.navigateTo({
      url: '/pages/real-name-auth/real-name-auth'
    });
  },
 
  /**
   * 用户点击返回上一页
   */
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    });
  },
 
  /**
   * 用户点击查看审核规则
   */
  onRuleTap: function() {
    let content = `${this.data.serviceTitle}规则：\n\n`;
    
    this.data.serviceRequirements.forEach((req, index) => {
      content += `${index + 1}. ${req}\n`;
    });
    
    content += `\n审核通过后可获得以下权益：\n`;
    this.data.serviceBenefits.forEach((benefit, index) => {
      content += `• ${benefit}\n`;
    });
    
    wx.showModal({
      title: '申请规则',
      content: content,
      showCancel: false
    });
  },
 
  /**
   * 撤销申请
   */
  withdrawApplication: function() {
    wx.showModal({
      title: '撤销申请',
      content: '确定要撤销申请吗？撤销后需要重新申请。',
      success: (res) => {
        if (res.confirm) {
          const applicationKey = `application_${this.data.serviceType}`;
          wx.removeStorageSync(applicationKey);
          
          this.setData({
            applicationStatus: 'pending',
            applicationInfo: null
          });
          
          wx.showToast({
            title: '已撤销申请',
            icon: 'success'
          });
        }
      }
    });
  }
});