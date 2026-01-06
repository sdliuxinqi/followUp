// pages/doctor/auth/auth.js
const AV = require('../../../libs/av-core-min.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      name: '',
      hospital: '',
      department: '',
      workCardImage: ''
    },
    loading: false,
    departmentList: ['关节外科', '脊柱外科', '手足外科', '骨肿瘤科', '创伤外科'],
    showDepartmentPicker: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    const user = getApp().globalData.user;
    if (!user) {
      wx.navigateTo({ url: '/pages/index/index' });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) {
      tabBar.setData({
        mode: 'doctor'
      })
    }
  },

  /**
   * 选择工作证图片
   */
  chooseWorkCardImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.workCardImage': tempFilePath
        });
      },
      fail: err => {
        console.error('选择图片失败:', err);
      }
    });
  },

  /**
   * 删除工作证图片
   */
  deleteWorkCardImage() {
    this.setData({
      'formData.workCardImage': ''
    });
  },

  /**
   * 显示科室选择弹窗
   */
  showDepartmentPicker() {
    this.setData({
      showDepartmentPicker: true
    });
  },

  /**
   * 隐藏科室选择弹窗
   */
  hideDepartmentPicker() {
    this.setData({
      showDepartmentPicker: false
    });
  },

  /**
   * 选择科室
   */
  selectDepartment(e) {
    const department = e.currentTarget.dataset.department;
    this.setData({
      'formData.department': department,
      showDepartmentPicker: false
    });
  },

  /**
   * 提交认证
   */
  submitAuth(e) {
    // 开发环境下直接跳转，不做任何验证
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：跳过表单验证，直接跳转');
      this.setData({ loading: true });
      setTimeout(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '认证提交成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(() => {
              // 跳转到医生首页
              wx.switchTab({
                url: '/pages/doctor/home/home'
              });
            }, 1000);
          }
        });
      }, 300);
      return;
    }
    
    const formData = e.detail.value;
    const workCardImage = this.data.formData.workCardImage;
    
    // 生产环境：表单验证
    if (!formData.name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!formData.hospital) {
      wx.showToast({ title: '请输入医院', icon: 'none' });
      return;
    }
    if (!formData.department) {
      wx.showToast({ title: '请输入科室', icon: 'none' });
      return;
    }
    if (!workCardImage) {
      wx.showToast({ title: '请上传工作证图片', icon: 'none' });
      return;
    }
    
    this.setData({ loading: true });
    
    // 生产环境：提交认证信息到数据库
    setTimeout(() => {
      // 创建医生认证信息
      const DoctorProfile = new AV.Object('DoctorProfile');
      // 正确创建Pointer关联
      DoctorProfile.set('user', AV.Object.createWithoutData('_User', getApp().globalData.user.id));
      DoctorProfile.set('name', formData.name);
      DoctorProfile.set('hospital', formData.hospital);
      DoctorProfile.set('department', formData.department);
      DoctorProfile.set('workCardImage', workCardImage);
      DoctorProfile.set('status', 'pending');
      
      DoctorProfile.save().then(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '认证提交成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              // 跳转到医生首页
              wx.switchTab({
                url: '/pages/doctor/home/home'
              });
            }, 1500);
          }
        });
      }).catch(error => {
        this.setData({ loading: false });
        console.error('提交认证失败:', error);
        wx.showToast({
          title: '提交认证失败',
          icon: 'none'
        });
      });
    }, 1000);
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})