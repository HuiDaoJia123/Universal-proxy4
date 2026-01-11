// pages/blacklist-management/blacklist-management.js
const api = require('../../utils/api.js')
 
Page({
  data: {
    blacklist: [],
    searchKeyword: '',
    filteredList: [],
    showAddModal: false,
    showRemoveModal: false,
    removeUserId: null,
    addForm: {
      username: '',
      reason: ''
    }
  },
 
  onLoad: function (options) {
    this.loadBlacklist()
  },
 
  onShow: function () {
    this.loadBlacklist()
  },
 
  // 加载黑名单数据
  loadBlacklist: function () {
    api.getBlacklist().then(response => {
      if (response.code === 200) {
        const blacklist = response.data.map(item => ({
          id: item.id,
          username: item.username,
          phone: this.formatPhone(item.phone || '13800138000'),
          reason: item.reason,
          created_at: this.formatDate(item.created_at)
        }))
 
        this.setData({
          blacklist: blacklist,
          filteredList: blacklist
        })
      } else {
        wx.showToast({
          title: response.msg || '加载失败',
          icon: 'error'
        })
      }
    }).catch(error => {
      console.error('加载黑名单失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    })
  },
 
  // 搜索输入
  onSearchInput: function (e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    this.filterBlacklist(keyword)
  },
 
  // 筛选黑名单
  filterBlacklist: function (keyword) {
    const { blacklist } = this.data
    if (!keyword) {
      this.setData({
        filteredList: blacklist
      })
      return
    }
 
    const filtered = blacklist.filter(item => 
      item.username.toLowerCase().includes(keyword.toLowerCase()) ||
      item.phone.includes(keyword)
    )
    
    this.setData({
      filteredList: filtered
    })
  },
 
  // 清除搜索
  clearSearch: function () {
    this.setData({
      searchKeyword: '',
      filteredList: this.data.blacklist
    })
  },
 
  // 显示添加弹窗
  showAddModal: function () {
    this.setData({
      showAddModal: true,
      addForm: {
        username: '',
        reason: ''
      }
    })
  },
 
  // 隐藏添加弹窗
  hideAddModal: function () {
    this.setData({
      showAddModal: false
    })
  },
 
  // 显示移除确认弹窗
  showRemoveConfirm: function (e) {
    const userId = e.currentTarget.dataset.id
    this.setData({
      showRemoveModal: true,
      removeUserId: userId
    })
  },
 
  // 隐藏移除确认弹窗
  hideRemoveModal: function () {
    this.setData({
      showRemoveModal: false,
      removeUserId: null
    })
  },
 
  // 阻止事件冒泡
  stopPropagation: function () {
    // 阻止弹窗内容点击事件冒泡
  },
 
  // 用户名输入
  onUsernameInput: function (e) {
    this.setData({
      'addForm.username': e.detail.value
    })
  },
 
  // 原因输入
  onReasonInput: function (e) {
    this.setData({
      'addForm.reason': e.detail.value
    })
  },
 
  // 添加到黑名单
  addToBlacklist: function () {
    const { username, reason } = this.data.addForm
 
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'error'
      })
      return
    }
 
    if (!reason.trim()) {
      wx.showToast({
        title: '请输入拉黑原因',
        icon: 'error'
      })
      return
    }
 
    api.addToBlacklist({
      username: username.trim(),
      reason: reason.trim()
    }).then(response => {
      if (response.code === 200) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        this.hideAddModal()
        this.loadBlacklist()
      } else {
        wx.showToast({
          title: response.msg || '添加失败',
          icon: 'error'
        })
      }
    }).catch(error => {
      console.error('添加黑名单失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    })
  },
 
  // 从黑名单移除
  removeFromBlacklist: function () {
    const userId = this.data.removeUserId
 
    api.removeFromBlacklist(userId).then(response => {
      if (response.code === 200) {
        wx.showToast({
          title: '移除成功',
          icon: 'success'
        })
        this.hideRemoveModal()
        this.loadBlacklist()
      } else {
        wx.showToast({
          title: response.msg || '移除失败',
          icon: 'error'
        })
      }
    }).catch(error => {
      console.error('移除黑名单失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    })
  },
 
  // 格式化手机号
  formatPhone: function (phone) {
    if (!phone) return ''
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  },
 
  // 格式化日期
  formatDate: function (dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
 
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? '刚刚' : `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days === 1) {
      return '昨天'
    } else if (days < 30) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  }
})