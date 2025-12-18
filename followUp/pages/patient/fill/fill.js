// pages/patient/fill/fill.js
const AV = require('../../../libs/av-core-min.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    planId: '',
    planTitle: '',
    questions: [],
    answers: {},
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.planId) {
      this.setData({ planId: options.planId });
      this.loadFollowUpPlan();
      this.checkLogin();
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

  // 检查登录状态
  checkLogin() {
    const user = AV.User.current();
    if (!user) {
      // 如果未登录，执行微信一键登录
      wx.showLoading({ title: '登录中...' });
      AV.User.loginWithWeapp().then(user => {
        wx.hideLoading();
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

  // 加载随访计划
  loadFollowUpPlan() {
    // 开发模式直接使用mock数据
    const isDevMode = true;
    if (isDevMode || this.data.planId === 'mock001') {
      const mockPlan = {
        title: '膝关节术后康复随访',
        questions: [
          // 基础必填项
          {
            id: 'basic_name',
            type: 'text',
            title: '姓名',
            required: true
          },
          {
            id: 'basic_gender',
            type: 'single',
            title: '性别',
            required: true,
            options: [
              { id: 'male', text: '男' },
              { id: 'female', text: '女' }
            ]
          },
          {
            id: 'basic_age',
            type: 'text',
            title: '年龄',
            required: true
          },
          {
            id: 'basic_height',
            type: 'text',
            title: '身高（cm）',
            required: true
          },
          {
            id: 'basic_weight',
            type: 'text',
            title: '体重（kg）',
            required: true
          },
          {
            id: 'basic_admission_date',
            type: 'text',
            title: '住院日期',
            required: true
          },
          {
            id: 'basic_surgery_date',
            type: 'text',
            title: '手术日期',
            required: true
          },
          {
            id: 'basic_visit_date',
            type: 'text',
            title: '随访日期',
            required: true
          },
          {
            id: 'basic_contact',
            type: 'text',
            title: '联系方式',
            required: true
          },
          // 随访评估内容
          {
            id: 'q1',
            type: 'slider',
            title: '当前疼痛评分（0-10分）',
            required: true
          },
          {
            id: 'q2',
            type: 'single',
            title: '关节活动度',
            required: true,
            options: [
              { id: 'o1', text: '完全受限' },
              { id: 'o2', text: '部分受限' },
              { id: 'o3', text: '基本正常' },
              { id: 'o4', text: '完全正常' }
            ]
          },
          {
            id: 'q3',
            type: 'single',
            title: '日常生活能力',
            required: true,
            options: [
              { id: 'o1', text: '完全不能自理' },
              { id: 'o2', text: '需要帮助' },
              { id: 'o3', text: '基本自理' },
              { id: 'o4', text: '完全自理' }
            ]
          },
          {
            id: 'q4',
            type: 'multi',
            title: '当前症状（可多选）',
            required: false,
            options: [
              { id: 'o1', text: '疼痛' },
              { id: 'o2', text: '肿胀' },
              { id: 'o3', text: '僵硬' },
              { id: 'o4', text: '发热' },
              { id: 'o5', text: '无以上症状' }
            ]
          },
          {
            id: 'q5',
            type: 'single',
            title: '康复训练完成情况',
            required: true,
            options: [
              { id: 'o1', text: '完全按医嘱完成' },
              { id: 'o2', text: '大部分完成' },
              { id: 'o3', text: '偶尔完成' },
              { id: 'o4', text: '未进行' }
            ]
          },
          {
            id: 'q_video',
            type: 'video',
            title: '膝关节屈伸视频',
            required: false
          },
          {
            id: 'q6',
            type: 'text',
            title: '其他需要告知医生的情况',
            required: false
          }
        ]
      };
      this.setData({
        planTitle: mockPlan.title,
        questions: mockPlan.questions
      });
      return;
    }

    // 生产环境实际查询代码
    const query = new AV.Query('FollowUpPlan');
    query.get(this.data.planId).then(plan => {
      this.setData({
        planTitle: plan.get('title'),
        questions: plan.get('questions')
      });
    }).catch(error => {
      console.error('加载随访计划失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 文本输入回答变化
  onAnswerChange(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const answer = e.detail.value;
    const answers = this.data.answers;
    answers[questionId] = answer;
    this.setData({ answers });
  },

  // 滑杆评分变化
  onSliderChange(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const answer = e.detail.value;
    const answers = this.data.answers;
    answers[questionId] = answer;
    this.setData({ answers });
  },

  // 单选题选择
  onSingleSelect(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const answer = e.detail.value;
    const answers = this.data.answers;
    answers[questionId] = answer;
    this.setData({ answers });
  },

  // 多选题选择
  onMultiSelect(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const selectedValues = e.detail.value;
    
    console.log('=== 多选题变化 ===');
    console.log('questionId:', questionId);
    console.log('selectedValues:', selectedValues);
    console.log('selectedValues类型:', typeof selectedValues, Array.isArray(selectedValues));
    console.log('当前answers:', JSON.stringify(this.data.answers));
    
    // 确保 selectedValues 是数组
    const values = Array.isArray(selectedValues) ? selectedValues : [];
    
    // 使用 setData 的对象语法直接更新
    const updateData = {};
    updateData[`answers.${questionId}`] = values;
    
    console.log('准备更新的数据:', updateData);
    
    this.setData(updateData, () => {
      console.log('setData完成');
      console.log('更新后的answers:', JSON.stringify(this.data.answers));
      console.log('该问题的答案:', this.data.answers[questionId]);
    });
  },

  // 视频上传
  onVideoUpload(e) {
    const questionId = e.currentTarget.dataset.questionId;
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: res => {
        // 上传视频到LeanCloud
        const file = new AV.File(res.tempFilePath, {
          blob: res.tempFilePath
        });
        wx.showLoading({ title: '上传中...' });
        file.save().then(savedFile => {
          wx.hideLoading();
          const answers = this.data.answers;
          answers[questionId] = savedFile.url();
          this.setData({ answers });
        }).catch(error => {
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
          console.error('视频上传失败:', error);
        });
      }
    });
  },

  // 删除视频
  onVideoDelete(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const answers = this.data.answers;
    answers[questionId] = null;
    this.setData({ answers });
  },

  // 提交随访记录
  submitFollowUp() {
    // 验证必填项
    const { questions, answers } = this.data;
    for (const question of questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0) || 
            (typeof answer === 'string' && !answer.trim())) {
          wx.showToast({
            title: `请回答第${questions.indexOf(question) + 1}题`,
            icon: 'none'
          });
          return;
        }
      }
    }

    this.setData({ submitting: true });

    // 开发模式直接跳转
    const isDevMode = true;
    if (isDevMode) {
      setTimeout(() => {
        this.setData({ submitting: false });
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/patient/record/detail/detail?id=mock001`
          });
        }, 1500);
      }, 800);
      return;
    }

    // 生产环境实际提交代码
    AV.Cloud.run('submitFollowUpRecord', {
      planId: this.data.planId,
      answers: this.data.answers
    }).then(result => {
      this.setData({ submitting: false });
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      // 跳转到结果页
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/patient/record/detail/detail?id=${result.recordId}`
        });
      }, 1500);
    }).catch(error => {
      this.setData({ submitting: false });
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
      console.error('提交失败:', error);
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