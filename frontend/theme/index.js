// frontend/theme/index.js
const lightTheme = require('./light.js');
const darkTheme = require('./dark.js');
 
const themes = {
  'light': lightTheme,
  'dark': darkTheme
};
 
// 主题名称映射
const themeNames = {
  '浅色模式': 'light',
  '深色模式': 'dark',
  '自动模式': 'auto'
};
 
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'light';
    this.currentThemeName = this.getThemeNameFromStorage() || '浅色模式';
    this.theme = themes[this.currentTheme];
  }
 
  // 从存储获取主题
  getStoredTheme() {
    return wx.getStorageSync('appTheme');
  }
 
  // 从存储获取主题显示名
  getThemeNameFromStorage() {
    return wx.getStorageSync('appThemeName');
  }
 
  // 保存主题设置
  setTheme(themeCode, themeName) {
    this.currentTheme = themeCode;
    this.currentThemeName = themeName;
    this.theme = themes[themeCode];
    
    wx.setStorageSync('appTheme', themeCode);
    wx.setStorageSync('appThemeName', themeName);
    
    // 保存到appSettings中（保持兼容性）
    const settings = wx.getStorageSync('appSettings') || {};
    settings.theme = themeName;
    wx.setStorageSync('appSettings', settings);
    
    // 应用主题到页面
    this.applyTheme();
  }
 
  // 应用主题到页面
  applyTheme() {
    // 这里可以通过全局数据或者事件通知所有页面更新主题
    try {
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.currentTheme = this.theme;
        app.globalData.currentThemeCode = this.currentTheme;
        console.log('主题已应用:', this.currentThemeName);
      }
    } catch (e) {
      console.warn('应用主题时出错:', e);
    }
  }
 
  // 获取主题变量
  getThemeVariable(path) {
    const keys = path.split('.');
    let value = this.theme;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  }
 
  // 获取当前主题
  getCurrentTheme() {
    return this.theme;
  }
 
  // 获取当前主题代码
  getCurrentThemeCode() {
    return this.currentTheme;
  }
 
  // 获取当前主题名
  getCurrentThemeName() {
    return this.currentThemeName;
  }
 
  // 获取所有可用主题
  getAvailableThemes() {
    return Object.keys(themeNames);
  }
 
  // 根据显示名获取主题代码
  getThemeCode(themeName) {
    return themeNames[themeName];
  }
 
  // 自动主题（根据系统设置）
  setAutoTheme() {
    // 小程序中可以通过系统信息获取
    const systemInfo = wx.getSystemInfoSync();
    const theme = systemInfo.theme; // 'light' or 'dark'
    
    if (theme) {
      this.setTheme(theme, theme === 'light' ? '浅色模式' : '深色模式');
    }
  }
}
 
// 创建单例实例
const themeManager = new ThemeManager();
 
// 使用 CommonJS 导出
module.exports = themeManager;