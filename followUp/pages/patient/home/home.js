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
    dailyAssessmentRecords: [], // 日常自我评估（单独显示）
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
    // 使用自定义登录方式，检查全局用户信息
    const app = getApp();
    const user = app.globalData.user;
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    
    if (!user || !sessionToken) {
      // 如果未登录，跳转到首页进行登录
      console.log('患者首页：未登录，跳转到首页');
      wx.reLaunch({
        url: '/pages/index/index'
      });
      return;
    }
    
    // 已登录，继续加载数据
    console.log('患者首页：已登录，用户ID:', user.id);
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
      const statusPriority = { pending: 1, completed: 2, expired: 3 };
      const aPriority = statusPriority[a.status] || 3;
      const bPriority = statusPriority[b.status] || 3;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 3. 如果状态相同，按时间倒序（最新的在前）
      // 使用原始时间（fillTimeRaw）进行排序，如果不存在则使用 fillTime
      const parseTime = (record) => {
        const timeStr = record.fillTimeRaw || record.fillTime;
        if (!timeStr) return 0;
        const date = new Date(timeStr);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      };
      const aTime = parseTime(a);
      const bTime = parseTime(b);
      return bTime - aTime;
    });
  },

  // 加载随访记录
  loadFollowRecords() {
    this.setData({ loading: true });
    
    // 开发模式：直接显示假数据（如需调试本地 UI，将 isDevMode 改为 true）
    const isDevMode = false;
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

      // 格式化假数据，使其与后端返回格式一致
      const formattedMockRecords = mockRecords.map(item => {
        // 时间节点类型的中文映射
        const timeTypeLabels = {
          'dailySelfAssessment': '日常评估',
          'preoperative': '术前评估',
          'preDischarge': '出院前评估',
          'oneWeek': '术后1周',
          'oneMonth': '术后1个月',
          'threeMonths': '术后3个月',
          'sixMonths': '术后6个月'
        };

        // 格式化时间显示
        let fillTimeDisplay = '';
        let fillTimeRaw = item.fillTime;
        if (item.fillTime) {
          const fillDate = new Date(item.fillTime);
          if (item.status === 'completed') {
            fillTimeDisplay = util.formatTime(fillDate);
          } else {
            const year = fillDate.getFullYear();
            const month = String(fillDate.getMonth() + 1).padStart(2, '0');
            const day = String(fillDate.getDate()).padStart(2, '0');
            fillTimeDisplay = `${year}/${month}/${day}`;
          }
        }

        // 生成计划标题显示
        let planTitleDisplay = item.planTitle || '';
        if (planTitleDisplay && item.timeType && item.timeType !== 'dailySelfAssessment') {
          const timeLabel = timeTypeLabels[item.timeType];
          if (timeLabel) {
            planTitleDisplay = `${planTitleDisplay} - ${timeLabel}`;
          }
        }

        return {
          ...item,
          planTitle: planTitleDisplay,
          fillTime: fillTimeDisplay,
          fillTimeRaw: fillTimeRaw
        };
      });

      // 按照规则排序：日常随访 > 未完成 > 已完成/已失效
      const sortedRecords = this.sortFollowRecords(formattedMockRecords);
      
      // 分组：
      // 1. 日常自我评估（单独显示，不区分状态）
      const dailyAssessmentRecords = sortedRecords.filter(item => item.timeType === 'dailySelfAssessment');
      // 2. 待完成（排除日常自我评估）
      const pendingRecords = sortedRecords.filter(item => item.status === 'pending' && item.timeType !== 'dailySelfAssessment');
      // 3. 其他（已完成/已失效，排除日常自我评估）
      const otherRecords = sortedRecords.filter(item => item.status !== 'pending' && item.timeType !== 'dailySelfAssessment');

      this.setData({
        followRecords: sortedRecords,
        dailyAssessmentRecords: dailyAssessmentRecords,
        pendingRecords: pendingRecords,
        otherRecords: otherRecords,
        loading: false
      });
      return;
    }

    // 生产环境：从后端获取当前患者的随访记录列表
    const app = getApp();
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');

    if (!sessionToken) {
      console.warn('患者首页：缺少 sessionToken，无法获取随访记录');
      this.setData({ loading: false });
      return;
    }

    wx.request({
      // 使用新的“承诺列表”接口：包含日常自评 + 待填写 + 已填写
      url: `${app.globalData.apiBase}/v1/patient/commitments`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        // 后端约定：支持 Authorization 或 X-LC-Session
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        if (!res.data || !res.data.success) {
          console.error('获取随访记录失败:', res.data);
          this.setData({ loading: false });
          wx.showToast({
            title: res.data && res.data.message ? res.data.message : '加载失败',
            icon: 'none'
          });
          return;
        }

        const records = res.data.data || [];

        // 后端返回所有时间节点的承诺列表，包含 pending/completed/expired 状态
        // 根据时间节点和当前日期，后端已经分类好状态
        const formattedRecords = records.map(item => {
          // 时间节点类型的中文映射
          const timeTypeLabels = {
            'dailySelfAssessment': '日常评估',
            'preoperative': '术前评估',
            'preDischarge': '出院前评估',
            'oneWeek': '术后1周',
            'oneMonth': '术后1个月',
            'twoMonths': '术后2个月',
            'threeMonths': '术后3个月',
            'fourMonths': '术后4个月',
            'fiveMonths': '术后5个月',
            'sixMonths': '术后6个月',
            'sevenMonths': '术后7个月',
            'eightMonths': '术后8个月',
            'nineMonths': '术后9个月',
            'tenMonths': '术后10个月',
            'elevenMonths': '术后11个月',
            'twelveMonths': '术后12个月',
            'thirteenMonths': '术后13个月',
            'fourteenMonths': '术后14个月',
            'fifteenMonths': '术后15个月',
            'sixteenMonths': '术后16个月',
            'seventeenMonths': '术后17个月',
            'eighteenMonths': '术后18个月',
            'nineteenMonths': '术后19个月',
            'twentyMonths': '术后20个月',
            'twentyOneMonths': '术后21个月',
            'twentyTwoMonths': '术后22个月',
            'twentyThreeMonths': '术后23个月',
            'twentyFourMonths': '术后24个月'
          };

          // 格式化时间显示
          let fillTimeDisplay = '';
          if (item.fillTime) {
            const fillDate = new Date(item.fillTime);
            if (item.status === 'completed') {
              // 已完成：显示实际填写时间
              fillTimeDisplay = util.formatTime(fillDate);
            } else {
              // 待完成/已失效：显示推荐随访日期（只显示日期，不显示时间）
              const year = fillDate.getFullYear();
              const month = String(fillDate.getMonth() + 1).padStart(2, '0');
              const day = String(fillDate.getDate()).padStart(2, '0');
              fillTimeDisplay = `${year}/${month}/${day}`;
            }
          }

          // 生成计划标题显示（如果原标题为空，使用时间节点标签）
          let planTitleDisplay = item.planTitle || '';
          if (!planTitleDisplay && item.timeType) {
            planTitleDisplay = timeTypeLabels[item.timeType] || item.timeType;
          } else if (planTitleDisplay && item.timeType && item.timeType !== 'dailySelfAssessment') {
            // 对于非日常评估的节点，在标题后追加时间节点信息
            const timeLabel = timeTypeLabels[item.timeType];
            if (timeLabel) {
              planTitleDisplay = `${planTitleDisplay} - ${timeLabel}`;
            }
          }

          return {
            id: item.id,
            planId: item.planId,
            planTitle: planTitleDisplay,
            doctorName: item.doctorName || '',
            fillTime: fillTimeDisplay, // 显示用的格式化时间
            fillTimeRaw: item.fillTime, // 原始时间，用于排序
            timeType: item.timeType || null,
            status: item.status || 'completed' // pending/completed/expired
          };
        });

        const sortedRecords = this.sortFollowRecords(formattedRecords);

        // 分组：
        // 1. 日常自我评估（单独显示，不区分状态）
        const dailyAssessmentRecords = sortedRecords.filter(item => item.timeType === 'dailySelfAssessment');
        // 2. 待填写随访计划（排除日常自我评估，依赖后端返回 status = 'pending'）
        const pendingRecords = sortedRecords.filter(item => item.status === 'pending' && item.timeType !== 'dailySelfAssessment');
        // 3. 已填写/已失效的随访计划（排除日常自我评估）
        const otherRecords = sortedRecords.filter(item => item.status !== 'pending' && item.timeType !== 'dailySelfAssessment');

        this.setData({
          followRecords: sortedRecords,
          dailyAssessmentRecords,
          pendingRecords,
          otherRecords,
          loading: false
        });
      },
      fail: (error) => {
        console.error('加载随访记录失败:', error);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败，请检查网络',
          icon: 'none'
        });
      }
    });
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
    // 直接调用微信扫码功能
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        console.log('扫码结果:', res);
        console.log('扫码内容:', res.result);
        // 解析二维码内容并绑定随访计划
        // 假设二维码内容格式: planId=xxx 或包含 planId 的 URL
        try {
          const url = res.result;
          let planId = null;
          
          console.log('开始解析二维码内容:', url);
          
          // 尝试从 URL 中提取 planId
          if (url.includes('planId=')) {
            const match = url.match(/planId=([^&]+)/);
            if (match) {
              planId = match[1];
              console.log('从URL参数中提取到planId:', planId);
            }
          } else if (url.match(/^[a-zA-Z0-9]+$/)) {
            // 如果二维码内容直接就是 planId（纯字母数字）
            planId = url;
            console.log('二维码内容直接是planId:', planId);
          } else {
            // 尝试作为完整的 planId（可能包含下划线等）
            // LeanCloud 的 objectId 通常是 24 位十六进制字符串
            if (url.length >= 10 && url.length <= 30) {
              planId = url;
              console.log('尝试使用完整内容作为planId:', planId);
            }
          }
          
          if (!planId) {
            console.error('无法从二维码中提取planId，二维码内容:', url);
            wx.showToast({
              title: '无效的随访二维码',
              icon: 'none',
              duration: 3000
            });
            return;
          }
          
          console.log('准备绑定计划，planId:', planId);
          // 调用绑定接口
          this.bindPlan(planId);
        } catch (error) {
          console.error('解析二维码失败:', error);
          console.error('错误堆栈:', error.stack);
          wx.showToast({
            title: '二维码格式错误',
            icon: 'none',
            duration: 3000
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

  // 绑定随访计划
  bindPlan(planId) {
    const app = getApp();
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');

    console.log('开始绑定计划，planId:', planId);
    console.log('sessionToken存在:', !!sessionToken);
    console.log('API Base:', app.globalData.apiBase);

    if (!sessionToken) {
      console.error('缺少sessionToken，无法绑定');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    if (!planId) {
      console.error('planId为空，无法绑定');
      wx.showToast({
        title: '计划ID无效',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '绑定中...',
      mask: true
    });

    const requestUrl = `${app.globalData.apiBase}/v1/patient/commitments`;
    const requestData = {
      planId: planId
    };

    console.log('发送绑定请求，URL:', requestUrl);
    console.log('请求数据:', requestData);

    wx.request({
      url: requestUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      data: requestData,
      success: (res) => {
        wx.hideLoading();
        console.log('绑定接口响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据:', res.data);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          if (res.data && res.data.success) {
            // 绑定成功，跳转到"我的"页面，让患者看到刚才绑定的随访计划
            wx.showToast({
              title: res.data.data.message || '绑定成功',
              icon: 'success',
              duration: 2000
            });
            setTimeout(() => {
              // 跳转到"我的"页面（tabBar 页面）
              wx.switchTab({
                url: '/pages/patient/mine/mine'
              });
            }, 2000);
          } else {
            const errorMsg = res.data && res.data.message ? res.data.message : '绑定失败';
            console.error('绑定失败，错误信息:', errorMsg);
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            });
          }
        } else {
          // HTTP 状态码不是 200/201
          const errorMsg = res.data && res.data.message ? res.data.message : `绑定失败 (${res.statusCode})`;
          console.error('绑定失败，HTTP状态码:', res.statusCode, '错误信息:', errorMsg);
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('绑定随访计划网络请求失败:', error);
        console.error('错误详情:', JSON.stringify(error));
        let errorMsg = '网络错误，请重试';
        if (error.errMsg) {
          errorMsg = error.errMsg;
        }
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
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