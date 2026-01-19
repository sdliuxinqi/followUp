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
    const userId = app.globalData.userId || wx.getStorageSync('userId');
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    
    if (!userId || !sessionToken) {
      // 未登录，返回首页
      console.log('未登录，跳转到首页');
      wx.reLaunch({ url: '/pages/index/index' });
      return;
    }
    
    // 使用 REST API 检查医生身份（不再使用云函数）
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';
    
    wx.request({
      url: `${API_BASE}/v1/auth/doctor-profile`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const profile = res.data.data;
          if (!profile) {
            // 没有医生档案，跳转到认证页面
            wx.navigateTo({
              url: '/pages/doctor/auth/auth'
            });
          } else if (!profile.isApproved) {
            // 已提交但未审核，可以显示提示
            console.log('医生认证审核中');
          } else {
            // 已认证，正常显示
            console.log('医生身份验证通过');
          }
        } else {
          console.error('检查医生身份失败:', res.data?.message || '未知错误');
        }
      },
      fail: (err) => {
        console.error('检查医生身份请求失败:', err);
        // 开发环境下跳过医生身份检查
        const isDevMode = true;
        if (!isDevMode) {
          wx.showToast({
            title: '检查医生身份失败',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 加载随访计划
   */
  loadFollowUpPlans() {
    this.setData({ loading: true });
    
    const app = getApp();
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    
    if (!sessionToken) {
      this.setData({ loading: false });
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 1500);
      return;
    }
    
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';
    
    wx.request({
      url: `${API_BASE}/v1/doctor/plans`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        this.setData({ loading: false });
        
        // 停止下拉刷新
        try {
          wx.stopPullDownRefresh();
        } catch (err) {
          console.warn('停止下拉刷新失败:', err);
        }
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          const plansData = res.data.data || [];
          
          // 过滤掉已废弃的计划，并格式化数据
          const plans = plansData
            .filter(plan => !plan.isDiscarded)
            .map(plan => ({
              id: plan.id,
              title: plan.title || '未命名计划',
              createdAt: plan.createdAt ? formatTime(new Date(plan.createdAt)) : '',
              participantCount: plan.participantCount || 0,
              creatorName: plan.creatorName || plan.teamName || '未知'
            }));
          
          // 计算统计数据
          const totalParticipants = plans.reduce((sum, plan) => sum + plan.participantCount, 0);
          
          this.setData({
            plans: plans,
            totalParticipants: totalParticipants
          });
        } else {
          const errorMsg = res.data?.message || '获取随访计划列表失败';
          console.error('获取随访计划列表失败:', res.data);
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          
          // 失败时设置为空数组
          this.setData({
            plans: [],
            totalParticipants: 0
          });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('获取随访计划列表请求失败:', err);
        
        // 停止下拉刷新
        try {
          wx.stopPullDownRefresh();
        } catch (e) {
          console.warn('停止下拉刷新失败:', e);
        }
        
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        
        // 失败时设置为空数组
        this.setData({
          plans: [],
          totalParticipants: 0
        });
      }
    });
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