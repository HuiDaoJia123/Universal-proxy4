// pages/rider-apply/rider-apply.js
Page({
  data: {
    form: {
      name: '',
      phone: '',
      studentId: '',
      major: '',
      workTime: '',
      hasBike: true,
      remark: '',
      agreed: false
    },
    workTimes: [
      '周一至周五 上午',
      '周一至周五 下午',
      '周一至周五 晚上',
      '周末全天',
      '任意时间'
    ],
    workTimeIndex: 0,
    canSubmit: false
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
  },

  // 更新表单字段
  onNameInput: function(e) {
    this.setData({
      'form.name': e.detail.value
    });
    this.checkForm();
  },

  onPhoneInput: function(e) {
    this.setData({
      'form.phone': e.detail.value
    });
    this.checkForm();
  },

  onStudentIdInput: function(e) {
    this.setData({
      'form.studentId': e.detail.value
    });
    this.checkForm();
  },

  onMajorInput: function(e) {
    this.setData({
      'form.major': e.detail.value
    });
    this.checkForm();
  },

  onWorkTimeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      workTimeIndex: index,
      'form.workTime': this.data.workTimes[index]
    });
    this.checkForm();
  },

  setHasBike: function(e) {
    const hasBike = e.currentTarget.dataset.value === 'true';
    this.setData({
      'form.hasBike': hasBike
    });
  },

  onRemarkInput: function(e) {
    this.setData({
      'form.remark': e.detail.value
    });
  },

  toggleAgreement: function() {
    this.setData({
      'form.agreed': !this.data.form.agreed
    });
    this.checkForm();
  },

  // 检查表单是否可提交
  checkForm: function() {
    const { name, phone, studentId, major, workTime, agreed } = this.data.form;
    const canSubmit = name && phone && studentId && major && workTime && agreed;
    this.setData({
      canSubmit: canSubmit
    });
  },

  // 查看协议
  viewAgreement: function() {
    wx.showModal({
      title: '骑手服务协议',
      content: '此处为骑手服务协议内容，请在申请前仔细阅读。协议内容包括服务条款、责任划分、报酬结算等内容。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 提交申请
  submitApplication: function() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...',
    });

    // 模拟网络请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 在实际应用中，这里会将表单数据发送到服务器
      wx.showToast({
        title: '申请提交成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 2000);
  }
})
