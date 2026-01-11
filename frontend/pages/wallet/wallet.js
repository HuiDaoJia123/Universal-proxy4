// pages/wallet/wallet.js
const api = require('../../utils/api.js');
 
Page({
  data: {
    walletInfo: {
      balance: 0,
      todayIncome: 0,
      totalIncome: 0,
      frozenAmount: 0
    },
    transactions: [],
    showWithdraw: false,
    withdrawAmount: '',
    bankCards: []
  },
 
  onLoad: function (options) {
    this.loadWalletData();
  },
 
  onShow: function () {
    this.loadWalletData();
  },
 
  // 加载钱包数据
  loadWalletData: function() {
    const userId = wx.getStorageSync('userId');
    
    if (!userId) {
      console.error('用户ID不存在');
      return;
    }
    
    // 调用后端API获取真实数据
    Promise.all([
      api.getWalletInfo(userId),
      api.getTransactions(userId),
      api.getBankCards(userId)
    ]).then(([walletRes, transactionsRes, cardsRes]) => {
      this.setData({
        walletInfo: walletRes.data,
        transactions: transactionsRes.data.transactions,
        bankCards: cardsRes.data
      });
    }).catch(error => {
      console.error('加载钱包数据失败:', error);
      // 降级到本地数据
      this.loadLocalData();
    });
  },
 
  // 降级到本地数据
  loadLocalData: function() {
    const walletInfo = wx.getStorageSync('walletInfo') || {
      balance: 156.80,
      todayIncome: 25.50,
      totalIncome: 568.30,
      frozenAmount: 30.00
    };
    
    const transactions = wx.getStorageSync('walletTransactions') || this.getDefaultTransactions();
    const bankCards = wx.getStorageSync('bankCards') || [];
    
    this.setData({
      walletInfo: walletInfo,
      transactions: transactions,
      bankCards: bankCards
    });
  },
 
  // 获取默认交易记录（保留作为降级方案）
  getDefaultTransactions: function() {
    return [
      {
        id: 1,
        type: 'income',
        amount: 25.50,
        title: '代取快递收入',
        time: '2023-05-20 10:30',
        status: 'completed'
      },
      {
        id: 2,
        type: 'withdraw',
        amount: 100.00,
        title: '提现到银行卡',
        time: '2023-05-19 15:20',
        status: 'completed'
      },
      {
        id: 3,
        type: 'income',
        amount: 12.00,
        title: '外卖代取收入',
        time: '2023-05-18 18:45',
        status: 'completed'
      },
      {
        id: 4,
        type: 'income',
        amount: 30.00,
        title: '代课服务收入',
        time: '2023-05-17 14:15',
        status: 'frozen'
      }
    ];
  },
 
  // 显示提现界面
  showWithdrawDialog: function() {
    if (this.data.walletInfo.balance <= 0) {
      wx.showToast({
        title: '余额不足',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showWithdraw: true,
      withdrawAmount: this.data.walletInfo.balance.toFixed(2)
    });
  },
 
  // 隐藏提现界面
  hideWithdrawDialog: function() {
    this.setData({
      showWithdraw: false,
      withdrawAmount: ''
    });
  },
 
  // 输入提现金额
  onWithdrawAmountInput: function(e) {
    const amount = e.detail.value;
    const balance = this.data.walletInfo.balance;
    
    if (parseFloat(amount) > balance) {
      wx.showToast({
        title: '超出可用余额',
        icon: 'none'
      });
      this.setData({
        withdrawAmount: balance.toFixed(2)
      });
      return;
    }
    
    this.setData({
      withdrawAmount: amount
    });
  },
 
  // 全部提现
  withdrawAll: function() {
    this.setData({
      withdrawAmount: this.data.walletInfo.balance.toFixed(2)
    });
  },
 
  // 确认提现
  confirmWithdraw: function() {
    const amount = parseFloat(this.data.withdrawAmount);
    
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入正确金额',
        icon: 'none'
      });
      return;
    }
    
    if (amount < 10) {
      wx.showToast({
        title: '最低提现金额10元',
        icon: 'none'
      });
      return;
    }
    
    if (amount > this.data.walletInfo.balance) {
      wx.showToast({
        title: '超出可用余额',
        icon: 'none'
      });
      return;
    }
    
    const userId = wx.getStorageSync('userId');
    
    // 使用真实的API调用
    api.withdraw({
      user_id: userId,
      amount: amount
    }).then(response => {
      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      });
      
      // 重新加载数据
      this.loadWalletData();
      
      // 关闭提现界面
      this.setData({
        showWithdraw: false,
        withdrawAmount: ''
      });
    }).catch(error => {
      console.error('提现失败:', error);
      wx.showToast({
        title: error.msg || '提现失败，请重试',
        icon: 'none'
      });
    });
  },
 
  // 查看交易详情
  viewTransactionDetail: function(e) {
    const transaction = e.currentTarget.dataset.transaction;
    
    let content = `类型：${transaction.type === 'income' ? '收入' : '提现'}\n`;
    content += `金额：${transaction.amount}元\n`;
    content += `说明：${transaction.title}\n`;
    content += `时间：${transaction.created_at || transaction.time}\n`;
    content += `状态：${this.getStatusText(transaction.status)}`;
    
    if (transaction.order_id) {
      content += `\n订单号：${transaction.order_id}`;
    }
    
    wx.showModal({
      title: '交易详情',
      content: content,
      showCancel: false,
      confirmText: '我知道了'
    });
  },
 
  // 获取状态文本
  getStatusText: function(status) {
    const statusMap = {
      'completed': '已完成',
      'processing': '处理中',
      'frozen': '冻结中',
      'pending': '待处理',
      'failed': '失败'
    };
    return statusMap[status] || '未知';
  },
 
  // 管理银行卡
  manageBankCards: function() {
    wx.navigateTo({
      url: '/pages/bank-card-management/bank-card-management'
    });
  },
 
  // 刷新数据
  onPullDownRefresh: function() {
    this.loadWalletData();
    wx.stopPullDownRefresh();
  }
});