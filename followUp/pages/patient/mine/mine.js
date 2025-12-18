// pages/patient/mine/mine.js
Page({
  data: {
    nickname: ''
  },

  onShow() {
    this.getTabBar()?.setData({
      mode: 'patient',
      selected: 1
    })

    // 这里可以根据实际登录用户信息设置昵称，暂时使用本地存储/占位
    const nickname = wx.getStorageSync('patientNickname') || ''
    this.setData({ nickname })
  },

  viewHistory() {
    // 跳到患者首页的随访列表
    wx.switchTab({
      url: '/pages/patient/home/home'
    })
  },

  openAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    })
  },

  openPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    })
  }
})