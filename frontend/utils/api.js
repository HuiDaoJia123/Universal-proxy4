// frontend/utils/api.js
const BASE_URL = 'https://xwydservice.cn/api';

// 临时AuthManager，如果没有独立的auth.js文件
const AuthManager = {
  getUserToken: function() {
    return wx.getStorageSync('token') || '';
  },
  
  saveUserInfo: function(user, token) {
    wx.setStorageSync('userInfo', user);
    wx.setStorageSync('token', token);
    wx.setStorageSync('userId', user.id);
  },
  
  updateUserInfo: function(userData) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    Object.assign(userInfo, userData);
    wx.setStorageSync('userInfo', userInfo);
  },
  
  clearAllUserData: function() {
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('userId');
  }
};

/**
 * 封装 wx.request，自动添加认证头
 * @param {string} url - 接口路径
 * @param {object} data - 请求参数
 * @param {string} method - 请求方法
 * @param {object} options - 额外选项
 * @return {Promise} - 返回一个 Promise 对象
 */
function request(url, data = {}, method = 'GET', options = {}) {
  return new Promise((resolve, reject) => {
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接不可用',
            icon: 'none'
          });
          reject({ message: '网络连接不可用' });
          return;
        }
        
        // 显示 loading 提示框（可配置不显示）
        if (!options.hideLoading) {
          wx.showLoading({
            title: options.loadingText || '加载中...',
          });
        }

        wx.request({
          url: `${BASE_URL}${url}`,
          data: data,
          method: method,
          timeout: options.timeout || 10000,
          header: {
            'Content-Type': 'application/json',
            'Authorization': AuthManager.getUserToken() || '',
            ...options.headers
          },
          success(res) {
            if (res.statusCode === 200) {
              if (res.data.code === 200) {
                resolve(res.data);
              } else {
                if (res.data.code === 401) {
                  AuthManager.clearAllUserData();
                  wx.showToast({
                    title: '登录已过期，请重新登录',
                    icon: 'none'
                  });
                  setTimeout(() => {
                    wx.redirectTo({
                      url: '/pages/login/login'
                    });
                  }, 1500);
                } else {
                  wx.showToast({
                    title: res.data.msg || '请求失败',
                    icon: 'none'
                  });
                }
                reject(res.data);
              }
            } else {
              wx.showToast({
                title: `请求错误: ${res.statusCode}`,
                icon: 'none'
              });
              reject(res);
            }
          },
          fail(err) {
            console.error('网络请求失败:', err);
            
            let errorMessage = options.errorMessage || '网络请求失败';
            if (err.errMsg && err.errMsg.includes('timeout')) {
              errorMessage = '请求超时，请重试';
            } else if (err.errMsg && err.errMsg.includes('connection refused')) {
              errorMessage = '服务器连接失败，请检查服务器状态';
            }
            
            wx.showToast({
              title: errorMessage,
              icon: 'none'
            });
            reject(err);
          },
          complete() {
            if (!options.hideLoading) {
              wx.hideLoading();
            }
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '无法获取网络状态',
          icon: 'none'
        });
        reject({ message: '无法获取网络状态' });
      }
    });
  });
}

// ===== 用户认证相关API =====

function userLogin(userInfo) {
  return request('/login/', userInfo, 'POST')
    .then(response => {
      AuthManager.saveUserInfo(response.data.user, response.data.token);
      return response;
    });
}

function userRegister(registerData) {
  return request('/register/', registerData, 'POST');
}

function getUserProfile(userId) {
  return request(`/user/${userId}/`, {}, 'GET');
}

function updateUserInfo(userData) {
  return request('/user/update/', userData, 'PUT')
    .then(response => {
      AuthManager.updateUserInfo(response.data.user);
      return response;
    });
}

function bindPhone(data) {
  return request('/auth/bind-phone/', data, 'POST')
    .then(response => {
      AuthManager.updateUserInfo({ phone: data.phone });
      return response;
    });
}

function sendVerificationCode(phone) {
  return request('/send-verification-code/', { phone }, 'POST');
}

// ===== 实名认证相关API =====

function submitRealNameAuth(authData) {
  return request('/auth/real-name/', authData, 'POST');
}

function getAuthStatus() {
  return request('/auth/real-name/status/', {}, 'GET');
}

