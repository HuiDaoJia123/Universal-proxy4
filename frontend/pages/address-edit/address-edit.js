Page({
  data: {
    isEditing: false,
    formData: {
      id: null,
      recipient: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    },
    region: [],
    isFormValid: false
  },

  onLoad(options) {
    const { type, id } = options;
    this.setData({
      isEditing: type === 'edit'
    });

    if (this.data.isEditing && id) {
      this.loadAddressData(parseInt(id));
    } else {
      this.initForm();
    }
    this.validateForm();
  },

  loadAddressData(id) {
    const addressList = wx.getStorageSync('addressList') || [];
    const address = addressList.find(item => item.id === id);
    
    if (address) {
      this.setData({
        formData: { ...address },
        region: [address.province, address.city, address.district]
      });
    } else {
      wx.showToast({
        title: '地址不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  initForm() {
    this.setData({
      formData: {
        id: Date.now(),
        recipient: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        isDefault: false
      },
      region: []
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    }, () => {
      this.validateForm();
    });
  },

  onRegionChange(e) {
    const { value } = e.detail;
    const [province, city, district] = value;
    
    this.setData({
      region: value,
      'formData.province': province,
      'formData.city': city,
      'formData.district': district
    }, () => {
      this.validateForm();
    });
  },

  toggleDefault() {
    this.setData({
      'formData.isDefault': !this.data.formData.isDefault
    });
  },

  validateForm() {
    const { recipient, phone, province, city, district, detail } = this.data.formData;
    
    const isValid = recipient.trim() && 
                   phone.trim() && 
                   phone.length === 11 &&
                   province && 
                   city && 
                   district && 
                   detail.trim();
    
    this.setData({
      isFormValid: isValid
    });
  },

  saveAddress(e) {
    if (!this.data.isFormValid) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (!this.validatePhone(this.data.formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
    });

    setTimeout(() => {
      this.saveAddressToStorage();
      wx.hideLoading();
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1000);
  },

  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  saveAddressToStorage() {
    let addressList = wx.getStorageSync('addressList') || [];
    const { formData, isEditing } = this.data;

    if (isEditing) {
      addressList = addressList.map(item => 
        item.id === formData.id ? formData : item
      );
    } else {
      if (addressList.length === 0) {
        formData.isDefault = true;
      }
      
      if (formData.isDefault) {
        addressList = addressList.map(item => ({
          ...item,
          isDefault: false
        }));
      }
      
      addressList.push(formData);
    }

    wx.setStorageSync('addressList', addressList);
  },

  deleteAddress() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.deleteAddressRequest();
        }
      }
    });
  },

  deleteAddressRequest() {
    wx.showLoading({
      title: '删除中...',
    });

    setTimeout(() => {
      let addressList = wx.getStorageSync('addressList') || [];
      addressList = addressList.filter(item => item.id !== this.data.formData.id);

      const deletedIsDefault = this.data.formData.isDefault;
      if (deletedIsDefault && addressList.length > 0) {
        addressList[0].isDefault = true;
      }

      wx.setStorageSync('addressList', addressList);
      wx.hideLoading();

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1000);
  },

  onRecipientInput(e) {
    this.setData({
      'formData.recipient': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  onDetailInput(e) {
    this.setData({
      'formData.detail': e.detail.value
    }, () => {
      this.validateForm();
    });
  }
});