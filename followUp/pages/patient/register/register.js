// pages/patient/register/register.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      name: '',
      birthDate: '',
      gender: '男',
      phone: ''
    },
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const app = getApp();
    // 检查是否已登录
    const user = app.globalData.user || wx.getStorageSync('userProfile') || null;
    if (!user) {
      // 未登录，可以选择自动登录或跳转到登录页
      console.log('用户未登录');
    } else {
      // 性别优先从接口 / 本地用户信息中带入
      const rawGender = user.gender || user.sex || user.genderCode;
      let genderText = '';
      if (rawGender === 'male' || rawGender === 'M' || rawGender === 1) {
        genderText = '男';
      } else if (rawGender === 'female' || rawGender === 'F' || rawGender === 0) {
        genderText = '女';
      } else if (rawGender === '男' || rawGender === '女') {
        genderText = rawGender;
      }

      if (genderText) {
        this.setData({
          'formData.gender': genderText
        });
      }
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
   * 提交登记
   */
  submitRegister(e) {
    // 开发环境下直接跳转，不做验证
    const isDevMode = false;
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
    if (!formData.phone || !formData.phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    
    this.setData({ loading: true });

    // 生产环境：通过自定义后端接口提交患者登记信息
    const app = getApp();
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';

    if (!sessionToken) {
      this.setData({ loading: false });
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: `${API_BASE}/v1/patient/profile`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      data: {
        name: formData.name,
        gender: this.data.formData.gender === '男' ? 'male' : 'female',
        birthDate: this.data.formData.birthDate,
        phone: formData.phone
      },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 201 && res.data && res.data.success) {
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
        } else {
          console.error('提交登记失败:', res.data?.message || '未知错误');
          wx.showToast({
            title: res.data?.message || '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('提交登记请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
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

