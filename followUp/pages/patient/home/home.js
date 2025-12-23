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
    pendingRecords: [],
    otherRecords: [],
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

  // 排序随访记录
  // 排序规则：1. 日常随访计划（最上面） 2. 未完成的随访 3. 已失效或已完成的随访计划（最下面）
  sortFollowRecords(records) {
    return records.sort((a, b) => {
      // 1. 日常随访计划优先（timeType === 'dailySelfAssessment'）
      const aIsDaily = a.timeType === 'dailySelfAssessment';
      const bIsDaily = b.timeType === 'dailySelfAssessment';
      if (aIsDaily && !bIsDaily) return -1;
      if (!aIsDaily && bIsDaily) return 1;
      
      // 2. 如果都是日常随访或都不是日常随访，按状态排序
      // pending（未完成）优先于 completed（已完成）和 expired（已失效）
      const statusPriority = { pending: 1, completed: 2, expired: 2 };
      const aPriority = statusPriority[a.status] || 2;
      const bPriority = statusPriority[b.status] || 2;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 3. 如果状态相同，按时间倒序（最新的在前）
      return new Date(b.fillTime) - new Date(a.fillTime);
    });
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
        planId: 'mock001',
        planTitle: '日常自我评估',
        doctorName: '张医生团队',
        fillTime: '2024-12-17 10:00',
        timeType: 'dailySelfAssessment',
        status: 'pending' // pending: 未完成, completed: 已完成, expired: 已失效
      },
      {
        id: '2',
        planId: 'mock002',
        planTitle: '膝关节术后3个月随访',
        doctorName: '张医生团队',
        fillTime: '2024-12-15 14:30',
        timeType: 'threeMonths',
        status: 'completed'
      },
      {
        id: '3',
        planId: 'mock001',
        planTitle: '术后1个月康复评估',
        doctorName: '李医生团队',
        fillTime: '2024-12-18 09:00',
        timeType: 'oneMonth',
        status: 'pending'
      },
      {
        id: '4',
        planTitle: '出院前健康状况评估',
        doctorName: '王医生团队',
        fillTime: '2024-10-05 16:45',
        timeType: 'preDischarge',
        status: 'completed'
      },
      {
        id: '5',
        planTitle: '术前基础评估',
        doctorName: '张医生团队',
        fillTime: '2024-09-28 10:20',
        timeType: 'preoperative',
        status: 'expired'
      },
      {
        id: '6',
        planTitle: '术后6个月功能恢复随访',
        doctorName: '李医生团队',
        fillTime: '2024-08-12 13:50',
        timeType: 'sixMonths',
        status: 'expired'
      }
      ];

      // 按照规则排序：日常随访 > 未完成 > 已完成/已失效
      const sortedRecords = this.sortFollowRecords(mockRecords);
      
      // 分组：待完成和其他（已完成/已失效）
      const pendingRecords = sortedRecords.filter(item => item.status === 'pending');
      const otherRecords = sortedRecords.filter(item => item.status !== 'pending');

      this.setData({
        followRecords: sortedRecords,
        pendingRecords: pendingRecords,
        otherRecords: otherRecords,
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
    //     fillTime: util.formatTime(record.createdAt),
    //     timeType: record.get('timeType'),
    //     status: record.get('status') || 'pending'
    //   }));
    //   const sortedRecords = this.sortFollowRecords(formattedRecords);
    //   const pendingRecords = sortedRecords.filter(item => item.status === 'pending');
    //   const otherRecords = sortedRecords.filter(item => item.status !== 'pending');
    //   this.setData({
    //     followRecords: sortedRecords,
    //     pendingRecords: pendingRecords,
    //     otherRecords: otherRecords,
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

  // 查看随访详情或填写随访
  viewFollowDetail(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    const planId = e.currentTarget.dataset.planId;
    const timeType = e.currentTarget.dataset.timeType;
    
    // 如果是待完成状态，跳转到填写页面
    if (status === 'pending') {
      // 使用 planId，如果没有则使用 id 作为 planId
      const targetPlanId = planId || id || 'mock001';
      wx.navigateTo({
        url: `/pages/patient/fill/fill?planId=${targetPlanId}${timeType ? `&timeType=${timeType}` : ''}`
      });
    } else {
      // 已完成或已失效，跳转到详情页
      wx.navigateTo({
        url: `/pages/patient/record/detail/detail?id=${id}`
      });
    }
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