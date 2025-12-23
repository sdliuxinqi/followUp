// pages/patient/fill/fill.js
const AV = require('../../../libs/av-core-min.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    planId: '',
    planTitle: '',
    questions: [], // 其他问题（活动评估等）
    basicInfo: [], // 基本信息（姓名、性别、出生日期、身高、住院号、住院日期、联系方式，只读）
    fillableInfo: [], // 需填写的字段（体重、手术日期、随访日期）
    functionalAssessments: [], // 功能评分（按量表分组）
    answers: {},
    submitting: false,
    isPreoperative: false, // 是否是术前随访
    timeType: '', // 时间类型，用于判断是否是术前随访
    // 从接口获取的只读字段数据
    patientInfo: {
      name: '',
      gender: '',
      birthDate: '',
      height: '',
      admissionNumber: '',
      admissionDate: '',
      contact: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.planId) {
      this.setData({ 
        planId: options.planId,
        timeType: options.timeType // 保存timeType参数，用于判断是否是术前随访
      });
      // 先加载患者信息，再加载随访计划
      this.loadPatientInfo();
      this.loadFollowUpPlan(options);
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

  // 加载患者基本信息（从接口获取）
  loadPatientInfo() {
    const isDevMode = true;
    if (isDevMode) {
      // 模拟从接口获取的患者信息
      const mockPatientInfo = {
        name: '张三',
        gender: 'male',
        birthDate: '1979-05-15',
        height: '175',
        admissionNumber: '2024110001',
        admissionDate: '2024-11-01',
        contact: '138****5678'
      };
      
      // 设置只读字段的答案
      const answers = { ...this.data.answers };
      answers['basic_name'] = mockPatientInfo.name;
      answers['basic_gender'] = mockPatientInfo.gender;
      answers['basic_birth_date'] = mockPatientInfo.birthDate;
      answers['basic_height'] = mockPatientInfo.height;
      answers['basic_admission_number'] = mockPatientInfo.admissionNumber;
      answers['basic_admission_date'] = mockPatientInfo.admissionDate;
      answers['basic_contact'] = mockPatientInfo.contact;
      
      this.setData({
        patientInfo: mockPatientInfo,
        answers: answers
      });
      return;
    }
    
    // 生产环境：从接口获取患者信息
    // const query = new AV.Query('PatientProfile');
    // query.equalTo('user', AV.User.current());
    // query.first().then(profile => {
    //   const patientInfo = {
    //     name: profile.get('name'),
    //     gender: profile.get('gender') === '男' ? 'male' : 'female',
    //     birthDate: profile.get('birthDate'),
    //     height: profile.get('height'),
    //     admissionNumber: profile.get('admissionNumber'),
    //     admissionDate: profile.get('admissionDate'),
    //     contact: profile.get('phone')
    //   };
    //   
    //   const answers = { ...this.data.answers };
    //   answers['basic_name'] = patientInfo.name;
    //   answers['basic_gender'] = patientInfo.gender;
    //   answers['basic_birth_date'] = patientInfo.birthDate;
    //   answers['basic_height'] = patientInfo.height;
    //   answers['basic_admission_number'] = patientInfo.admissionNumber;
    //   answers['basic_admission_date'] = patientInfo.admissionDate;
    //   answers['basic_contact'] = patientInfo.contact;
    //   
    //   this.setData({
    //     patientInfo: patientInfo,
    //     answers: answers
    //   });
    // });
  },

  // 加载随访计划
  loadFollowUpPlan(options = {}) {
    // 开发模式直接使用mock数据
    const isDevMode = true;
    if (isDevMode || this.data.planId === 'mock001') {
      const mockPlan = {
        title: isPreoperative ? '术前基础评估' : '膝关节术后康复随访',
        questions: [
          // 基础必填项
          {
            id: 'basic_name',
            type: 'text',
            title: '姓名',
            required: true,
            readonly: true // 从接口获取，只读
          },
          {
            id: 'basic_gender',
            type: 'single',
            title: '性别',
            required: true,
            readonly: true, // 从接口获取，只读
            options: [
              { id: 'male', text: '男' },
              { id: 'female', text: '女' }
            ]
          },
          {
            id: 'basic_birth_date',
            type: 'text',
            title: '出生日期',
            required: true,
            readonly: true // 从接口获取，只读
          },
          {
            id: 'basic_height',
            type: 'text',
            title: '身高',
            required: true,
            readonly: true // 从接口获取，只读
          },
          {
            id: 'basic_weight',
            type: 'text',
            title: '体重',
            required: true,
            readonly: false // 需要手动填写
          },
          {
            id: 'basic_admission_number',
            type: 'text',
            title: '住院号',
            required: true,
            readonly: true // 从接口获取，只读
          },
          {
            id: 'basic_admission_date',
            type: 'text',
            title: '住院日期',
            required: true,
            readonly: true // 从接口获取，只读
          },
          {
            id: 'basic_surgery_date',
            type: 'text',
            title: '手术日期',
            required: true,
            readonly: false // 需要手动填写
          },
          {
            id: 'basic_visit_date',
            type: 'text',
            title: '随访日期',
            required: true,
            readonly: false // 需要手动填写
          },
          {
            id: 'basic_contact',
            type: 'text',
            title: '联系方式',
            required: true,
            readonly: true // 从接口获取，只读
          },
          // 活动评估
          {
            id: 'q_video',
            type: 'video',
            title: '膝关节屈伸视频',
            required: false
          }
        ]
      };
      
      // 判断是否是术前随访（可以根据planTitle或其他标识）
      // 如果planId包含preoperative或者title包含"术前"，则为术前随访
      const isPreoperative = this.data.planId.includes('preoperative') || 
                            mockPlan.title.includes('术前') ||
                            (options && options.timeType === 'preoperative');
      
      // 分离基本信息和其他问题
      const basicInfoFields = ['basic_name', 'basic_gender', 'basic_birth_date', 'basic_height', 
                               'basic_admission_number', 'basic_admission_date', 'basic_contact'];
      
      // 需要填写的字段（体重、手术日期、随访日期）
      const fillableFields = ['basic_weight', 'basic_surgery_date', 'basic_visit_date'];
      
      // 只读的基本信息
      const basicInfo = mockPlan.questions.filter(q => basicInfoFields.includes(q.id));
      
      // 需要填写的字段
      let fillableInfo = mockPlan.questions.filter(q => fillableFields.includes(q.id));
      // 如果是术前随访，过滤掉手术日期字段
      if (isPreoperative) {
        fillableInfo = fillableInfo.filter(q => q.id !== 'basic_surgery_date');
      }
      
      // 其他问题（活动评估等）
      const filteredQuestions = mockPlan.questions.filter(q => 
        !basicInfoFields.includes(q.id) && !fillableFields.includes(q.id)
      );
      
      // 模拟功能评分数据（按量表分组）
      const functionalAssessments = [
        {
          id: 'VAS_PAIN',
          title: '视觉模拟疼痛评分 (VAS)',
          description: '请在标尺上指出您目前的疼痛程度。',
          questions: [
            {
              id: 'vas_pain_score',
              text: '0代表无痛，10代表剧痛',
              type: 'slider',
              min: 0,
              max: 10,
              step: 1,
              required: true
            }
          ]
        },
        {
          id: 'EQ-5D-5L',
          title: '健康状况描述 (EQ-5D-5L)',
          description: '在每个标题下，请勾选最能描述您**今天**健康状况的一个选项。',
          questions: [
            {
              id: 'EQ-5D-5L_mobility',
              text: '行动能力',
              type: 'radio',
              required: true,
              options: [
                { id: 'mobility_1', score: 1, text: '我四处走动没有困难' },
                { id: 'mobility_2', score: 2, text: '我四处走动有些困难' },
                { id: 'mobility_3', score: 3, text: '我四处走动有中度困难' },
                { id: 'mobility_4', score: 4, text: '我四处走动有严重困难' },
                { id: 'mobility_5', score: 5, text: '我无法四处走动' }
              ]
            },
            {
              id: 'EQ-5D-5L_self_care',
              text: '自我照顾',
              type: 'radio',
              required: true,
              options: [
                { id: 'self_care_1', score: 1, text: '我自己洗澡或穿衣没有困难' },
                { id: 'self_care_2', score: 2, text: '我自己洗澡或穿衣有些困难' },
                { id: 'self_care_3', score: 3, text: '我自己洗澡或穿衣有中度困难' },
                { id: 'self_care_4', score: 4, text: '我自己洗澡或穿衣有严重困难' },
                { id: 'self_care_5', score: 5, text: '我无法自己洗澡或穿衣' }
              ]
            },
            {
              id: 'EQ-5D-5L_usual_activities',
              text: '日常活动（如工作、学习、家务、家庭或休闲活动）',
              type: 'radio',
              required: true,
              options: [
                { id: 'usual_1', score: 1, text: '我进行日常活动没有困难' },
                { id: 'usual_2', score: 2, text: '我进行日常活动有些困难' },
                { id: 'usual_3', score: 3, text: '我进行日常活动有中度困难' },
                { id: 'usual_4', score: 4, text: '我进行日常活动有严重困难' },
                { id: 'usual_5', score: 5, text: '我无法进行日常活动' }
              ]
            },
            {
              id: 'EQ-5D-5L_pain_discomfort',
              text: '疼痛或不舒服',
              type: 'radio',
              required: true,
              options: [
                { id: 'pain_1', score: 1, text: '我没有疼痛或不舒服' },
                { id: 'pain_2', score: 2, text: '我有轻微的疼痛或不舒服' },
                { id: 'pain_3', score: 3, text: '我有中度的疼痛或不舒服' },
                { id: 'pain_4', score: 4, text: '我有严重的疼痛或不舒服' },
                { id: 'pain_5', score: 5, text: '我有极度的疼痛或不舒服' }
              ]
            },
            {
              id: 'EQ-5D-5L_anxiety_depression',
              text: '焦虑或抑郁',
              type: 'radio',
              required: true,
              options: [
                { id: 'anxiety_1', score: 1, text: '我没有焦虑或抑郁' },
                { id: 'anxiety_2', score: 2, text: '我有轻微的焦虑或抑郁' },
                { id: 'anxiety_3', score: 3, text: '我有中度的焦虑或抑郁' },
                { id: 'anxiety_4', score: 4, text: '我有严重的焦虑或抑郁' },
                { id: 'anxiety_5', score: 5, text: '我有极度的焦虑或抑郁' }
              ]
            }
          ]
        },
        {
          id: 'OKS',
          title: '牛津膝关节评分 (OKS)',
          description: '请根据您的实际情况回答以下问题。',
          questions: [
            {
              id: 'OKS_q1',
              text: '您怎么形容您膝盖通常的疼痛程度？',
              type: 'radio',
              required: true,
              options: [
                { id: 'oks_q1_4', score: 4, text: '完全不痛' },
                { id: 'oks_q1_3', score: 3, text: '非常轻微' },
                { id: 'oks_q1_2', score: 2, text: '轻微' },
                { id: 'oks_q1_1', score: 1, text: '中度' },
                { id: 'oks_q1_0', score: 0, text: '严重' }
              ]
            },
            {
              id: 'OKS_q4',
              text: '您能够走多长时间才因为膝盖疼痛而不得不停下来？',
              type: 'radio',
              required: true,
              options: [
                { id: 'oks_q4_4', score: 4, text: '没有因为膝痛而停下/超过60分钟' },
                { id: 'oks_q4_3', score: 3, text: '16到60分钟' },
                { id: 'oks_q4_2', score: 2, text: '5到15分钟' },
                { id: 'oks_q4_1', score: 1, text: '只能在房子周围走动' },
                { id: 'oks_q4_0', score: 0, text: '完全不能行走' }
              ]
            },
            {
              id: 'OKS_q8',
              text: '您的膝盖因为疼痛会在夜里把您弄醒吗？',
              type: 'radio',
              required: true,
              options: [
                { id: 'oks_q8_4', score: 4, text: '从不' },
                { id: 'oks_q8_3', score: 3, text: '仅有一两个晚上' },
                { id: 'oks_q8_2', score: 2, text: '有些晚上会' },
                { id: 'oks_q8_1', score: 1, text: '大多数晚上会' },
                { id: 'oks_q8_0', score: 0, text: '每晚都会' }
              ]
            },
            {
              id: 'OKS_q10',
              text: '您可以自己走下楼梯吗？',
              type: 'radio',
              required: true,
              options: [
                { id: 'oks_q10_4', score: 4, text: '容易' },
                { id: 'oks_q10_3', score: 3, text: '有些困难' },
                { id: 'oks_q10_2', score: 2, text: '中度困难' },
                { id: 'oks_q10_1', score: 1, text: '非常困难' },
                { id: 'oks_q10_0', score: 0, text: '不可能做到' }
              ]
            }
          ]
        }
      ];
      
      this.setData({
        planTitle: mockPlan.title,
        basicInfo: basicInfo,
        fillableInfo: fillableInfo,
        questions: filteredQuestions,
        functionalAssessments: functionalAssessments,
        isPreoperative: isPreoperative
      });
      return;
    }

    // 生产环境实际查询代码
    const query = new AV.Query('FollowUpPlan');
    query.get(this.data.planId).then(plan => {
      const timeTypes = plan.get('timeTypes') || [];
      const isPreoperative = timeTypes.includes('preoperative');
      
      const allQuestions = plan.get('questions') || [];
      
      // 分离基本信息和其他问题
      const basicInfoFields = ['basic_name', 'basic_gender', 'basic_birth_date', 'basic_height', 
                               'basic_admission_number', 'basic_admission_date', 'basic_contact'];
      
      // 需要填写的字段（体重、手术日期、随访日期）
      const fillableFields = ['basic_weight', 'basic_surgery_date', 'basic_visit_date'];
      
      // 只读的基本信息
      const basicInfo = allQuestions.filter(q => basicInfoFields.includes(q.id));
      
      // 需要填写的字段
      let fillableInfo = allQuestions.filter(q => fillableFields.includes(q.id));
      // 如果是术前随访，过滤掉手术日期字段
      if (isPreoperative) {
        fillableInfo = fillableInfo.filter(q => q.id !== 'basic_surgery_date');
      }
      
      const questions = allQuestions.filter(q => 
        !basicInfoFields.includes(q.id) && !fillableFields.includes(q.id)
      );
      
      this.setData({
        planTitle: plan.get('title'),
        basicInfo: basicInfo,
        fillableInfo: fillableInfo,
        questions: questions,
        functionalAssessments: plan.get('functionalAssessments') || [],
        isPreoperative: isPreoperative
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