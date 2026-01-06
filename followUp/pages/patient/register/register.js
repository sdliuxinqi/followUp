// pages/patient/register/register.js
const AV = require('../../../libs/av-core-min.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      name: '',
      birthDate: '',
      gender: '男',
      admissionNumber: '',
      phone: '',
      teamName: '',
      doctorId: ''
    },
    loading: false,
    showDoctorModal: false,
    doctorList: [
      {
        id: 'doc001',
        name: '张伟',
        teamDisplayName: '张医生团队',
        title: '主任医师',
        department: '骨科',
        hospital: '齐鲁医院',
        teamName: '张医生团队'
      },
      {
        id: 'doc002',
        name: '李娜',
        teamDisplayName: '李医生团队',
        title: '副主任医师',
        department: '骨科',
        hospital: '齐鲁医院',
        teamName: '李医生团队'
      },
      {
        id: 'doc003',
        name: '王强',
        teamDisplayName: '王医生团队',
        title: '主治医师',
        department: '骨科',
        hospital: '齐鲁医院',
        teamName: '王医生团队'
      },
      {
        id: 'doc004',
        name: '刘芳',
        teamDisplayName: '刘医生团队',
        title: '主任医师',
        department: '康复科',
        hospital: '齐鲁医院',
        teamName: '刘医生团队'
      },
      {
        id: 'doc005',
        name: '陈明',
        teamDisplayName: '陈医生团队',
        title: '副主任医师',
        department: '运动医学科',
        hospital: '齐鲁医院',
        teamName: '陈医生团队'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    const user = getApp().globalData.user;
    if (!user) {
      // 未登录，可以选择自动登录或跳转到登录页
      console.log('用户未登录');
    }
    
    // 设置当前日期作为最大可选日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({
      currentDate: `${year}-${month}-${day}`
    });
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

  },

  /**
   * 选择性别
   */
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender
    });
  },

  /**
   * 选择日期
   */
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({
      'formData.birthDate': date
    });
  },

  /**
   * 微信授权获取手机号
   */
  getPhoneNumber(e) {
    console.log('获取手机号结果:', e);
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 获取到加密数据，需要发送到后端解密
      // 这里暂时模拟一个手机号
      wx.showToast({
        title: '授权成功',
        icon: 'success'
      });
      // 实际应该调用云函数解密
      // 这里模拟设置手机号
      this.setData({
        'formData.phone': '138****8888'
      });
    } else {
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      });
    }
  },

  /**
   * 显示医生列表弹窗
   */
  showDoctorList() {
    this.setData({
      showDoctorModal: true
    });
  },

  /**
   * 隐藏医生列表弹窗
   */
  hideDoctorList() {
    this.setData({
      showDoctorModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭
  },

  /**
   * 选择医生团队
   */
  selectDoctor(e) {
    const doctor = e.currentTarget.dataset.doctor;
    this.setData({
      'formData.doctorId': doctor.id,
      'formData.teamName': doctor.teamName,
      showDoctorModal: false
    });
    wx.showToast({
      title: '选择成功',
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 提交登记
   */
  submitRegister(e) {
    // 开发环境下直接跳转，不做验证
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：跳过表单验证，直接跳转');
      this.setData({ loading: true });
      setTimeout(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '登记提交成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(() => {
              // 跳转到患者首页
              wx.switchTab({
                url: '/pages/patient/home/home'
              });
            }, 1000);
          }
        });
      }, 300);
      return;
    }

    const formData = e.detail.value;
    
    // 生产环境：表单验证
    if (!formData.name || !formData.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!this.data.formData.birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }
    if (!this.data.formData.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' });
      return;
    }
    if (!formData.admissionNumber || !formData.admissionNumber.trim()) {
      wx.showToast({ title: '请输入住院号', icon: 'none' });
      return;
    }
    if (!this.data.formData.phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    
    this.setData({ loading: true });
    
    // 生产环境：提交患者登记信息
    const PatientProfile = new AV.Object('PatientProfile');
    PatientProfile.set('user', AV.Object.createWithoutData('_User', getApp().globalData.user.id));
    PatientProfile.set('name', formData.name);
    PatientProfile.set('birthDate', this.data.formData.birthDate);
    PatientProfile.set('gender', this.data.formData.gender);
    PatientProfile.set('admissionNumber', formData.admissionNumber);
    PatientProfile.set('phone', this.data.formData.phone);
    PatientProfile.set('doctorId', this.data.formData.doctorId || '');
    PatientProfile.set('teamName', this.data.formData.teamName || '');
    PatientProfile.set('status', 'pending');
    
    PatientProfile.save().then(() => {
      this.setData({ loading: false });
      wx.showToast({
        title: '登记提交成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            // 跳转到患者首页
            wx.switchTab({
              url: '/pages/patient/home/home'
            });
          }, 1500);
        }
      });
    }).catch(error => {
      this.setData({ loading: false });
      console.error('提交登记失败:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
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

