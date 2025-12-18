// pages/doctor/plan/detail/detail.js
const AV = require('../../../../libs/av-core-min.js');
const { formatTime } = require('../../../../utils/util.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    planId: '',
    plan: {
      title: '',
      createdAt: '',
      timeLabel: '',
      participantCount: 0
    },
    qrcodeUrl: '',
    participants: [],
    loading: false,
    showSettingsMenu: false,
    showQRCodeModal: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ planId: options.id });
      this.loadPlanDetail(options.id);
      this.loadParticipants(options.id);
      this.generateQRCode(options.id);
    }
  },

  /**
   * 加载随访计划详情
   */
  loadPlanDetail(planId) {
    this.setData({ loading: true });
    
    // 模拟加载随访计划详情
    setTimeout(() => {
      // 模拟数据
      const mockPlan = {
        title: '术后康复随访计划',
        createdAt: formatTime(new Date(Date.now() - 86400000)),
        timeLabel: '术后1个月',
        participantCount: 15
      };
      
      this.setData({
        plan: mockPlan,
        loading: false
      });
    }, 1000);
  },

  /**
   * 加载参与患者列表
   */
  loadParticipants(planId) {
    // 模拟加载参与患者列表
    setTimeout(() => {
      // 模拟数据
      const mockParticipants = [
        {
          id: 'p1',
          name: '张三',
          fillTime: formatTime(new Date()),
          status: '已完成'
        },
        {
          id: 'p2',
          name: '李四',
          fillTime: formatTime(new Date(Date.now() - 3600000)),
          status: '已完成'
        },
        {
          id: 'p3',
          name: '王五',
          fillTime: formatTime(new Date(Date.now() - 7200000)),
          status: '已完成'
        }
      ];
      
      this.setData({
        participants: mockParticipants
      });
    }, 1500);
  },

  /**
   * 生成随访二维码
   */
  generateQRCode(planId) {
    // 生成随访链接（实际应用中应该是真实的小程序页面路径）
    const followUpUrl = `pages/patient/followup/fill?planId=${planId}&timestamp=${Date.now()}`;
    
    // 使用在线二维码生成API
    // 这里使用QR Server API生成二维码图片
    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(followUpUrl)}`;
    
    this.setData({
      qrcodeUrl: qrcodeUrl
    });
  },

  /**
   * 显示设置菜单
   */
  showSettingsMenu() {
    this.setData({
      showSettingsMenu: true
    });
  },

  /**
   * 隐藏设置菜单
   */
  hideSettingsMenu() {
    this.setData({
      showSettingsMenu: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  preventClose() {
    // 阻止点击菜单内容时关闭
  },

  /**
   * 编辑随访计划
   */
  editPlan() {
    this.hideSettingsMenu();
    wx.navigateTo({
      url: `/pages/doctor/plan/create/create?id=${this.data.planId}`
    });
  },

  /**
   * 分享随访计划
   */
  sharePlan() {
    this.hideSettingsMenu();
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    wx.showToast({
      title: '点击右上角分享',
      icon: 'none'
    });
  },

  /**
   * 废弃随访计划
   */
  discardPlan() {
    this.hideSettingsMenu();
    
    wx.showModal({
      title: '确认废弃',
      content: '废弃后该随访计划将无法使用，确定要废弃吗？',
      confirmText: '确定废弃',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...'
          });
          
          // 模拟废弃操作
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '已废弃',
              icon: 'success',
              duration: 2000
            });
            
            // 延迟返回上一页
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
            
            // TODO: 调用云函数废弃计划
            // AV.Cloud.run('discardFollowUpPlan', { planId: this.data.planId })
          }, 1000);
        }
      }
    });
  },

  /**
   * 查看患者填写记录
   */
  viewPatientRecord(e) {
    const patientId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/doctor/plan/patientRecord/patientRecord?planId=${this.data.planId}&patientId=${patientId}`
    });
  },

  /**
   * 显示二维码放大弹窗
   */
  showQRCode() {
    this.setData({
      showQRCodeModal: true
    });
  },

  /**
   * 隐藏二维码放大弹窗
   */
  hideQRCode() {
    this.setData({
      showQRCodeModal: false
    });
  },

  /**
   * 保存二维码到相册
   */
  saveQRCode() {
    if (!this.data.qrcodeUrl) {
      wx.showToast({
        title: '二维码加载中',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    // 下载二维码图片
    wx.downloadFile({
      url: this.data.qrcodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '已保存到相册',
                icon: 'success'
              });
              this.hideQRCode();
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('保存到相册失败:', err);
              
              // 如果是权限问题，引导用户开启权限
              if (err.errMsg.indexOf('auth') !== -1) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中开启相册权限',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
              }
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('下载二维码失败:', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
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
    // 刷新页面数据
    this.loadPlanDetail(this.data.planId);
    this.loadParticipants(this.data.planId);
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
    return {
      title: `${this.data.plan.title} - 随访计划`,
      path: `/pages/doctor/plan/detail/detail?id=${this.data.planId}`,
      imageUrl: this.data.qrcodeUrl
    };
  }
})