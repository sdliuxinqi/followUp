// pages/doctor/home/home.js
const AV = require('../../../libs/av-core-min.js');
const { formatTime } = require('../../../utils/util.js');
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null,
    plans: [],
    loading: false,
    totalParticipants: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      menuButton: app.globalData.menuButton
    }),
    // 检查医生身份
    this.checkDoctorStatus();
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
        mode: 'doctor',
        selected: 0
      })
    }
    
    // 加载随访计划
    this.loadFollowUpPlans();
  },

  /**
   * 检查医生身份
   */
  checkDoctorStatus() {
    const app = getApp();
    const user = app.globalData.user;
    
    if (!user) {
      // 未登录，返回首页
      wx.navigateTo({ url: '/pages/index/index' });
      return;
    }
    
    // 调用云函数检查医生身份
    AV.Cloud.run('checkDoctorRole', {}).then(result => {
      if (result.success) {
        if (!result.isDoctor) {
          // 不是医生或未认证，跳转到医生认证页面
          wx.navigateTo({
            url: '/pages/doctor/auth/auth'
          });
        }
      } else {
        console.error('检查医生身份失败:', result.message);
        wx.showToast({
          title: '检查医生身份失败',
          icon: 'none'
        });
      }
    }).catch(error => {
      console.error('检查医生身份失败:', error);
      // 开发环境下跳过医生身份检查
      const isDevMode = true;
      if (!isDevMode) {
        wx.showToast({
          title: '检查医生身份失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 加载随访计划
   */
  loadFollowUpPlans() {
    this.setData({ loading: true });
    
    // 模拟加载随访计划
    setTimeout(() => {
      // 模拟数据
      const mockPlans = [
        {
          id: '1',
          title: '术后康复随访计划',
          createdAt: formatTime(new Date()),
          participantCount: 15
        },
        {
          id: '2',
          title: '慢性病管理随访',
          createdAt: formatTime(new Date(Date.now() - 86400000)),
          participantCount: 32
        },
        {
          id: '3',
          title: '术前评估随访',
          createdAt: formatTime(new Date(Date.now() - 172800000)),
          participantCount: 8
        }
      ];
      
      // 计算统计数据
      const totalParticipants = mockPlans.reduce((sum, plan) => sum + plan.participantCount, 0);
      
      this.setData({
        plans: mockPlans,
        totalParticipants: totalParticipants,
        loading: false
      });
      
      // 停止下拉刷新
      if (wx.getPullDownRefreshStatus().refreshing) {
        wx.stopPullDownRefresh();
      }
    }, 1000);
  },

  /**
   * 新建随访计划
   */
  createFollowUpPlan() {
    wx.navigateTo({
      url: '/pages/doctor/plan/create/create'
    });
  },

  // 返回入口首页
  backToIndex() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  /**
   * 查看随访计划详情
   */
  viewPlanDetail(e) {
    const planId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/doctor/plan/detail/detail?id=${planId}`
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
    this.loadFollowUpPlans();
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

  },

  /**
   * 导航栏按钮点击事件
   */
  onNavigationBarButtonTap(e) {
    if (e.index === 0) {
      this.backToIndex();
    }
  }
})