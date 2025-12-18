// pages/patient/home/home.js
const AV = require('../../../libs/av-core-min.js');
const util = require('../../../utils/util');
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null,
    followRecords: [],
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      menuButton: app.globalData.menuButton
    });
    // 检查登录状态
    this.checkLogin();
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
    this.getTabBar()?.setData({
      mode: 'patient',
      selected: 0
    });
    // 加载随访记录
    this.loadFollowRecords();
  },

  // 检查登录状态
  checkLogin() {
    const user = AV.User.current();
    if (!user) {
      // 如果未登录，执行微信一键登录
      wx.showLoading({ title: '登录中...' });
      AV.User.loginWithWeapp().then(user => {
        wx.hideLoading();
        this.loadFollowRecords();
      }).catch(error => {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
        console.error('登录失败:', error);
      });
    }
  },

  // 加载随访记录
  loadFollowRecords() {
    this.setData({ loading: true });
    
    // 开发模式：直接显示假数据
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：显示假数据');
      const mockRecords = [
      {
        id: '1',
        planTitle: '膝关节术后3个月随访',
        doctorName: '张医生',
        fillTime: '2024-12-15 14:30'
      },
      {
        id: '2',
        planTitle: '术后1个月康复评估',
        doctorName: '李医生',
        fillTime: '2024-11-20 09:15'
      },
      {
        id: '3',
        planTitle: '出院前健康状况评估',
        doctorName: '王医生',
        fillTime: '2024-10-05 16:45'
      },
      {
        id: '4',
        planTitle: '术前基础评估',
        doctorName: '张医生',
        fillTime: '2024-09-28 10:20'
      },
      {
        id: '5',
        planTitle: '术后6个月功能恢复随访',
        doctorName: '李医生',
        fillTime: '2024-08-12 13:50'
      }
      ];

      this.setData({
        followRecords: mockRecords,
        loading: false
      });
      return;
    }

    // 生产环境：检查用户登录状态
    const user = AV.User.current();
    if (!user) {
      this.setData({ loading: false });
      return;
    }

    // 实际查询代码（待实现）
    // const query = new AV.Query('FollowUpRecord');
    // query.equalTo('patient', AV.User.current());
    // query.include('plan');
    // query.descending('createdAt');
    // query.find().then(records => {
    //   const formattedRecords = records.map(record => ({
    //     id: record.id,
    //     planTitle: record.get('plan').get('title'),
    //     doctorName: record.get('plan').get('creatorName'),
    //     fillTime: util.formatTime(record.createdAt)
    //   }));
    //   this.setData({
    //     followRecords: formattedRecords,
    //     loading: false
    //   });
    // }).catch(error => {
    //   console.error('加载随访记录失败:', error);
    //   this.setData({ loading: false });
    //   wx.showToast({
    //     title: '加载失败',
    //     icon: 'none'
    //   });
    // });
  },

  // 查看随访详情
  viewFollowDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/patient/record/detail/detail?id=${id}`
    });
  },

  // 扫描二维码
  scanQRCode() {
    // 开发模式下直接跳转
    const isDevMode = true;
    if (isDevMode) {
      wx.navigateTo({
        url: `/pages/patient/fill/fill?planId=mock001`
      });
      return;
    }

    // 生产环境扫码
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        console.log('扫码结果:', res);
        // 解析二维码内容并跳转到填写页面
        // 假设二维码内容格式: planId=xxx
        try {
          const url = res.result;
          if (url.includes('planId=')) {
            const planId = url.split('planId=')[1];
            wx.navigateTo({
              url: `/pages/patient/fill/fill?planId=${planId}`
            });
          } else {
            wx.showToast({
              title: '无效的随访二维码',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('解析二维码失败:', error);
          wx.showToast({
            title: '二维码格式错误',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.log('扫码失败:', err);
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: '扫码失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 返回入口首页
  backToIndex() {
    wx.reLaunch({
      url: '/pages/index/index'
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
    this.loadFollowRecords();
    wx.stopPullDownRefresh();
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