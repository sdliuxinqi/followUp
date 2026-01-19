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
    
    const app = getApp();
    const sessionToken = wx.getStorageSync('sessionToken') || app.globalData.sessionToken;
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';
    
    if (!sessionToken) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }
    
    wx.request({
      url: `${API_BASE}/v1/doctor/plans/${planId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        this.setData({ loading: false });
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          const planData = res.data.data || {};
          
          // 格式化时间节点显示
          let timeLabel = '';
          if (planData.timeTypes && planData.timeTypes.length > 0) {
            const timeTypeLabels = {
              'preoperative': '术前',
              'oneWeek': '术后1周',
              'oneMonth': '术后1个月',
              'threeMonths': '术后3个月',
              'sixMonths': '术后6个月',
              'oneYear': '术后1年'
            };
            timeLabel = planData.timeTypes.map(t => timeTypeLabels[t] || t).join('、');
          }
          
          this.setData({
            plan: {
              title: planData.title || '未命名计划',
              createdAt: planData.createdAt ? formatTime(new Date(planData.createdAt)) : '',
              timeLabel: timeLabel || '未设置',
              participantCount: planData.participantCount || 0
            }
          });
          
          // 如果有 qrPath，更新二维码路径
          if (planData.qrPath) {
            const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(planData.qrPath)}`;
            this.setData({ qrcodeUrl });
          }
        } else {
          const errorMsg = res.data?.message || '获取随访计划详情失败';
          console.error('获取随访计划详情失败:', res.data);
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          
          // 失败时延迟返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('获取随访计划详情请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        
        // 失败时延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    });
  },

  /**
   * 加载参与患者列表
   */
  loadParticipants(planId) {
    const app = getApp();
    const sessionToken = wx.getStorageSync('sessionToken') || app.globalData.sessionToken;
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';
    
    if (!sessionToken) {
      console.warn('未登录，无法加载参与患者列表');
      return;
    }
    
    wx.request({
      url: `${API_BASE}/v1/doctor/plans/${planId}/records`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const recordsData = res.data.data || [];
          
          // 格式化随访记录数据
          const participants = recordsData.map(record => ({
            id: record.patientId || record.id,
            name: record.patientName || '未知患者',
            fillTime: record.fillTime ? formatTime(new Date(record.fillTime)) : 
                     (record.createdAt ? formatTime(new Date(record.createdAt)) : ''),
            status: '已完成',
            recordId: record.id,
            timeType: record.timeType || '',
            admissionNumber: record.admissionNumber || ''
          }));
          
          this.setData({
            participants: participants
          });
        } else {
          const errorMsg = res.data?.message || '获取随访记录失败';
          console.error('获取随访记录失败:', res.data);
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          
          // 失败时设置为空数组
          this.setData({
            participants: []
          });
        }
      },
      fail: (err) => {
        console.error('获取随访记录请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        
        // 失败时设置为空数组
        this.setData({
          participants: []
        });
      }
    });
  },

  /**
   * 生成随访二维码
   * 注意：二维码路径会在 loadPlanDetail 中从接口获取并更新
   */
  generateQRCode(planId) {
    // 生成随访链接（默认路径，如果接口返回了 qrPath 会被覆盖）
    const followUpUrl = `/pages/patient/fill/fill?planId=${planId}`;
    
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
          const app = getApp();
          const sessionToken = wx.getStorageSync('sessionToken') || app.globalData.sessionToken;
          const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';
          const planId = this.data.planId;
          
          if (!sessionToken) {
            wx.showToast({
              title: '请先登录',
              icon: 'none',
              duration: 2000
            });
            return;
          }
          
          wx.showLoading({
            title: '处理中...'
          });
          
          wx.request({
            url: `${API_BASE}/v1/doctor/plans/${planId}/discard`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'X-LC-Session': sessionToken
            },
            success: (res) => {
              wx.hideLoading();
              
              if (res.statusCode === 200 && res.data && res.data.success) {
                wx.showToast({
                  title: '已废弃',
                  icon: 'success',
                  duration: 2000
                });
                
                // 延迟返回上一页
                setTimeout(() => {
                  wx.navigateBack();
                }, 2000);
              } else {
                const errorMsg = res.data?.message || '废弃失败';
                console.error('废弃随访计划失败:', res.data);
                wx.showToast({
                  title: errorMsg,
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('废弃随访计划请求失败:', err);
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  },

  /**
   * 查看患者填写记录
   */
  viewPatientRecord(e) {
    const patientId = e.currentTarget.dataset.id;
    if (!patientId) {
      wx.showToast({
        title: '患者信息错误',
        icon: 'none',
        duration: 2000
      });
      return;
    }
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
    const planId = this.data.planId;
    if (planId) {
      this.loadPlanDetail(planId);
      this.loadParticipants(planId);
    }
    // 注意：停止下拉刷新应该在请求完成后调用，已在各自的方法中处理
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
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