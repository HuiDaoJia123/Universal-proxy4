Page({
  data: {
    addressList: [],
    isSelectMode: false, // 是否为选择模式
    currentAddressId: null, // 当前选中的地址ID
    fromPage: '' // 来源页面，用于返回时传递数据
  },

  onLoad(options) {
    // 获取传递的参数
    if (options.selectMode === 'true') {
      this.setData({
        isSelectMode: true
      });
    }
    if (options.fromPage) {
      this.setData({
        fromPage: options.fromPage
      });
    }

    this.loadAddressList();
  },

  onShow() {
    // 每次页面显示时重新加载地址列表
    this.loadAddressList();
  },

  // 加载地址列表
  loadAddressList() {
    // 从本地存储获取地址列表
    const addressList = wx.getStorageSync('addressList') || this.getDefaultAddresses();
    this.setData({ addressList });
  },

  // 获取默认地址数据（用于演示）
  getDefaultAddresses() {
    return [
      {
        id: 1,
        recipient: '张三',
        phone: '13800138000',
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detail: '大学城中山大学东校区',
        isDefault: true
      },
      {
        id: 2,
        recipient: '张三',
        phone: '13800138000',
        province: '广东省',
        city: '广州市',
        district: '越秀区',
        detail: '东风东路123号',
        isDefault: false
      }
    ];
  },

  // 添加新地址
  addNewAddress() {
    wx.navigateTo({
      url: '/pages/address-edit/address-edit?type=add'
    });
  },

  // 编辑地址 - 现在通过点击地址上半区域触发
  editAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/address-edit/address-edit?type=edit&id=${addressId}`
    });
  },

  // 删除地址
  deleteAddress(e) {
    // 移除 e.stopPropagation() 调用
    const addressId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteAddressRequest(addressId);
        }
      }
    });
  },

  // 删除地址请求
  deleteAddressRequest(addressId) {
    let addressList = this.data.addressList.filter(item => item.id !== addressId);
    
    // 如果删除了默认地址，设置第一个为默认
    const deletedIsDefault = this.data.addressList.find(item => item.id === addressId)?.isDefault;
    if (deletedIsDefault && addressList.length > 0) {
      addressList[0].isDefault = true;
    }

    this.setData({ addressList });
    wx.setStorageSync('addressList', addressList);
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
  },

  // 设置默认地址
  setDefault(e) {
    // 移除 e.stopPropagation() 调用
    const addressId = e.currentTarget.dataset.id;
    
    let addressList = this.data.addressList.map(item => ({
      ...item,
      isDefault: item.id === addressId
    }));

    this.setData({ addressList });
    wx.setStorageSync('addressList', addressList);
    
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },

  // 选择地址（选择模式）
  selectAddress(e) {
    if (!this.data.isSelectMode) return;

    const address = e.currentTarget.dataset.address;
    this.setData({
      currentAddressId: address.id
    });
  },

  // 确认选择
  confirmSelect() {
    if (!this.data.currentAddressId) {
      wx.showToast({
        title: '请选择一个地址',
        icon: 'none'
      });
      return;
    }

    const selectedAddress = this.data.addressList.find(item => item.id === this.data.currentAddressId);
    
    // 获取页面栈
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 上一个页面
    
    if (prevPage && prevPage.setSelectedAddress) {
      prevPage.setSelectedAddress(selectedAddress);
    }

    wx.navigateBack();
  }
});
