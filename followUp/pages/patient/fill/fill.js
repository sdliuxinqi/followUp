// pages/patient/fill/fill.js
const AV = require('../../../libs/av-core-min.js'); // 仅用于文件上传
const app = getApp();

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
    },
    showVideoTip: false, // 显示视频提示弹窗
    videoTipContent: '', // 视频提示内容
    pendingVideoQuestionId: '' // 待拍摄的视频问题ID
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.planId) {
      // 先检查登录状态
      this.checkLogin();
      this.setData({ 
        planId: options.planId,
        timeType: options.timeType // 保存timeType参数，用于判断是否是术前随访
      });
      // 先加载患者资料（从 PatientProfile 按 backend_schema 取性别等基础信息）
      this.loadPatientInfo();
      // 再通过 planId 从后端加载随访计划（附带患者基础信息）
      this.loadFollowUpPlan(options);
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
    // 使用自定义登录方式，检查全局用户信息
    const app = getApp();
    const user = app.globalData.user;
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    
    if (!user || !sessionToken) {
      // 如果未登录，跳转到首页进行登录
      console.log('填写页面：未登录，跳转到首页');
        wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 2000);
      return;
    }
    
    // 已登录，继续
    console.log('填写页面：已登录，用户ID:', user.id);
  },

  // 加载患者基本信息（从接口获取）
  loadPatientInfo() {
    const isDevMode = false;
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
    
    // 生产环境：优先使用首页缓存的患者资料，其次再请求接口
    const cachedProfile = app.globalData.patientProfile || wx.getStorageSync('patientProfile');
    console.log('随访问卷 loadPatientInfo 缓存的 patientProfile:', cachedProfile);
    if (cachedProfile && typeof cachedProfile === 'object') {
      const profile = cachedProfile;
      console.log('随访问卷 loadPatientInfo 使用缓存 profile.gender:', profile.gender);
      const patientInfo = {
        name: profile.name || '',
        // backend_schema: gender 建议值 male / female，这里统一映射到 male/female
        gender: profile.gender === 'male' || profile.gender === 'female'
          ? profile.gender
          : (profile.gender === '男'
            ? 'male'
            : (profile.gender === '女' ? 'female' : (profile.gender || ''))),
        birthDate: profile.birthDate || '',
        height: profile.height || '',
        admissionNumber: profile.admissionNumber || '',
        admissionDate: profile.admissionDate || '',
        contact: profile.phone || ''
      };

      const answers = { ...this.data.answers };
      console.log('随访问卷 loadPatientInfo 映射后的 patientInfo.gender:', patientInfo.gender);
      answers['basic_name'] = patientInfo.name;
      // 关键：把 basic_gender 直接设为 male/female，方便 WXS 通过 id 匹配 options
      answers['basic_gender'] = patientInfo.gender;
      answers['basic_birth_date'] = patientInfo.birthDate;
      answers['basic_height'] = patientInfo.height;
      answers['basic_admission_number'] = patientInfo.admissionNumber;
      answers['basic_admission_date'] = patientInfo.admissionDate;
      answers['basic_contact'] = patientInfo.contact;

      this.setData({
        patientInfo,
        answers
      });
      return;
    }

    // 如果没有缓存，再通过自定义后端接口获取患者信息
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';

    if (!sessionToken) {
      console.warn('未登录用户，无法加载患者信息');
      return;
    }

    wx.request({
      url: `${API_BASE}/v1/patient/profile`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        console.log('随访问卷 loadPatientInfo 接口返回:', res.data);
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const profile = res.data.data;
          console.log('随访问卷 loadPatientInfo 接口 profile.gender:', profile.gender);
          const patientInfo = {
            name: profile.name || '',
            gender: profile.gender === 'male' || profile.gender === 'female'
              ? profile.gender
              : (profile.gender === '男'
                ? 'male'
                : (profile.gender === '女' ? 'female' : (profile.gender || ''))),
            birthDate: profile.birthDate || '',
            height: profile.height || '',
            admissionNumber: profile.admissionNumber || '',
            admissionDate: profile.admissionDate || '',
            contact: profile.phone || ''
          };

          const answers = { ...this.data.answers };
          console.log('随访问卷 loadPatientInfo(接口) 映射后的 patientInfo.gender:', patientInfo.gender);
          answers['basic_name'] = patientInfo.name;
          answers['basic_gender'] = patientInfo.gender;
          answers['basic_birth_date'] = patientInfo.birthDate;
          answers['basic_height'] = patientInfo.height;
          answers['basic_admission_number'] = patientInfo.admissionNumber;
          answers['basic_admission_date'] = patientInfo.admissionDate;
          answers['basic_contact'] = patientInfo.contact;

          this.setData({
            patientInfo,
            answers
          });
        }
      },
      fail: (err) => {
        console.error('患者信息加载失败:', err);
        wx.showToast({
          title: '患者信息加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载随访计划
  loadFollowUpPlan(options = {}) {
    // 开发模式直接使用mock数据
    const isDevMode = false;
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
            readonly: false // 需要手动选择，使用日期选择器
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
            id: 'activity_knee_video',
            type: 'video',
            title: '膝关节屈伸视频',
            required: false
          },
          {
            id: 'activity_walk_video',
            type: 'video',
            title: '行走视频',
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
      
      // 需要填写的字段（始终显示手术日期，但后端会根据是否是术前随访决定是否必填）
      let fillableInfo = mockPlan.questions.filter(q => fillableFields.includes(q.id));
      
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

    // 生产环境：通过自定义后端接口按 planId 加载随访计划
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';

    if (!sessionToken) {
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 同时加载随访计划和 commitment 信息
    Promise.all([
      // 加载随访计划
      new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}/v1/followups/plans/${this.data.planId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
          success: resolve,
          fail: reject
        });
      }),
      // 加载 commitment 信息（获取住院号、住院日期、手术日期）
      new Promise((resolve, reject) => {
        wx.request({
          url: `${API_BASE}/v1/patient/commitments/${this.data.planId}/info`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'X-LC-Session': sessionToken
          },
          success: resolve,
          fail: reject
        });
      })
    ]).then(([planRes, commitmentRes]) => {
        wx.hideLoading();
      
      // 检查随访计划请求是否成功
      if (planRes.statusCode !== 200 || !planRes.data || !planRes.data.success) {
        console.error('加载随访计划失败:', planRes);
        wx.showToast({
          title: planRes.data?.message || '加载随访计划失败',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      const data = planRes.data.data || {};
          const plan = data.plan || {};
          const patientProfile = data.patientProfile || null;
      
      // 处理 commitment 数据（住院号、住院日期、手术日期）
      let commitmentData = null;
      if (commitmentRes.statusCode === 200 && commitmentRes.data && commitmentRes.data.success) {
        commitmentData = commitmentRes.data.data || null;
      } else {
        // commitment 信息获取失败不影响主流程，只记录日志
        console.warn('获取 commitment 信息失败（可选）:', commitmentRes);
      }
      
      // 处理随访计划数据
      if (plan && plan.title) {

          console.log('=== 随访计划接口返回原始数据 ===', JSON.stringify(data));
          console.log('=== plan 内容 ===', JSON.stringify(plan));

          const timeTypes = plan.timeTypes || [];
          const isPreoperative = timeTypes.includes('preoperative') ||
            (options && options.timeType === 'preoperative') ||
            this.data.timeType === 'preoperative';
      
          const allQuestions = plan.questions || [];
      
      // 分离基本信息和其他问题
        // 基本信息卡片：姓名、性别、出生日期、身高、住院号、住院日期、手术日期、联系方式
      const basicInfoFields = ['basic_name', 'basic_gender', 'basic_birth_date', 'basic_height', 
                                 'basic_admission_number', 'basic_admission_date', 'basic_surgery_date', 'basic_contact'];
      
        // 需要填写的字段（体重，随访日期不显示）
        const fillableFields = ['basic_weight'];
      
          // 只读的基本信息（强制设置性别为只读）
        let basicInfo = allQuestions
            .filter(q => basicInfoFields.includes(q.id))
            .map(q => {
              // 性别字段强制设置为只读
              if (q.id === 'basic_gender') {
                return { ...q, readonly: true };
              }
              return q;
            });
      
          // 需要填写的字段（始终显示手术日期，但后端会根据是否是术前随访决定是否必填）
      let fillableInfo = allQuestions.filter(q => fillableFields.includes(q.id));
      
          // 其他问题（活动评估等）
      const questions = allQuestions.filter(q => 
        !basicInfoFields.includes(q.id) && !fillableFields.includes(q.id)
      );

          // 功能评分量表
          let functionalAssessments = plan.functionalAssessments || [];
          const functionalCodes = plan.functionalCodes || [];
          
          console.log('=== functionalCodes (后端存储的量表代码) ===', JSON.stringify(functionalCodes));
          console.log('=== functionalAssessments (后端还原后的完整量表数据) ===', JSON.stringify(functionalAssessments));
          console.log('=== functionalAssessments 长度 ===', functionalAssessments.length);
          
          // 如果 functionalCodes 有值但 functionalAssessments 为空，说明后端还原失败
          // 前端自己根据 functionalCodes 还原量表数据（兜底方案）
          if (functionalCodes.length > 0 && functionalAssessments.length === 0) {
            console.warn('⚠️ 警告：后端返回了 functionalCodes，但 functionalAssessments 为空数组！');
            console.warn('尝试前端还原量表数据...');
            functionalAssessments = this.restoreFunctionalAssessments(functionalCodes);
            console.log('=== 前端还原后的 functionalAssessments ===', JSON.stringify(functionalAssessments));
            console.log('=== 前端还原后的 functionalAssessments 长度 ===', functionalAssessments.length);
          }

          // 如果后端返回了患者资料，顺便填充只读基础信息答案
          // 注意：这里不能把已有的 gender 清空，否则会覆盖掉 loadPatientInfo 里从 /v1/patient/profile 拿到的值
          let answers = { ...this.data.answers };
          if (patientProfile) {
            // 先用当前 answers 里的 basic_gender 作为兜底
            const currentGender = answers['basic_gender'] || '';
            // 再根据 patientProfile.gender 做一次映射（如果有值就覆盖）
            let mappedGender = '';
            if (patientProfile.gender === 'male' || patientProfile.gender === 'female') {
              mappedGender = patientProfile.gender;
            } else if (patientProfile.gender === '男') {
              mappedGender = 'male';
            } else if (patientProfile.gender === '女') {
              mappedGender = 'female';
            }

            const finalGender = mappedGender || currentGender || '';

            const patientInfo = {
              name: patientProfile.name || '',
              gender: finalGender,
              birthDate: patientProfile.birthDate || '',
              height: patientProfile.height || '',
              admissionNumber: patientProfile.admissionNumber || '',
              admissionDate: patientProfile.admissionDate || '',
              contact: patientProfile.phone || ''
            };

            answers['basic_name'] = patientInfo.name;
            if (finalGender) {
              answers['basic_gender'] = finalGender;
            }
            answers['basic_birth_date'] = patientInfo.birthDate;
            answers['basic_height'] = patientInfo.height;
            answers['basic_admission_number'] = patientInfo.admissionNumber;
            answers['basic_admission_date'] = patientInfo.admissionDate;
            answers['basic_contact'] = patientInfo.contact;

            this.setData({
              patientInfo
            });
          }
        
        // 从 commitment 中获取住院号、住院日期、手术日期（如果有）
        if (commitmentData) {
          // 优先使用 commitment 中的住院号
          if (commitmentData.admissionNumber) {
            answers['basic_admission_number'] = commitmentData.admissionNumber;
          }
          // 优先使用 commitment 中的住院日期（可编辑，不设置为只读）
          if (commitmentData.admissionDate) {
            answers['basic_admission_date'] = commitmentData.admissionDate;
          }
          // 优先使用 commitment 中的手术日期（可编辑，不设置为只读）
          if (commitmentData.surgeryDate) {
            answers['basic_surgery_date'] = commitmentData.surgeryDate;
          }
        }
        
        // 随访日期不需要显示，提交时自动获取当前日期
        // 确保 answers 中包含随访日期（使用当前日期），但不显示在界面上
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        answers['basic_visit_date'] = todayStr;
      
      this.setData({
            planTitle: plan.title || '',
            basicInfo,
            fillableInfo,
            questions,
            functionalAssessments,
            isPreoperative,
            answers
          });
        } else {
        console.error('随访计划数据格式错误:', plan);
          wx.showToast({
          title: '随访计划数据格式错误',
            icon: 'none'
      });
        }
    }).catch((err) => {
        wx.hideLoading();
      console.error('加载数据失败:', err);
      let errorMsg = '网络错误，请重试';
      if (err.errMsg) {
        if (err.errMsg.includes('timeout')) {
          errorMsg = '请求超时，请检查网络';
        } else if (err.errMsg.includes('fail')) {
          errorMsg = '网络请求失败，请检查网络连接';
        }
      }
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
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

  // 日期选择器变化
  onDateChange(e) {
    const questionId = e.currentTarget.dataset.questionId;
    const date = e.detail.value;
    const answers = this.data.answers;
    answers[questionId] = date;
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
    const selectedValue = e.detail.value;
    
    // 查找对应的选项，保存选项的完整信息（包括 score）
    // 首先找到这个问题
    let selectedOption = null;
    for (const assessment of this.data.functionalAssessments) {
      const question = (assessment.questions || []).find(q => q.id === questionId);
      if (question && question.options) {
        selectedOption = question.options.find(opt => (opt.id || opt.value) === selectedValue);
        if (selectedOption) {
          break;
        }
      }
    }
    
    // 保存答案：优先保存选项的 id，如果没有则保存 value 或 score
    // 格式：保存为对象 { optionId: '...', score: ..., text: '...' } 以便后续还原
    const answers = this.data.answers;
    if (selectedOption) {
      // 保存选项的完整信息（JSON 字符串格式，便于后端解析）
      answers[questionId] = JSON.stringify({
        optionId: selectedOption.id || selectedValue,
        score: selectedOption.score,
        text: selectedOption.text,
        value: selectedValue
      });
    } else {
      // 如果找不到选项，至少保存选中的值
      answers[questionId] = selectedValue;
    }
    
    this.setData({ answers });
    console.log(`问题 ${questionId} 选择:`, answers[questionId]);
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
    // 查找问题信息，判断是哪种视频
    const question = this.data.questions.find(q => q.id === questionId);
    const questionTitle = question ? question.title : '';
    
    // 判断视频类型并显示提示
    let tipContent = '';
    if (questionTitle.includes('膝关节屈伸') || questionId.includes('knee')) {
      tipContent = '患者平卧屈伸膝关节，相机横屏侧面拍摄';
    } else if (questionTitle.includes('行走') || questionId.includes('walk')) {
      tipContent = '患者挽起裤腿至膝盖以上或穿短裤行走，正面观拍摄';
    }
    
    // 如果有提示内容，先显示提示弹窗
    if (tipContent) {
      this.setData({
        showVideoTip: true,
        videoTipContent: tipContent,
        pendingVideoQuestionId: questionId
      });
    } else {
      // 没有提示，直接选择视频
      this.chooseVideo(questionId);
    }
  },

  // 确认提示后选择视频
  confirmVideoTip() {
    this.setData({
      showVideoTip: false
    });
    // 延迟一下再选择视频，让弹窗关闭动画完成
    setTimeout(() => {
      this.chooseVideo(this.data.pendingVideoQuestionId);
    }, 300);
  },

  // 取消提示
  cancelVideoTip() {
    this.setData({
      showVideoTip: false,
      videoTipContent: '',
      pendingVideoQuestionId: ''
    });
  },

  // 选择视频
  chooseVideo(questionId) {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: res => {
        // 暂时不走 LeanCloud 上传，直接保存本地临时路径到答案中
        // 后端如果以后需要真实可访问的 URL，可以再接入自定义上传接口
        const answers = this.data.answers;
        answers[questionId] = res.tempFilePath;
        this.setData({ answers });
        wx.showToast({
          title: '视频已选择',
          icon: 'success'
        });
      },
      fail: err => {
        console.error('选择视频失败:', err);
        wx.showToast({
          title: '选择视频失败',
          icon: 'none'
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

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
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
    const isDevMode = false;
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

    // 生产环境实际提交代码：调用自定义后端接口
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top';

    if (!sessionToken) {
      this.setData({ submitting: false });
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      });
      return;
    }

    // 自动获取当前日期作为随访日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // 确保 answers 中包含随访日期（使用当前日期）
    const finalAnswers = {
      ...this.data.answers,
      basic_visit_date: todayStr
    };

    // 只提交答案，不提交量表结构（量表结构由前端还原，不需要保存）
    const submitData = {
      planId: this.data.planId,
      timeType: this.data.timeType,
      answers: finalAnswers
    };

    // 调试日志：检查提交的答案
    console.log('=== 提交随访记录 ===')
    console.log('planId:', this.data.planId)
    console.log('timeType:', this.data.timeType)
    console.log('提交的 answers 键:', Object.keys(finalAnswers))
    console.log('量表相关答案:')
    Object.keys(finalAnswers).forEach(key => {
      if (key.startsWith('OKS_') || key.startsWith('VAS_') || key.startsWith('EQ-')) {
        console.log(`  ${key}: ${finalAnswers[key]}`)
      }
    })
    console.log('完整 answers:', JSON.stringify(finalAnswers, null, 2))

    wx.request({
      url: `${API_BASE}/v1/followups/records`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      data: submitData,
      success: (res) => {
        this.setData({ submitting: false });
        if ((res.statusCode === 200 || res.statusCode === 201) && res.data && res.data.success) {
          wx.showToast({
            title: '提交成功',
            icon: 'success',
            duration: 1500
          });
          // 返回首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/patient/home/home'
            });
          }, 1500);
        } else {
          console.error('提交随访失败:', res.data?.message || '未知错误');
          wx.showToast({
            title: res.data?.message || '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
      this.setData({ submitting: false });
        console.error('提交随访请求失败:', err);
      wx.showToast({
          title: '网络错误，请重试',
        icon: 'none'
      });
      }
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 前端还原功能评分量表数据（兜底方案）
   * 当后端返回的 functionalAssessments 为空时，根据 functionalCodes 从前端配置文件还原
   * @param {Array<string>} functionalCodes - 量表代码数组，如 ['OKS', 'KOOS-12']
   * @returns {Array} 还原后的量表数组
   */
  restoreFunctionalAssessments(functionalCodes) {
    try {
      // 加载前端配置文件
      const quantificationData = require('../../../assets/db/quantification.js');
      
      // 兼容导出格式：如果是 { default: [...] } 这种形式，取 default
      let scales = Array.isArray(quantificationData) 
        ? quantificationData 
        : (Array.isArray(quantificationData?.default) ? quantificationData.default : []);
      
      if (!Array.isArray(scales) || scales.length === 0) {
        console.warn('前端 quantification.js 数据为空或格式错误');
        return [];
      }
      
      // 创建量表映射表（按 code 索引）
      const scaleMap = {};
      scales.forEach(scale => {
        if (scale.code) {
          scaleMap[scale.code] = scale;
        }
      });
      
      // 根据 functionalCodes 还原量表
      const restoredAssessments = [];
      functionalCodes.forEach(code => {
        const scale = scaleMap[code];
        if (scale && scale.content && scale.content.questions) {
          restoredAssessments.push({
            id: scale.code,
            code: scale.code,
            title: scale.title || '',
            description: scale.content.description || '',
            questions: (scale.content.questions || []).map(q => ({
              id: `${scale.code}_${q.id}`,
              originalId: q.id,
              text: q.text || '',
              type: q.type || 'radio',
              // 为选项生成唯一 ID（格式：量表代码_问题ID_分数）
              // 如果没有 id，使用 score 作为 id 的一部分
              options: (q.options || []).map((opt, optIdx) => ({
                id: opt.id || `${scale.code}_${q.id}_${opt.score !== undefined ? opt.score : optIdx}`,
                score: opt.score,
                text: opt.text,
                value: opt.value !== undefined ? opt.value : (opt.score !== undefined ? opt.score : optIdx)
              })),
              min: q.min,
              max: q.max,
              step: q.step,
              marks: q.marks,
              required: true
            }))
          });
          console.log(`✅ 成功还原量表: ${code}, 题目数: ${scale.content.questions.length}`);
        } else {
          console.warn(`❌ 未找到量表配置: ${code}`);
        }
      });
      
      return restoredAssessments;
    } catch (error) {
      console.error('前端还原量表数据失败:', error);
      return [];
    }
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