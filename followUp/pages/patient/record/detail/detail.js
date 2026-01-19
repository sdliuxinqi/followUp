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
    loading: true,
    quantificationData: [], // 量表数据
    functionalAssessments: [] // 按量表分组的功能评估
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

  /**
   * 加载量表数据
   */
  loadQuantificationData() {
    try {
      const data = require('../../../../assets/db/quantification.js');
      this.setData({ quantificationData: data });
      return data;
    } catch (error) {
      console.error('加载量表数据失败:', error);
      this.setData({ quantificationData: [] });
      return [];
    }
  },

  /**
   * 处理随访记录，按量表分组并计算分数
   */
  processFollowRecord(record) {
    const quantificationData = this.data.quantificationData || [];
    const answers = record.answers || [];

    // 将answers转换为以questionId为key的对象，方便查找
    const answersMap = {};
    answers.forEach(item => {
      if (item.questionId) {
        answersMap[item.questionId] = item.answer;
      } else if (item.id) {
        // 兼容旧格式
        answersMap[item.id] = item.answer;
      }
    });

    // 按量表分组处理
    const functionalAssessments = [];
    const basicAnswers = []; // 非量表的基础问题

    quantificationData.forEach(scale => {
      const scaleQuestions = [];
      let totalScore = 0;
      let hasScore = false;

      scale.content.questions.forEach(question => {
        const questionId = `${scale.code}_${question.id}`;
        const answer = answersMap[questionId];

        if (answer !== undefined && answer !== null && answer !== '') {
          let score = 0;
          let displayAnswer = answer;

          // 计算分数
          if (question.type === 'slider') {
            // 滑块类型，答案就是分数
            score = parseInt(answer) || 0;
            displayAnswer = `${answer}分`;
            hasScore = true;
          } else if (question.type === 'radio' && question.options) {
            // 单选题，需要找到对应的选项和分数
            // 答案可能是选项的id（如 'mobility_2' 或 'oks_q1_3'）或选项对象
            let selectedOption = null;

            // 先尝试通过完整的id匹配（如 'mobility_2'）
            selectedOption = question.options.find(opt => {
              // 选项id可能是 'mobility_2' 格式，或者直接是 opt.id
              const optId = opt.id || `${question.id}_${opt.score}`;
              return optId === answer;
            });

            // 如果没找到，尝试通过score匹配（答案可能是score值）
            if (!selectedOption) {
              const answerScore = parseInt(answer);
              if (!isNaN(answerScore)) {
                selectedOption = question.options.find(opt => opt.score === answerScore);
              }
            }

            // 如果还没找到，尝试通过text匹配
            if (!selectedOption) {
              selectedOption = question.options.find(opt => opt.text === answer);
            }

            if (selectedOption) {
              score = selectedOption.score !== undefined ? selectedOption.score : 0;
              displayAnswer = selectedOption.text || answer;
              if (selectedOption.score !== undefined) {
                hasScore = true;
              }
            } else {
              // 如果都没找到，直接显示原答案
              displayAnswer = answer;
            }
          }

          scaleQuestions.push({
            question: question.text,
            answer: displayAnswer,
            score: score
          });

          if (hasScore) {
            totalScore += score;
          }
        }
      });

      // 如果有该量表的问题，添加到功能评估中
      if (scaleQuestions.length > 0) {
        functionalAssessments.push({
          id: scale.code,
          title: scale.title,
          description: scale.content.description,
          questions: scaleQuestions,
          totalScore: hasScore ? totalScore : undefined
        });
      }
    });

    // 处理非量表的基础问题（只保留体重和手术日期）
    const basicQuestionIds = [
      'basic_weight', 'basic_surgery_date'
    ];

    // 问题标题映射
    const questionTitleMap = {
      'basic_weight': '体重',
      'basic_surgery_date': '手术日期'
    };

    // 从answers数组和answersMap中获取基础问题
    answers.forEach(item => {
      const questionId = item.questionId || item.id;

      if (questionId && basicQuestionIds.includes(questionId)) {
        basicAnswers.push({
          questionId: questionId,
          question: questionTitleMap[questionId] || item.question || questionId,
          answer: item.answer
        });
      }
    });

    // 也从answersMap中查找（可能answers数组中没有，但在answersMap中有）
    basicQuestionIds.forEach(id => {
      const answer = answersMap[id];
      if (answer !== undefined && answer !== null && answer !== '') {
        // 检查是否已经添加过
        const exists = basicAnswers.find(item => item.questionId === id);
        if (!exists) {
          basicAnswers.push({
            questionId: id,
            question: questionTitleMap[id] || id,
            answer: answer
          });
        }
      }
    });

    // 确保按照指定顺序排列：体重、手术日期
    const orderedBasicAnswers = [];
    basicQuestionIds.forEach(id => {
      const found = basicAnswers.find(item => item.questionId === id);
      if (found) {
        orderedBasicAnswers.push({
          question: questionTitleMap[id] || found.question,
          answer: found.answer
        });
      } else {
        // 如果没找到，尝试从answersMap中直接获取
        const answer = answersMap[id];
        if (answer !== undefined && answer !== null && answer !== '') {
          orderedBasicAnswers.push({
            question: questionTitleMap[id] || id,
            answer: answer
          });
        }
      }
    });

    console.log('基本信息处理结果:', {
      basicAnswers: basicAnswers,
      orderedBasicAnswers: orderedBasicAnswers,
      answersMap: answersMap
    });

    return {
      ...record,
      basicAnswers: orderedBasicAnswers.length > 0 ? orderedBasicAnswers : basicAnswers,
      functionalAssessments: functionalAssessments
    };
  },

  // 加载随访记录详情
  loadFollowRecord() {
    this.setData({ loading: true });

    // 先加载量表数据
    const quantificationData = this.loadQuantificationData();

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
          { questionId: 'basic_name', question: '姓名', answer: '张三' },
          { questionId: 'basic_gender', question: '性别', answer: '男' },
          { questionId: 'basic_birth_date', question: '出生日期', answer: '1979-05-15' },
          { questionId: 'basic_height', question: '身高', answer: '175' },
          { questionId: 'basic_weight', question: '体重', answer: '70' },
          { questionId: 'basic_surgery_date', question: '手术日期', answer: '2024-11-05' },
          { questionId: 'VAS_PAIN_vas_value', question: '0代表无痛，10代表剧痛', answer: '3' },
          { questionId: 'EQ-5D-5L_mobility', question: '行动能力', answer: 'mobility_2' },
          { questionId: 'EQ-5D-5L_self_care', question: '自我照顾', answer: 'self_care_2' },
          { questionId: 'EQ-5D-5L_usual_activities', question: '日常活动', answer: 'usual_2' },
          { questionId: 'EQ-5D-5L_pain_discomfort', question: '疼痛或不舒服', answer: 'pain_2' },
          { questionId: 'EQ-5D-5L_anxiety_depression', question: '焦虑或抑郁', answer: 'anxiety_1' },
          { questionId: 'OKS_OKS_q1', question: '您怎么形容您膝盖通常的疼痛程度？', answer: 'oks_q1_3' },
          { questionId: 'OKS_OKS_q4', question: '您能够走多长时间才因为膝盖疼痛而不得不停下来？', answer: 'oks_q4_3' },
          { questionId: 'OKS_OKS_q8', question: '您的膝盖因为疼痛会在夜里把您弄醒吗？', answer: 'oks_q8_3' },
          { questionId: 'OKS_OKS_q10', question: '您可以自己走下楼梯吗？', answer: 'oks_q10_3' }
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

      // 等待一下确保quantificationData已设置
      setTimeout(() => {
        // 处理数据，按量表分组
        const processedRecord = this.processFollowRecord(mockRecord);
        this.setData({
          followRecord: processedRecord,
          loading: false
        });
      }, 100);
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
        answers: record.get('answers') || [],
        // 从 extraInfo 字段读取 AI 报告（符合 schema 设计）
        aiReport: record.get('extraInfo') || { summary: '', details: [], suggestions: [] }
      };

      // 处理数据，按量表分组
      const processedRecord = this.processFollowRecord(formattedRecord);
      this.setData({
        followRecord: processedRecord,
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