function resubmitRealNameAuth(authData) {
  return request('/auth/real-name/resubmit/', authData, 'POST');
}

// ===== 服务申请相关API =====

function submitApplication(applicationData) {
  return request('/audit/', applicationData, 'POST')
    .then(response => {
      const applicationKey = `application_${applicationData.audit_type}`;
      wx.setStorageSync(applicationKey, {
        ...applicationData,
        id: response.data.application_id,
        status: 'pending',
        submitTime: new Date().toLocaleString()
      });
      return response;
    });
}

function getApplicationStatus(applicationId) {
  return request(`/audit/${applicationId}/status/`, {}, 'GET');
}

function getUserApplications(params = {}) {
  return request('/audit/', params, 'GET');
}

function withdrawApplication(applicationId) {
  return request(`/audit/${applicationId}/withdraw/`, {}, 'POST');
}

// ===== 黑名单管理API =====

function getBlacklist(params = {}) {
  return request('/blacklist/', params, 'GET');
}

function addToBlacklist(data) {
  return request('/blacklist/', data, 'POST');
}

function removeFromBlacklist(userId) {
  return request(`/blacklist/${userId}/remove/`, {}, 'POST');
}

function checkBlacklist(username) {
  return request('/blacklist/check/', { username }, 'POST');
}

// ===== 审核管理API =====

function getAuditApplications(params = {}) {
  return request('/audit/', params, 'GET');
}

function approveApplication(applicationId) {
  return request(`/audit/${applicationId}/approve/`, {}, 'POST');
}

function rejectApplication(applicationId, data = {}) {
  return request(`/audit/${applicationId}/reject/`, data, 'POST');
}

// ===== 订单管理API =====

function submitSubstituteOrder(orderData) {
  return request('/orders/substitute/', orderData, 'POST');
}

function getOrders(params = {}) {
  return request('/orders/', params, 'GET');
}

function getOrderDetail(orderId) {
  return request(`/orders/${orderId}/`, {}, 'GET');
}

function acceptOrder(orderId) {
  return request(`/orders/${orderId}/accept/`, {}, 'POST');
}

function cancelOrder(orderId, data = {}) {
  return request(`/orders/${orderId}/cancel/`, data, 'POST');
}

// ===== 文件上传API =====

/**
 * 上传图片
 * @param {string} filePath - 图片临时路径
 * @param {object} options - 上传选项，包括formData等
 * @returns {Promise}
 */
function uploadImage(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    // 显示上传中提示
    if (!options.hideLoading) {
      wx.showLoading({
        title: options.loadingText || '上传中...',
      });
    }
    
    // 将options参数转换为formData
    const formData = {
      ...options, // 直接将options中的参数作为formData
      ...options.formData // 如果提供了formData属性，则覆盖
    };
    
    // 移除非formData的属性
    delete formData.hideLoading;
    delete formData.loadingText;
    delete formData.timeout;
    
    wx.uploadFile({
      url: `${BASE_URL}/upload/image/`,
      filePath: filePath,
      name: 'image',
      formData: formData,
      header: {
        'Authorization': AuthManager.getUserToken() || '',
      },
      timeout: options.timeout || 30000,
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            resolve(data);
          } else {
            wx.showToast({
              title: data.msg || '上传失败',
              icon: 'none'
            });
            reject(data);
          }
        } catch (error) {
          console.error('解析上传响应失败:', error);
          wx.showToast({
            title: '上传响应解析失败',
            icon: 'none'
          });
          reject(error);
        }
      },
      fail(err) {
        console.error('文件上传失败:', err);
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
        reject(err);
      },
      complete() {
        if (!options.hideLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

// ===== 工具函数 =====

function checkNetworkStatus() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success(res) {
        resolve(res.networkType !== 'none');
      },
      fail() {
        resolve(false);
      }
    });
  });
}

function batchRequests(requests) {
  return Promise.all(requests.map(req => {
    const { url, data, method, options } = req;
    return request(url, data, method, options);
  }));
}

// ===== 钱包相关API =====

function getWalletInfo(userId) {
  return request('/wallet/', { user_id: userId }, 'GET');
}

function withdraw(data) {
  return request('/wallet/withdraw/', data, 'POST');
}

function getTransactions(userId, page = 1, pageSize = 20) {
  return request('/wallet/transactions/', {
    user_id: userId,
    page: page,
    page_size: pageSize
  }, 'GET');
}

