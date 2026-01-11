// pages/apply-substitute/apply-substitute.js
Page({
  onLoad: function(options) {
    console.log('代课同学申请页面加载');
    
    // 直接跳转到通用的申请审核页面，并传递类型参数
    wx.redirectTo({
      url: '/pages/apply-audit/apply-audit?type=teacher'
    });
  }
});