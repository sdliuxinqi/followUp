// pages/patient/record/detail/detail.js
const AV = require('../../../../libs/av-core-min.js');
const util = require('../../../../utils/util');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    recordId: '',
    followRecord: {},
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ recordId: options.id });
      this.loadFollowRecord();
    }
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

  // 加载随访记录详情
  loadFollowRecord() {
    this.setData({ loading: true });
    
    // 开发模式：直接显示假数据
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：显示假数据');
      const mockRecord = {
        id: this.data.recordId,
        planTitle: '膝关节术后3个月康复随访',
        doctorName: '张医生',
        fillTime: '2024-12-15 14:30',
        answers: [
          { question: '当前疼痛评分（0-10分）', answer: '2分' },
          { question: '行动能力', answer: '可以独立行走，轻微不适' },
          { question: '日常生活能力评分', answer: '基本可以自理，偶尔需要帮助' },
          { question: '膝关节屈曲度', answer: '可屈曲至120度' },
          { question: '是否按时服药', answer: '是，按医嘱规律服用' },
          { question: '康复训练完成情况', answer: '每天坚持训练30分钟' },
          { question: '睡眠质量', answer: '良好，每晚可睡7-8小时' },
          { question: '伤口愈合情况', answer: '伤口已完全愈合，无红肿' },
          { question: '是否有其他不适', answer: '无明显不适' }
        ],
        aiReport: true,
        aiReportSummary: '综合分析显示，患者术后恢复情况良好，疼痛控制理想，关节功能逐步恢复，建议继续保持规律康复训练。',
        aiReportDetails: [
          { label: '疼痛控制', value: '良好 - 疼痛评分为2分，处于可接受范围' },
          { label: '关节活动度', value: '正常 - 屈曲度达到120度，符合康复预期' },
          { label: '日常活动', value: '改善中 - 基本可以独立完成日常活动' },
          { label: '康复建议', value: '继续坚持康复训练，注意休息，避免过度劳累' },
          { label: '下次随访', value: '建议1个月后进行下一次随访评估' }
        ]
      };
      this.setData({
        followRecord: mockRecord,
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

    // 实际查询代码
    const query = new AV.Query('FollowUpRecord');
    query.include('plan');
    query.get(this.data.recordId).then(record => {
      const plan = record.get('plan');
      // 格式化随访记录数据
      const formattedRecord = {
        id: record.id,
        planTitle: plan.get('title'),
        doctorName: '医生', // 这里需要根据实际数据结构获取医生名称
        fillTime: util.formatTime(record.createdAt),
        answers: record.get('answers'),
        aiReport: record.get('aiReportContent')
      };
      this.setData({
        followRecord: formattedRecord,
        loading: false
      });
    }).catch(error => {
      console.error('加载随访记录失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 下载分析报告
  downloadReport() {
    // 检查API兼容性
    if (!wx.canIUse('downloadFile') || !wx.canIUse('openDocument')) {
      wx.showToast({
        title: '当前微信版本不支持文件下载功能',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '下载中...' });
    // 模拟下载报告
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '报告下载成功',
        icon: 'success'
      });
    }, 1500);

    // 实际下载代码（待实现）
    // AV.Cloud.run('downloadAIReport', { recordId: this.data.recordId })
    //   .then(result => {
    //     wx.hideLoading();
    //     // 处理下载逻辑
    //     wx.downloadFile({
    //       url: result.url,
    //       success: res => {
    //         if (res.statusCode === 200) {
    //           wx.openDocument({
    //             filePath: res.tempFilePath,
    //             showMenu: true
    //           });
    //         }
    //       }
    //     });
    //   })
    //   .catch(error => {
    //     wx.hideLoading();
    //     wx.showToast({
    //       title: '下载失败',
    //       icon: 'none'
    //     });
    //     console.error('下载报告失败:', error);
    //   });
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
    this.loadFollowRecord();
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