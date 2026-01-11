// frontend/theme/light.js
const lightTheme = {
  name: '浅色模式',
  code: 'light',
  colors: {
    primary: '#007AFF',
    secondary: '#34C759',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E5E5EA',
    shadow: 'rgba(0, 0, 0, 0.1)',
    accent: '#FF9500',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500'
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
 
module.exports = lightTheme;