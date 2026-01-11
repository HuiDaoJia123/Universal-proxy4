// frontend/utils/i18n-utils.js
// 获取当前应用的实例
let app = null;
 
// 延迟获取 app 实例，确保 app 已经初始化
function getAppInstance() {
  if (!app) {
    try {
      app = getApp();
    } catch (e) {
      console.warn('getApp() 调用失败:', e);
      return null;
    }
  }
  return app;
}
 
/**
 * 获取翻译文本的便捷函数
 * @param {string} key - 翻译键值
 * @returns {string} 翻译后的文本
 */
export function t(key) {
  const currentApp = getAppInstance();
  if (!currentApp || !currentApp.globalData || !currentApp.globalData.i18n) {
    return key; // 如果app还未初始化，返回原键值
  }
  return currentApp.globalData.i18n.t(key);
}
 
/**
 * 获取当前主题变量
 * @param {string} path - 主题变量路径
 * @returns {any} 主题变量值
 */
export function getThemeVar(path) {
  const currentApp = getAppInstance();
  if (!currentApp || !currentApp.globalData || !currentApp.globalData.themeManager) {
    return null;
  }
  return currentApp.globalData.themeManager.getThemeVariable(path);
}
 
/**
 * 获取当前主题
 * @returns {object} 当前主题对象
 */
export function getCurrentTheme() {
  const currentApp = getAppInstance();
  if (!currentApp || !currentApp.globalData || !currentApp.globalData.themeManager) {
    return null;
  }
  return currentApp.globalData.themeManager.getCurrentTheme();
}
 
/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
export function getCurrentLanguage() {
  const currentApp = getAppInstance();
  if (!currentApp || !currentApp.globalData || !currentApp.globalData.i18n) {
    return 'zh-CN';
  }
  return currentApp.globalData.i18n.getCurrentLanguage();
}
 
/**
 * 获取当前语言显示名称
 * @returns {string} 当前语言显示名称
 */
export function getCurrentLocale() {
  const currentApp = getAppInstance();
  if (!currentApp || !currentApp.globalData || !currentApp.globalData.i18n) {
    return '简体中文';
  }
  return currentApp.globalData.i18n.getCurrentLocale();
}
 
/**
 * 切换语言的便捷函数
 * @param {string} languageCode - 语言代码
 * @param {string} localeName - 语言显示名称
 */
export function changeLanguage(languageCode, localeName) {
  const currentApp = getAppInstance();
  if (currentApp && currentApp.globalData && currentApp.globalData.i18n) {
    currentApp.globalData.i18n.setLanguage(languageCode, localeName);
  }
}
 
/**
 * 切换主题的便捷函数
 * @param {string} themeCode - 主题代码
 * @param {string} themeName - 主题显示名称
 */
export function changeTheme(themeCode, themeName) {
  const currentApp = getAppInstance();
  if (currentApp && currentApp.globalData && currentApp.globalData.themeManager) {
    currentApp.globalData.themeManager.setTheme(themeCode, themeName);
  }
}