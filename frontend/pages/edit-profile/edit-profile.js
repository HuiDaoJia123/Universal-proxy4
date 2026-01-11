// pages/edit-profile/edit-profile.js
const AuthManager = require('../../utils/auth.js');
const api = require('../../utils/api.js');

Page({
  data: {
    // 表单数据
    formData: {
      avatar_url: '',
      name: '',
      gender: 'male',
      phone: '',
      school: '',
      college: '',
      major: '',
      studentId: '',
      bio: ''
    },
    
    // 学校-学院-专业数据
    schools: [
      {
        name: '黑龙江农业工程职业学院(南岗校区)',
        colleges: [
          {
            name: '农业装备学院',
            majors: ['现代农业装备应用技术', '设施农业与装备', '花卉生产与花艺', '无人机应用技术']
          },
          {
            name: '机械工程学院',
            majors: ['数控技术', '智能焊接技术', '模具设计与制造']
          },
          {
            name: '汽车工程学院',
            majors: ['智能网联汽车技术', '汽车制造与试验技术', '汽车技术服务与营销', '汽车检测与维修技术']
          },
          {
            name: '信息工程学院',
            majors: ['计算机网络技术', '软件技术', '数字媒体技术', '大数据技术']
          },
          {
            name: '智能工程学院',
            majors: ['智能控制技术', '机电一体化技术', '工业机器人技术', '电气自动化技术', '电子信息工程技术']
          }
        ]
      },
      {
        name: '黑龙江农业工程职业学院(松北校区)',
        colleges: [
          {
            name: '动物科技学院',
            majors: ['宠物养护与驯导', '水产养殖技术']
          },
          {
            name: '动物医学学院',
            majors: ['动物防疫与检疫', '宠物医疗技术']
          },
          {
            name: '经济管理学院',
            majors: ['金融服务与管理', '市场营销', '电子商务', '现代物流管理', '冷链物流技术与管理']
          },
          {
            name: '农学院',
            majors: ['种子生产与经营', '作物生产与经营管理', '园艺技术', '食品智能加工技术', '食品检验检测技术', '食品药品监督管理']
          },
          {
            name: '人文艺术学院',
            majors: ['旅游管理', '酒店管理与数字化运营', '广告艺术设计', '室内艺术设计']
          },
          {
            name: '生物制药学院',
            majors: ['药品质量与安全', '药品经营与管理', '中药学']
          },
          {
            name: '水利与建筑工程学院',
            majors: ['工程测量技术', '建筑室内设计', '工程造价', '水利水电工程技术', '水利水电工程智能管理']
          }
        ]
      },
      {
        name: '广州华商职业学院',
        colleges: [
          {
            name: '数字商务学院',
            majors: ['电子商务']
          },
          {
            name: '数字财经学院',
            majors: ['工商企业管理', '大数据与会计']
          },
          {
            name: '人工智能与数据学院',
            majors: ['计算机网络技术', '数字媒体技术']
          },
          {
            name: '教育学院',
            majors: ['学前教育']
          },
          {
            name: '建筑与艺术学院',
            majors: ['动漫设计']
          },
          {
            name: '健康医学院',
            majors: ['护理', '健康管理', '康复治疗技术', '口腔医学技术', '眼视光技术', '医学美容技术', '中医养生保健']
          },
          {
            name: '酒店管理学院',
            majors: ['酒店管理与数字化运营', '旅游管理', '烹饪工艺与营养', '中西面点工艺', '西式烹饪工艺']
          },
          {
            name: '国际教育学院',
            majors: [
              '大数据与会计(菁英班)',
              '电气自动化技术(专才班)',
              '计算机网络技术(菁英班)',
              '金融服务与管理(菁英班)',
              '市场营销(菁英班)',
              '数字媒体艺术设计(专才班)',
              '学前教育(创新班)',
              '护理(创新班)',
              '新能源汽车技术(菁英班)'
            ]
          }
        ]
      }
    ],
    
    currentColleges: [], // 当前选中学校的学院列表
    currentMajors: [],  // 当前选中学院的专业列表
    
    // 选择器显示状态
    showSchoolSelector: false,
    showCollegeSelector: false,
    showMajorSelector: false,
    
    formStatus: {
      canSave: false,
      isSaving: false
    },
    
    userId: '' // 用户ID
  },

  onLoad: function() {
    console.log('编辑资料页加载完成');
    
    // 获取用户信息
    const userInfo = AuthManager.getUserInfo();
    if (userInfo) {
      this.setData({
        userId: userInfo.id,
        'formData.avatar_url': userInfo.avatar_url || userInfo.avatar || '',
        'formData.name': userInfo.name || userInfo.real_name || '',
        'formData.gender': userInfo.gender || 'male',
        'formData.phone': userInfo.phone || '',
        'formData.school': userInfo.school || '',
        'formData.college': userInfo.college || '',
        'formData.major': userInfo.major || '',
        'formData.studentId': userInfo.studentId || userInfo.student_id || '',
        'formData.bio': userInfo.bio || ''
      });
      
      // 如果已选择学校，则初始化对应的学院和专业列表
      if (this.data.formData.school) {
        this.initSchoolData();
      }
    }
    
    this.checkFormValidity(); // 初始化表单有效性
  },

  // 初始化学校对应的学院和专业数据
  initSchoolData: function() {
    const { school, college } = this.data.formData;
    let colleges = [];
    let majors = [];
    
    // 查找对应的学校
    for (let schoolItem of this.data.schools) {
      if (schoolItem.name === school) {
        colleges = schoolItem.colleges || [];
        break;
      }
    }
    
    // 如果已有选择的学院，查找对应的专业
    if (college && colleges.length > 0) {
      for (let collegeItem of colleges) {
        if (collegeItem.name === college) {
          majors = collegeItem.majors || [];
          break;
        }
      }
    }
    
    this.setData({
      currentColleges: colleges,
      currentMajors: majors
    });
  },

  // 输入处理
  handleNameInput: function(e) {
    this.setData({
      'formData.name': e.detail.value
    }, () => this.checkFormValidity());
  },
  
  handlePhoneInput: function(e) {
    this.setData({
      'formData.phone': e.detail.value
    }, () => this.checkFormValidity());
  },
  
  handleStudentIdInput: function(e) {
    this.setData({
      'formData.studentId': e.detail.value
    }, () => this.checkFormValidity());
  },

  // 选择性别
  selectGender: function(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender
    }, () => this.checkFormValidity());
  },

  // 选择头像（使用 chooseMedia API）
  chooseAvatar: function() {
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示上传中
        wx.showLoading({
          title: '上传中...'
        });
        
        // 上传图片
        api.uploadImage(tempFilePath, {
          user_id: that.data.userId,
          type: 'avatar'
        }).then(function(uploadRes) {
          wx.hideLoading();
          
          if (uploadRes.code === 200 && uploadRes.data && uploadRes.data.url) {
            that.setData({
              'formData.avatar_url': uploadRes.data.url
            });
            
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: uploadRes.message || '上传失败',
              icon: 'none'
            });
          }
        }).catch(function(err) {
          wx.hideLoading();
          console.error('上传失败:', err);
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        });
      },
      fail: function(err) {
        console.error('选择图片失败:', err);
      }
    });
  },

  // 个人简介变更
  handleBioChange: function(e) {
    this.setData({
      'formData.bio': e.detail.value
    });
  },

  // 显示学校选择器
  showSchoolPicker: function() {
    this.setData({
      showSchoolSelector: true,
      showCollegeSelector: false,
      showMajorSelector: false
    });
  },

  // 显示学院选择器（需先选学校）
  showCollegePicker: function() {
    if (!this.data.formData.school) {
      wx.showToast({ 
        title: '请先选择学校', 
        icon: 'none',
        duration: 1500
      });
      return;
    }
    this.setData({
      showCollegeSelector: true,
      showSchoolSelector: false,
      showMajorSelector: false
    });
  },

  // 显示专业选择器（需先选学院）
  showMajorPicker: function() {
    if (!this.data.formData.college) {
      wx.showToast({ 
        title: '请先选择学院', 
        icon: 'none',
        duration: 1500
      });
      return;
    }
    this.setData({
      showMajorSelector: true,
      showSchoolSelector: false,
      showCollegeSelector: false
    });
  },

  // 关闭所有选择器
  closeAllPickers: function() {
    this.setData({
      showSchoolSelector: false,
      showCollegeSelector: false,
      showMajorSelector: false
    });
  },

  // 选择学校（联动加载对应学院）
  selectSchool: function(e) {
    const index = e.currentTarget.dataset.index;
    const selectedSchool = this.data.schools[index];
    
    // 查找对应的学院
    let colleges = [];
    for (let school of this.data.schools) {
      if (school.name === selectedSchool.name) {
        colleges = school.colleges;
        break;
      }
    }
    
    this.setData({
      'formData.school': selectedSchool.name,
      'formData.college': '', // 清空之前选择的学院
      'formData.major': '',   // 清空之前选择的专业
      currentColleges: colleges, // 加载对应学院
      currentMajors: [],      // 清空专业列表
      showSchoolSelector: false
    }, () => this.checkFormValidity());
  },

  // 选择学院（联动加载对应专业）
  selectCollege: function(e) {
    const index = e.currentTarget.dataset.index;
    const selectedCollege = this.data.currentColleges[index];
    
    this.setData({
      'formData.college': selectedCollege.name,
      'formData.major': '', // 清空之前选择的专业
      currentMajors: selectedCollege.majors || [], // 加载对应专业
      showCollegeSelector: false
    }, () => this.checkFormValidity());
  },

  // 选择专业
  selectMajor: function(e) {
    const index = e.currentTarget.dataset.index;
    const selectedMajor = this.data.currentMajors[index];
    
    this.setData({
      'formData.major': selectedMajor,
      showMajorSelector: false
    }, () => this.checkFormValidity());
  },

  // 验证表单有效性（姓名/性别/手机号/学号必填）
  checkFormValidity: function() {
    const { name, gender, phone, studentId } = this.data.formData;
    const isPhoneValid = /^1[3-9]\d{9}$/.test(phone); // 手机号正则验证
    const canSave = name && name.trim() && gender && isPhoneValid && studentId && studentId.trim();
    
    this.setData({
      'formStatus.canSave': canSave
    });
  },

  // 保存资料
  saveProfile: function() {
    const that = this;
    const { formData } = this.data;
    
    if (!this.data.formStatus.canSave || this.data.formStatus.isSaving) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    this.setData({ 'formStatus.isSaving': true });
    
    wx.showLoading({
      title: '保存中...'
    });
    
    // 更新用户信息
    api.updateUserInfo({
      avatar_url: formData.avatar_url,
      real_name: formData.name,
      phone: formData.phone,
      gender: formData.gender,
      school: formData.school,
      college: formData.college,
      major: formData.major,
      student_id: formData.studentId,
      bio: formData.bio
    }).then(res => {
      wx.hideLoading();
      that.setData({ 'formStatus.isSaving': false });
      
      if (res.code === 200) {
        // 更新本地缓存
        const userInfo = AuthManager.getUserInfo();
        const updatedInfo = {
          ...userInfo,
          ...res.data,
          avatar_url: formData.avatar_url || userInfo.avatar_url
        };
        AuthManager.saveUserInfo(updatedInfo, AuthManager.getUserToken());
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.msg || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      that.setData({ 'formStatus.isSaving': false });
      console.error('保存失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  }
});