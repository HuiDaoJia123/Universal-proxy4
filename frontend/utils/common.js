// miniprogram/utils/common.js

/**
 * 格式化日期
 * @param {string} dateString - 例如: '2024-05-20T10:30:00Z'
 * @return {string} - 例如: '2024年5月20日'
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() 返回 0-11
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 验证手机号格式
 * @param {string} phone - 手机号字符串
 * @return {boolean} - 是否合法
 */
function isPhoneValid(phone) {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
}

// 非常重要：将函数暴露出去，供其他文件调用
module.exports = {
  formatDate: formatDate,
  isPhoneValid: isPhoneValid
};