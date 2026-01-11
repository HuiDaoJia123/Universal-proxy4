// frontend/theme/dark.js
const darkTheme = {
  name: '深色模式',
  code: 'dark',
  colors: {
    primary: '#0A84FF',
    secondary: '#30D158',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    shadow: 'rgba(255, 255, 255, 0.1)',
    accent: '#FF9F0A',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A'
  },
  fonts: {
    primary: 'PingFang SC, sans-serif',
    size: {
      small: '12px',
      medium: '14px',
      large: '16px', 
      xlarge: '18px'
    }
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px'
  }
};
 
module.exports = darkTheme;