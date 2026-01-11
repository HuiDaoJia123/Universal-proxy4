// pages/test/test.js
Page({
  data: {
    result: '点击按钮开始测试'
  },

  // 测试服务器连接
  testConnection() {
    this.showLoading('测试中...');
    
    wx.request({
      url: 'http://127.0.0.1:8000/smart/test/',
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        console.log('测试响应:', res.data);
        
        if (res.data.code === 200) {
          wx.showToast({
            title: '服务器连接成功！',
            icon: 'success'
          });
          
          this.setData({
            result: JSON.stringify(res.data, null, 2)
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('连接失败:', err);
        
        wx.showModal({
          title: '连接失败',
          content: '请按以下步骤检查：\n\n1. 检查Django服务器是否运行\n2. 在终端执行：python manage.py runserver 127.0.0.1:8000\n3. 检查防火墙设置',
          showCancel: false
        });
        
        this.setData({
          result: '连接失败：' + JSON.stringify(err)
        });
      }
    });
  },

  // 测试登录
  testLogin() {
    this.showLoading('登录中...');
    
    wx.request({
      url: 'http://127.0.0.1:8000/smart/login/',
      method: 'POST',
      data: {
        username: 'test',
        password: '123456'
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        console.log('登录响应:', res.data);
        
        if (res.data.code === 200) {
          wx.showToast({
            title: '登录成功！',
            icon: 'success'
          });
          
          this.setData({
            result: JSON.stringify(res.data, null, 2)
          });
          
          // 保存token
          wx.setStorageSync('token', res.data.data.token);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('登录失败:', err);
      }
    });
  },

  // 测试欢迎页图片
  testWelcome() {
    this.showLoading('获取图片中...');
    
    wx.request({
      url: 'http://127.0.0.1:8000/smart/welcome/',
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        console.log('欢迎页响应:', res.data);
        
        this.setData({
          result: JSON.stringify(res.data, null, 2)
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取失败:', err);
      }
    });
  },

  showLoading(title) {
    wx.showLoading({
      title: title,
      mask: true
    });
  }
});