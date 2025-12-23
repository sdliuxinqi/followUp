// pages/doctor/plan/create/create.js
const AV = require('../../../../libs/av-core-min.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentStep: 0,
    loading: false,
    formData: {
      title: '',
      timeTypes: [] // 改为数组，支持多选
    },
    showTimeModal: false, // 控制时间选择弹窗显示
    // 选中的题目 id 列表（包含必选题目）
    selectedQuestions: [],
    assessmentScales: [],
    // 基础题目配置（非量表部分）
    availableQuestions: [
      // 一般状态（必选）
      {
        id: 'basic_name',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '姓名',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_gender',
        group: 'basic',
        type: 'single',
        typeName: '单选',
        title: '性别',
        options: ['男', '女'],
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_birth_date',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '出生日期',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_height',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '身高',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_weight',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '体重',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_admission_number',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '住院号',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_admission_date',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '住院日期',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_surgery_date',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '手术日期',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_visit_date',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '随访日期',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      {
        id: 'basic_contact',
        group: 'basic',
        type: 'text',
        typeName: '文本',
        title: '联系方式',
        required: true,
        alwaysRequiredInPlan: true,
        selected: true
      },
      // 活动评估（可选）
      {
        id: 'activity_knee_video',
        group: 'activity',
        type: 'video',
        typeName: '视频',
        title: '膝关节屈伸视频',
        required: false,
        selected: false
      },
      {
        id: 'activity_walk_video',
        group: 'activity',
        type: 'video',
        typeName: '视频',
        title: '行走视频',
        required: false,
        selected: false
      },
      // AI 辅助评估（可选）
      {
        id: 'ai_enable',
        group: 'ai',
        type: 'single',
        typeName: '单选',
        title: '启用基于已有数据的智能分析',
        options: ['是', '否'],
        required: false,
        selected: false
      }
    ],
    timeOptions: [
      { label: '日常自我评估', value: 'dailySelfAssessment', selected: false, isDaily: true },
      { label: '术前评估', value: 'preoperative', selected: false },
      { label: '术后评估', value: 'postoperative', selected: false },
      { label: '出院前评估', value: 'preDischarge', selected: false },
      { label: '手术后一月', value: 'oneMonth', selected: false },
      { label: '手术后二月', value: 'twoMonths', selected: false },
      { label: '手术后三月', value: 'threeMonths', selected: false },
      { label: '手术后四月', value: 'fourMonths', selected: false },
      { label: '手术后五月', value: 'fiveMonths', selected: false },
      { label: '手术后六月', value: 'sixMonths', selected: false },
      { label: '手术后七月', value: 'sevenMonths', selected: false },
      { label: '手术后八月', value: 'eightMonths', selected: false },
      { label: '手术后九月', value: 'nineMonths', selected: false },
      { label: '手术后十月', value: 'tenMonths', selected: false },
      { label: '手术后十一月', value: 'elevenMonths', selected: false },
      { label: '手术后十二月', value: 'twelveMonths', selected: false },
      { label: '手术后十三月', value: 'thirteenMonths', selected: false },
      { label: '手术后十四月', value: 'fourteenMonths', selected: false },
      { label: '手术后十五月', value: 'fifteenMonths', selected: false },
      { label: '手术后十六月', value: 'sixteenMonths', selected: false },
      { label: '手术后十七月', value: 'seventeenMonths', selected: false },
      { label: '手术后十八月', value: 'eighteenMonths', selected: false },
      { label: '手术后十九月', value: 'nineteenMonths', selected: false },
      { label: '手术后二十月', value: 'twentyMonths', selected: false },
      { label: '手术后二十一月', value: 'twentyOneMonths', selected: false },
      { label: '手术后二十二月', value: 'twentyTwoMonths', selected: false },
      { label: '手术后二十三月', value: 'twentyThreeMonths', selected: false },
      { label: '手术后二十四月', value: 'twentyFourMonths', selected: false }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查医生身份
    this.checkDoctorStatus();

    // 初始化必选题目为已选中
    const mandatoryIds = this.data.availableQuestions
      .filter(q => q.alwaysRequiredInPlan)
      .map(q => q.id)
    this.setData({
      selectedQuestions: mandatoryIds
    })

    // 加载评估量表数据
    this.loadQuantificationData();
  },

  /**
   * 加载评估量表数据
   */
  loadQuantificationData() {
    try {
      // 通过 JS 模块引入量表配置，避免直接 require JSON 的兼容性问题
      // 相对路径从当前页面 JS 到项目根目录下的 assets/db
      const data = require('../../../../assets/db/quantification.js')
      this.setData({
        quantificationData: data
      })
      this.transformQuantificationData()
    } catch (error) {
      console.error('加载 quantification.json 失败:', error)
      this.setData({
        assessmentScales: []
      })
    }
  },

  /**
   * 将评估量表数据转换为可用的问题结构
   */
  transformQuantificationData() {
    let { quantificationData } = this.data;

    // 兼容导出格式：如果是 { default: [...] } 这种形式，取 default
    if (!Array.isArray(quantificationData) && Array.isArray(quantificationData?.default)) {
      quantificationData = quantificationData.default
    }

    if (!quantificationData || !Array.isArray(quantificationData)) {
      console.error('quantificationData不是有效的数组', quantificationData);
      this.setData({
        assessmentScales: []
      });
      return;
    }

    try {
      // 转换评估量表数据
      const assessmentScales = quantificationData.map(scale => ({
        id: scale.code,
        title: scale.title,
        description: scale.content.description,
        expanded: false, // 默认不展开
        allSelected: false, // 默认未全选
        questions: scale.content.questions.map(question => ({
          id: `${scale.code}_${question.id}`,
          originalId: question.id,
          text: question.text,
          type: question.type,
          typeName: this.getQuestionTypeName(question.type),
          options: question.options,
          min: question.min,
          max: question.max,
          step: question.step,
          marks: question.marks,
          required: true,
          selected: false // 默认未选中
        }))
      }));

      // 只设置评估量表，不再将量表问题添加到 availableQuestions
      this.setData({
        assessmentScales
      });
    } catch (error) {
      console.error('转换评估量表数据失败:', error);
      this.setData({
        assessmentScales: []
      });
    }
  },

  /**
   * 根据问题类型获取类型名称
   */
  getQuestionTypeName(type) {
    const typeMap = {
      slider: '滑块',
      radio: '单选',
      checkbox: '多选',
      text: '文本'
    };
    return typeMap[type] || type;
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

    // 开发环境下跳过云函数调用，直接返回
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：跳过医生身份验证');
      return;
    }

    // 生产环境下调用云函数检查医生身份
    AV.Cloud.run('checkDoctorRole', { userId: user.id }).then(result => {
      if (!result.isDoctor) {
        // 不是医生，跳转到医生认证页面
        wx.navigateTo({
          url: '/pages/doctor/auth/auth'
        });
      }
    }).catch(error => {
      console.error('检查医生身份失败:', error);
      // 错误处理
      wx.showToast({
        title: '检查医生身份失败',
        icon: 'none'
      });
    });
  },

  /**
   * 输入随访计划名称
   */
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  /**
   * 切换选择问题
   */
  toggleQuestion(e) {
    const questionId = e.currentTarget.dataset.id;
    const { assessmentScales, availableQuestions, selectedQuestions } = this.data;

    // 先检查是否是基础问题（活动评估、AI评估等）
    const basicQuestionIndex = availableQuestions.findIndex(q => q.id === questionId);

    if (basicQuestionIndex !== -1) {
      const question = availableQuestions[basicQuestionIndex];

      // 一般状态等必选内容不允许取消
      if (question.alwaysRequiredInPlan) {
        return;
      }

      const newSelectedState = !question.selected;

      // 更新 selectedQuestions 数组
      let newSelectedQuestions = [...selectedQuestions];
      if (newSelectedState) {
        if (!newSelectedQuestions.includes(questionId)) {
          newSelectedQuestions.push(questionId);
        }
      } else {
        newSelectedQuestions = newSelectedQuestions.filter(id => id !== questionId);
      }

      this.setData({
        [`availableQuestions[${basicQuestionIndex}].selected`]: newSelectedState,
        selectedQuestions: newSelectedQuestions
      });
      return;
    }

    // 查找问题在哪个量表中
    let scaleIndex = -1;
    let questionIndex = -1;

    for (let i = 0; i < assessmentScales.length; i++) {
      const qIndex = assessmentScales[i].questions.findIndex(q => q.id === questionId);
      if (qIndex !== -1) {
        scaleIndex = i;
        questionIndex = qIndex;
        break;
      }
    }

    if (scaleIndex === -1 || questionIndex === -1) return;

    const question = assessmentScales[scaleIndex].questions[questionIndex];
    const newSelectedState = !question.selected;

    // 更新问题的选中状态
    const questionKey = `assessmentScales[${scaleIndex}].questions[${questionIndex}].selected`;

    // 更新 selectedQuestions 数组
    let newSelectedQuestions = [...selectedQuestions];
    if (newSelectedState) {
      if (!newSelectedQuestions.includes(questionId)) {
        newSelectedQuestions.push(questionId);
      }
    } else {
      newSelectedQuestions = newSelectedQuestions.filter(id => id !== questionId);
    }

    // 检查该量表是否全选
    const allSelected = assessmentScales[scaleIndex].questions.every((q, idx) => {
      if (idx === questionIndex) return newSelectedState;
      return q.selected;
    });

    const allSelectedKey = `assessmentScales[${scaleIndex}].allSelected`;

    this.setData({
      [questionKey]: newSelectedState,
      [allSelectedKey]: allSelected,
      selectedQuestions: newSelectedQuestions
    });
  },


  /**
   * 切换量表展开/折叠状态（只展开/折叠，不选择）
   */
  toggleScale(e) {
    const scaleId = e.currentTarget.dataset.id;
    const { assessmentScales } = this.data;

    // 找到对应的量表，切换展开状态
    const scaleIndex = assessmentScales.findIndex(s => s.id === scaleId);
    if (scaleIndex !== -1) {
      const updateKey = `assessmentScales[${scaleIndex}].expanded`;
      this.setData({
        [updateKey]: !assessmentScales[scaleIndex].expanded
      });
    }
  },

  /**
   * 选择/取消选择整个量表的问题（点击量表头部或复选框）
   */
  toggleScaleQuestions(e) {
    const scaleId = e.currentTarget.dataset.scaleId;
    const { assessmentScales, selectedQuestions } = this.data;

    // 找到对应的量表
    const scaleIndex = assessmentScales.findIndex(s => s.id === scaleId);
    if (scaleIndex === -1) return;

    const scale = assessmentScales[scaleIndex];
    const newSelectedState = !scale.allSelected;

    // 获取该量表的所有问题ID
    const scaleQuestionIds = scale.questions.map(q => q.id);

    // 更新 selectedQuestions 数组
    let newSelectedQuestions = [...selectedQuestions];
    if (newSelectedState) {
      // 全选：添加所有未选中的问题
      scaleQuestionIds.forEach(id => {
        if (!newSelectedQuestions.includes(id)) {
          newSelectedQuestions.push(id);
        }
      });
    } else {
      // 取消全选：移除该量表的所有问题
      newSelectedQuestions = newSelectedQuestions.filter(id => !scaleQuestionIds.includes(id));
    }

    // 更新所有问题的选中状态
    const updateData = {
      selectedQuestions: newSelectedQuestions,
      [`assessmentScales[${scaleIndex}].allSelected`]: newSelectedState
    };

    // 更新每个问题的 selected 属性
    scale.questions.forEach((q, qIndex) => {
      updateData[`assessmentScales[${scaleIndex}].questions[${qIndex}].selected`] = newSelectedState;
    });

    this.setData(updateData);
  },


  /**
   * 打开时间选择弹窗
   */
  openTimeModal() {
    // 根据formData.timeTypes同步timeOptions的selected状态
    const timeOptions = JSON.parse(JSON.stringify(this.data.timeOptions));
    const selectedTypes = this.data.formData.timeTypes || [];

    timeOptions.forEach(option => {
      option.selected = selectedTypes.indexOf(option.value) !== -1;
    });

    // 确保日常自我评估在最前面
    const dailyIndex = timeOptions.findIndex(opt => opt.value === 'dailySelfAssessment');
    if (dailyIndex > 0) {
      const dailyOption = timeOptions.splice(dailyIndex, 1)[0];
      timeOptions.unshift(dailyOption);
    }

    this.setData({
      showTimeModal: true,
      timeOptions: timeOptions
    });
  },

  /**
   * 关闭时间选择弹窗
   */
  closeTimeModal() {
    this.setData({
      showTimeModal: false
    });
  },

  /**
   * 切换时间点选择状态
   */
  toggleTimeOption(e) {
    const index = e.currentTarget.dataset.index;
    const timeOptions = JSON.parse(JSON.stringify(this.data.timeOptions)); // 深拷贝数组

    // 切换选中状态
    timeOptions[index].selected = !timeOptions[index].selected;

    // 更新选中的时间类型数组
    const selectedTimeTypes = timeOptions
      .filter(opt => opt.selected)
      .map(opt => opt.value);

    this.setData({
      timeOptions: timeOptions,
      'formData.timeTypes': selectedTimeTypes
    });
  },

  /**
   * 确认选择时间点
   */
  confirmTimeSelection() {
    this.closeTimeModal();
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },


  /**
   * 上一步
   */
  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  /**
   * 下一步
   */
  nextStep() {
    const { currentStep, formData } = this.data;

    if (!this.canGoNext()) {
      // 根据当前步骤给出提示
      if (currentStep === 0) {
        if (!formData.title || formData.title.trim() === '') {
          wx.showToast({
            title: '请输入随访计划名称',
            icon: 'none'
          });
        } else if (!formData.timeTypes || formData.timeTypes.length === 0) {
          wx.showToast({
            title: '请至少选择一个随访时间节点',
            icon: 'none'
          });
        }
      } else if (currentStep === 1) {
        wx.showToast({
          title: '请至少选择一项随访内容',
          icon: 'none'
        });
      }
      return;
    }

    this.setData({
      currentStep: this.data.currentStep + 1
    });
  },

  /**
   * 判断是否可以进入下一步
   */
  canGoNext() {
    const { currentStep, formData, availableQuestions, assessmentScales } = this.data;

    if (currentStep === 0) {
      // 第一步：检查计划名称和是否选择了时间节点
      return formData.title.trim() !== '' && formData.timeTypes && formData.timeTypes.length > 0;
    } else if (currentStep === 1) {
      // 第二步：检查是否选择了随访内容
      // 计算选中的问题总数
      let selectedCount = availableQuestions.filter(q => q.selected).length;
      assessmentScales.forEach(scale => {
        selectedCount += scale.questions.filter(q => q.selected).length;
      });

      return selectedCount > 0;
    }

    return true;
  },

  /**
   * 创建随访计划
   */
  createPlan() {
    this.setData({ loading: true });

    const { formData, availableQuestions, assessmentScales } = this.data;
    const app = getApp();

    // 构建问题列表：从基础问题和量表问题中收集所有选中的问题
    const questions = [];

    // 收集基础问题（一般状态、活动评估、AI评估）
    availableQuestions
      .filter(q => q.selected)
      .forEach(q => {
        questions.push({
          id: q.id,
          type: q.type,
          title: q.title,
          text: q.text,
          options: q.options || [],
          min: q.min,
          max: q.max,
          step: q.step,
          marks: q.marks,
          required: q.required
        });
      });

    // 收集量表问题
    assessmentScales.forEach(scale => {
      scale.questions
        .filter(q => q.selected)
        .forEach(q => {
          questions.push({
            id: q.id,
            type: q.type,
            title: q.title,
            text: q.text,
            options: q.options || [],
            min: q.min,
            max: q.max,
            step: q.step,
            marks: q.marks,
            required: q.required
          });
        });
    });

    // 准备创建数据
    const planData = {
      creator: app.globalData.user.id,
      title: formData.title,
      timeTypes: formData.timeTypes,
      questions: questions,
      participantCount: 0
    };

    // 开发环境下跳过云函数调用，直接返回成功
    const isDevMode = true;
    if (isDevMode) {
      console.log('开发模式：跳过创建随访计划的云函数调用');
      this.setData({ loading: false });
      wx.showToast({
        title: '创建成功（开发模式）',
        success: () => {
          // 返回医生首页
          wx.switchTab({
            url: '/pages/doctor/home/home'
          });
        }
      });
      return;
    }

    // 生产环境下调用云函数创建随访计划
    AV.Cloud.run('createFollowUpPlan', planData).then(result => {
      this.setData({ loading: false });
      wx.showToast({
        title: '创建成功',
        success: () => {
          // 返回医生首页
          wx.switchTab({
            url: '/pages/doctor/home/home'
          });
        }
      });
    }).catch(error => {
      this.setData({ loading: false });
      console.error('创建随访计划失败:', error);
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      });
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