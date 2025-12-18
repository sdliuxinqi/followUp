const AV = require('../../../../libs/av-core-min.js')
const util = require('../../../../utils/util')

Page({
  data: {
    planId: '',
    patientId: '',
    record: {
      planTitle: '',
      patientName: '',
      fillTime: '',
      status: '',
      answers: [],
      requiredAnswers: [],
      optionalAnswers: [],
      requiredCount: 0,
      aiReport: {
        summary: '',
        details: [],
        suggestions: []
      }
    },
    aiAnalyzing: false,
    aiProgress: 0,
    pdfGenerating: false
  },

  onLoad(options) {
    const { planId, patientId } = options || {}
    if (planId && patientId) {
      this.setData({ planId, patientId })
      this.loadRecord()
    }
  },

  // 加载患者随访记录（医生视角）
  loadRecord() {
    const isDevMode = true

    if (isDevMode) {
      const answers = [
          { question: '姓名', answer: '张三', required: true },
          { question: '性别', answer: '男', required: true },
          { question: '年龄', answer: '45岁', required: true },
          { question: '身高', answer: '175cm', required: true },
          { question: '体重', answer: '70kg', required: true },
          { question: '住院日期', answer: '2024-11-01', required: true },
          { question: '手术日期', answer: '2024-11-05', required: true },
          { question: '随访日期', answer: '2024-12-17', required: true },
          { question: '联系方式', answer: '138****5678', required: true },
          { question: '视觉模拟疼痛评分（0-10分）', answer: '3分', required: false },
          { question: '行动能力', answer: '我四处走动有些困难', required: false },
          { question: '自我照顾', answer: '我自己洗澡或穿衣有些困难', required: false },
          { question: '日常活动（如工作、学习、家务、家庭或休闲活动）', answer: '我进行日常活动有些困难', required: false },
          { question: '疼痛或不舒服', answer: '我有轻微的疼痛或不舒服', required: false },
          { question: '焦虑或抑郁', answer: '我没有焦虑或抑郁', required: false },
          { question: '您怎么形容您膝盖通常的疼痛程度？', answer: '非常轻微', required: false },
          { question: '您能够走多长时间才因为膝盖疼痛而不得不停下来？', answer: '16到60分钟', required: false },
          { question: '您的膝盖因为疼痛会在夜里把您弄醒吗？', answer: '仅有一两个晚上', required: false },
          { question: '您可以自己走下楼梯吗？', answer: '有时可以', required: false }
      ];
      
      // 分离必填项和可选项
      const requiredAnswers = answers.filter(item => item.required);
      const optionalAnswers = answers.filter(item => !item.required);
      const requiredCount = requiredAnswers.length;
      
      const mock = {
        planTitle: '术后康复随访计划',
        patientName: '张三',
        fillTime: '2024-12-17 14:30',
        status: '已完成',
        answers: answers,
        requiredAnswers: requiredAnswers,
        optionalAnswers: optionalAnswers,
        requiredCount: requiredCount,
        aiReport: {
          summary: '患者张三，男性，45岁，BMI为22.9（正常范围），于2024年11月5日接受膝关节手术治疗，术后已42天。根据本次随访评估，术后康复进展整体良好。视觉模拟疼痛评分为3分，处于可接受范围；牛津膝关节评分显示膝盖疼痛程度为"非常轻微"；EQ-5D-5L健康量表评估显示行动能力和日常活动存在轻度困难，但自我照顾能力基本保持，无焦虑抑郁情况。患者能够持续行走16-60分钟，夜间偶有疼痛，下楼梯能力有待提高。建议继续康复训练，加强下肢力量练习。',
          details: [
            { label: '基本情况', value: '患者信息完整，身高175cm，体重70kg，BMI为22.9，属于正常范围' },
            { label: '疼痛评估', value: '良好 - VAS评分3分，牛津评分显示"非常轻微"疼痛，夜间偶有疼痛（1-2晚）' },
            { label: '功能状况', value: '恢复中 - 行动能力有轻度困难，持续行走时间16-60分钟，下楼梯能力需加强' },
            { label: '日常生活能力', value: '基本良好 - 自我照顾有轻度困难，日常活动受到一定限制' },
            { label: '心理状态', value: '良好 - 无焦虑或抑郁表现，心理状态稳定' },
            { label: '综合评分', value: 'EQ-5D-5L评分显示整体健康状况处于恢复期，各维度评分均在可接受范围内' }
          ],
          suggestions: [
            '继续疼痛管理：当前疼痛控制良好，建议根据疼痛情况适量使用止痛药物',
            '加强下肢力量训练：重点进行股四头肌和腘绳肌的力量训练，改善行走和上下楼梯能力',
            '增加耐力训练：逐步延长行走时间，目标从60分钟延长至90分钟以上',
            '改善日常活动能力：循序渐进地增加日常活动量，提高生活质量',
            '预防夜间疼痛：睡前进行适当拉伸，必要时调整睡眠姿势，使用护膝保暖',
            '定期复查：建议2周后复查，评估康复进展，根据牛津膝关节评分调整治疗方案',
            '保持健康体重：当前BMI值良好，继续保持有助于减轻膝关节负担，促进恢复'
          ]
        }
      }
      this.setData({ record: mock })
      
      // 模拟AI分析过程
      this.simulateAIAnalysis()
      return
    }

    // 生产环境可根据 planId + patientId 查询 FollowUpRecord
    const query = new AV.Query('FollowUpRecord')
    query.equalTo('planId', this.data.planId)
    query.equalTo('patientId', this.data.patientId)
    query.first().then(record => {
      if (!record) return
      const answers = record.get('answers') || [];
      const requiredAnswers = answers.filter(item => item.required);
      const optionalAnswers = answers.filter(item => !item.required);
      const requiredCount = requiredAnswers.length;
      
      const formatted = {
        planTitle: record.get('planTitle'),
        patientName: record.get('patientName'),
        fillTime: util.formatTime(record.createdAt),
        status: record.get('status'),
        answers: answers,
        requiredAnswers: requiredAnswers,
        optionalAnswers: optionalAnswers,
        requiredCount: requiredCount,
        aiReport: record.get('aiReport') || { summary: '', details: [], suggestions: [] }
      }
      this.setData({ record: formatted })
      
      // 如果还没有AI报告，触发分析
      if (!record.get('aiReport')) {
        this.generateAIReport()
      }
    }).catch(err => {
      console.error('加载患者随访记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 模拟AI分析过程（开发模式）
  simulateAIAnalysis() {
    // 不显示分析过程，直接显示结果
    // 如果需要显示分析动画，可以取消下面的注释
    /*
    this.setData({ aiAnalyzing: true, aiProgress: 0 })
    
    const interval = setInterval(() => {
      const newProgress = this.data.aiProgress + 10
      if (newProgress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          this.setData({ aiAnalyzing: false })
        }, 500)
      } else {
        this.setData({ aiProgress: newProgress })
      }
    }, 300)
    */
  },

  // 生成AI分析报告（生产环境）
  generateAIReport() {
    this.setData({ aiAnalyzing: true, aiProgress: 0 })
    
    // 调用云函数生成AI报告
    // TODO: 替换为实际的云函数调用
    /*
    AV.Cloud.run('generateAIReport', {
      planId: this.data.planId,
      patientId: this.data.patientId,
      answers: this.data.record.answers
    }).then(result => {
      const aiReport = result.aiReport || { summary: '', details: [], suggestions: [] }
      this.setData({
        'record.aiReport': aiReport,
        aiAnalyzing: false
      })
    }).catch(err => {
      console.error('生成AI报告失败', err)
      this.setData({ aiAnalyzing: false })
      wx.showToast({ title: 'AI分析失败', icon: 'none' })
    })
    */
    
    // 模拟进度
    const interval = setInterval(() => {
      const newProgress = this.data.aiProgress + 10
      if (newProgress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          this.setData({ aiAnalyzing: false })
        }, 500)
      } else {
        this.setData({ aiProgress: newProgress })
      }
    }, 300)
  },

  // 保存为PDF
  savePDF() {
    if (this.data.pdfGenerating) return
    
    this.setData({ pdfGenerating: true })
    
    wx.showLoading({
      title: '生成PDF中...',
      mask: true
    })
    
    // TODO: 调用云函数生成PDF
    // 这里模拟PDF生成过程
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ pdfGenerating: false })
      
      // 模拟下载PDF
      // 实际应用中，应该从云函数获取PDF文件URL，然后下载
      wx.showModal({
        title: 'PDF生成成功',
        content: '报告已保存到相册，您可以在相册中查看',
        showCancel: false,
        confirmText: '好的'
      })
      
      /* 实际实现示例：
      AV.Cloud.run('generateReportPDF', {
        planId: this.data.planId,
        patientId: this.data.patientId,
        record: this.data.record
      }).then(result => {
        const pdfUrl = result.pdfUrl
        
        wx.downloadFile({
          url: pdfUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              const filePath = res.tempFilePath
              
              // 保存到本地
              wx.saveFile({
                tempFilePath: filePath,
                success: (saveRes) => {
                  wx.hideLoading()
                  this.setData({ pdfGenerating: false })
                  
                  wx.showModal({
                    title: 'PDF保存成功',
                    content: '是否立即打开查看？',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openDocument({
                          filePath: saveRes.savedFilePath,
                          showMenu: true
                        })
                      }
                    }
                  })
                }
              })
            }
          },
          fail: (err) => {
            console.error('PDF下载失败', err)
            wx.hideLoading()
            this.setData({ pdfGenerating: false })
            wx.showToast({ title: 'PDF生成失败', icon: 'none' })
          }
        })
      })
      */
    }, 2000)
  },

  // 分享报告
  sharePDF() {
    if (this.data.pdfGenerating) return
    
    wx.showActionSheet({
      itemList: ['生成PDF后分享', '直接分享小程序页面'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 先生成PDF再分享
          this.savePDF()
        } else if (res.tapIndex === 1) {
          // 直接分享当前页面
          wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage', 'shareTimeline']
          })
          
          wx.showToast({
            title: '点击右上角分享',
            icon: 'none'
          })
        }
      }
    })
  }
})
