const api = require('../../utils/api.js');
 
Page({
  data: {
    second: 5,
    images: [], // 支持多张图片轮播
    currentImageIndex: 0,
    timer: null,
    loading: true
  },
  
  doJump() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    wx.switchTab({
      url: '/pages/index/index',
    });
  },
 
  onLoad(options) {
    this.loadWelcomeImages();
    this.startCountdown();
  },
 
  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },
 
  // 加载欢迎页图片
  loadWelcomeImages() {
    // 获取后端配置的图片列表
    wx.request({
      url: 'https://xwydservice.cn/smart/welcome/images/',
      method: 'GET',
      success: (res) => {
        console.log('欢迎页请求成功:', res.data);
        if (res.data.code == 200 && res.data.data && res.data.data.length > 0) {
          this.setData({
            images: res.data.data,
            currentImageIndex: 0,
            loading: false
          });
          
          // 如果有多张图片，启动自动轮播
          if (res.data.data.length > 1) {
            this.startImageCarousel();
          }
        } else {
          // 使用默认图片
          this.setData({
            images: [{ url: '/images/bg/splash.png' }],
            loading: false
          });
        }
      },
      fail: (error) => {
        console.error('欢迎页请求失败:', error);
        // 使用默认图片
        this.setData({
          images: [{ url: '/images/bg/splash.png' }],
          loading: false
        });
      }
    });
  },
 
  // 图片轮播
  startImageCarousel() {
    setInterval(() => {
      let newIndex = (this.data.currentImageIndex + 1) % this.data.images.length;
      this.setData({
        currentImageIndex: newIndex
      });
    }, 3000); // 每3秒切换一次
  },
 
  startCountdown() {
    let timer = setInterval(() => {
      if (this.data.second <= 1) {
        clearInterval(timer);
        this.goToIndex();
      } else {
        this.setData({
          second: this.data.second - 1
        });
      }
    }, 1000);
    
    this.setData({ timer });
  },
 
  goToIndex() {
    wx.switchTab({
      url: '/pages/index/index',
    });
  }
});