// miniprogram/api/index.js

// 1. 从 utils/index.js 导入通用工具函数
import { showLoading, hideLoading, showError } from '../utils/index.js';

// 使用 127.0.0.1:8000
const BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * 封装 wx.request
 */
function request(url, data = {}, method = 'GET') {
  showLoading();

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      data: data,
      method: method,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          showError(`请求错误: ${res.statusCode}`);
          reject(res);
        }
      },
      fail(err) {
        showError('网络请求失败，请检查服务器是否运行在 http://127.0.0.1:8000');
        console.error('请求失败详情:', err);
        reject(err);
      },
      complete() {
        hideLoading();
      }
    });
  });
}

/**
 * 获取服务列表
 */
export function getServiceList() {
  const { serviceList } = require('../config/services.js');
  return Promise.resolve(serviceList);
}

/**
 * 用户登录
 */
export function userLogin(userInfo) {
  return request('/login/', userInfo, 'POST');
}

/**
 * 微信登录
 */
export function wechatLogin(code) {
  return request('/wechat/login/', { code }, 'POST');
}

/**
 * 获取欢迎页图片
 */
export function getWelcomeImage() {
  return request('/smart/welcome/', {}, 'GET');
}

export { request };