function getBankCards(userId) {
  return request('/wallet/bank-cards/', { user_id: userId }, 'GET');
}

function addBankCard(cardData) {
  return request('/wallet/bank-cards/', cardData, 'POST');
}

function deleteBankCard(cardId) {
  return request(`/wallet/bank-cards/${cardId}/`, {}, 'DELETE');
}

function setDefaultBankCard(cardId) {
  return request(`/wallet/bank-cards/${cardId}/set-default/`, {}, 'POST');
}

// ===== 通知相关API =====

function notifications(params) {
  return request('/notifications/', params, 'GET');
}

function createNotification(notificationData) {
  return request('/notifications/', notificationData, 'POST');
}

function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read/`, {}, 'POST');
}

// ===== 对话相关API =====

function conversations(params) {
  return request('/conversations/', params, 'GET');
}

function createConversation(conversationData) {
  return request('/conversations/', conversationData, 'POST');
}

function messages(conversationId, params = {}) {
  return request(`/conversations/${conversationId}/messages/`, params, 'GET');
}

function sendMessage(conversationId, messageData) {
  return request(`/conversations/${conversationId}/messages/`, messageData, 'POST');
}

// ===== 公告相关API =====

/**
 * 获取公告列表
 * @returns {Promise}
 */
function getAnnouncements() {
  return request('/announcements/', {}, 'GET');
}

/**
 * 根据类型获取公告
 * @param {string} type - 公告类型
 * @returns {Promise}
 */
function getAnnouncementByType(type) {
  return request(`/announcements/${type}/`, {}, 'GET');
}

// ===== 支付相关API =====

/**
 * 创建支付订单
 * @param {object} paymentData - 支付数据
 * @returns {Promise}
 */
function createPaymentOrder(paymentData) {
  return request('/payment/create/', paymentData, 'POST');
}

/**
 * 查询支付状态
 * @param {string} orderNo - 订单号
 * @returns {Promise}
 */
function queryPaymentStatus(orderNo) {
  return request(`/payment/status/${orderNo}/`, {}, 'GET');
}

/**
 * 微信支付
 * @param {object} paymentParams - 微信支付参数
 * @returns {Promise}
 */
function requestWeChatPayment(paymentParams) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: paymentParams.timeStamp,
      nonceStr: paymentParams.nonceStr,
      package: paymentParams.package,
      signType: 'RSA',
      paySign: paymentParams.paySign,
      success(res) {
        console.log('支付成功', res);
        resolve(res);
      },
      fail(err) {
        console.error('支付失败', err);
        
        let errorMsg = '支付失败';
        if (err.errMsg.includes('requestPayment:fail cancel')) {
          errorMsg = '用户取消支付';
        } else if (err.errMsg.includes('requestPayment:fail')) {
          errorMsg = '支付过程中出现错误';
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
        
        reject(err);
      }
    });
  });
}

module.exports = {
  BASE_URL, 
  request,
  // 用户认证
  userLogin,
  userRegister,
  getUserProfile,
  updateUserInfo,
  bindPhone,
  sendVerificationCode,
  // 实名认证
  submitRealNameAuth,
  getAuthStatus,
  resubmitRealNameAuth,
  // 服务申请
  submitApplication,
  getApplicationStatus,
  getUserApplications,
  withdrawApplication,
  // 黑名单管理
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  checkBlacklist,
  // 审核管理
  getAuditApplications,
  approveApplication,
  rejectApplication,
  // 订单管理
  submitSubstituteOrder,
  getOrders,
  getOrderDetail,
  acceptOrder,
  cancelOrder,
  // 文件上传
  uploadImage,
  // 工具函数
  checkNetworkStatus,
  batchRequests,
  // 钱包相关
  getWalletInfo,
  withdraw,
  getTransactions,
  getBankCards,
  addBankCard,
  deleteBankCard,
  setDefaultBankCard,
  // 通知相关
  notifications,
  createNotification,
  markNotificationRead,
  // 对话相关
  conversations,
  createConversation,
  messages,
  sendMessage,
  // 公告相关
  getAnnouncements,
  getAnnouncementByType,
  // 支付相关
  createPaymentOrder,
  queryPaymentStatus,
  requestWeChatPayment
};