// frontend/i18n/index.js
const zhCN = require('./zh-CN.js');
const zhTW = require('./zh-TW.js');
const enUS = require('./en-US.js');
 
const languages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS
};
 
// 语言代码映射
const languageCodes = {
  '简体中文': 'zh-CN',
  'English': 'en-US', 
  '繁體中文': 'zh-TW'
};
 
class I18n {
  constructor() {
    this.currentLanguage = this.getStoredLanguage() || 'zh-CN';
    this.currentLocale = this.getLocaleFromStorage() || '简体中文';
    this.translations = languages[this.currentLanguage];
  }
 
  // 从存储获取语言
  getStoredLanguage() {
    return wx.getStorageSync('appLanguage');
  }
 
  // 从存储获取语言显示名称
  getLocaleFromStorage() {
    return wx.getStorageSync('appLocale');
  }
 
  // 保存语言设置
  setLanguage(languageCode, localeName) {
    this.currentLanguage = languageCode;
    this.currentLocale = localeName;
    this.translations = languages[languageCode];
    
    wx.setStorageSync('appLanguage', languageCode);
    wx.setStorageSync('appLocale', localeName);
    
    // 保存到appSettings中（保持兼容性）
    const settings = wx.getStorageSync('appSettings') || {};
    settings.language = localeName;
    wx.setStorageSync('appSettings', settings);
  }
 
  // 获取翻译文本
  t(key) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }
 
  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLanguage;
  }
 
  // 获取当前语言显示名
  getCurrentLocale() {
    return this.currentLocale;
  }
 
  // 获取所有可用语言
  getAvailableLanguages() {
    return Object.keys(languageCodes);
  }
 
  // 根据显示名获取语言代码
  getLanguageCode(localeName) {
    return languageCodes[localeName];
  }
}
 
// 创建单例实例
const i18n = new I18n();
 
module.exports = i18n;