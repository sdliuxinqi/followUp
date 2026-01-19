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
      functionalAssessments: [],
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
    const app = getApp()
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
      return
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    // 调用后端 API 获取患者随访记录详情
    wx.request({
      url: `${API_BASE}/v1/doctor/plans/${this.data.planId}/patients/${this.data.patientId}/record`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          const data = res.data.data || {}
          
          // 调试日志
          console.log('=== 后端返回的原始数据 ===')
          console.log('functionalAssessments:', data.functionalAssessments)
          console.log('aiReport:', data.aiReport)
          console.log('answers:', data.answers)
          if (data._debug) {
            console.log('=== 后端调试信息 ===')
            console.log('functionalCodes:', data._debug.functionalCodes)
            console.log('functionalAssessmentsCount:', data._debug.functionalAssessmentsCount)
            console.log('restoredFunctionalAssessmentsCount:', data._debug.restoredFunctionalAssessmentsCount)
            console.log('answersMapKeys:', data._debug.answersMapKeys)
            console.log('extraInfoKeys:', data._debug.extraInfoKeys)
            console.log('hasAiReport:', data._debug.hasAiReport)
          }
          
          // 格式化时间显示
          let fillTime = ''
          if (data.fillTime) {
            if (typeof data.fillTime === 'string') {
              fillTime = util.formatTime(new Date(data.fillTime))
            } else {
              fillTime = util.formatTime(data.fillTime)
            }
          }

          // 分离活动评估答案（视频等）
          const activityAnswers = (data.answers || []).filter(item => 
            item.type === 'video' || (item.id && item.id.startsWith('activity_'))
          )

          // 前端还原量表结构并填充答案
          const functionalCodes = data.functionalCodes || (data._debug && data._debug.functionalCodes) || []
          const answersMap = data.answersMap || {}
          const functionalAssessments = this.restoreAndFillFunctionalAssessments(functionalCodes, answersMap)

          const formatted = {
            planTitle: data.planTitle || '',
            patientName: data.patientName || '',
            fillTime: fillTime,
            status: data.status || 'completed',
            answers: data.answers || [],
            requiredAnswers: data.requiredAnswers || [],
            activityAnswers: activityAnswers,
            functionalAssessments: functionalAssessments,
            requiredCount: data.requiredCount || 0,
            aiReport: data.aiReport || { summary: '', details: [], suggestions: [] }
          }

          // 调试日志
          console.log('=== 格式化后的数据 ===')
          console.log('functionalCodes:', functionalCodes)
          console.log('functionalAssessments 长度:', formatted.functionalAssessments.length)
          console.log('functionalAssessments 内容:', JSON.stringify(formatted.functionalAssessments, null, 2))
          console.log('aiReport:', JSON.stringify(formatted.aiReport, null, 2))

          this.setData({ record: formatted })

          // 如果还没有AI报告，触发分析（可选，因为后端已自动生成）
          const aiReport = formatted.aiReport
          if (!aiReport || !aiReport.summary) {
            // AI报告可能正在生成中，后端会自动生成
            console.log('AI报告暂未生成')
          } else {
            console.log('AI报告已生成，summary长度:', aiReport.summary.length)
          }
        } else {
          const errorMsg = res.data?.message || '加载随访记录失败'
          console.error('加载患者随访记录失败:', errorMsg)
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载患者随访记录失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 3000
        })
      }
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
  },

  /**
   * 还原量表结构并填充答案
   * @param {Array<string>} functionalCodes - 量表代码数组
   * @param {Object} answersMap - 答案映射对象
   * @returns {Array} 还原并填充答案后的量表数组
   */
  restoreAndFillFunctionalAssessments(functionalCodes, answersMap) {
    try {
      // 加载前端配置文件
      const quantificationData = require('../../../../assets/db/quantification.js')
      
      // 兼容导出格式
      let scales = Array.isArray(quantificationData) 
        ? quantificationData 
        : (Array.isArray(quantificationData?.default) ? quantificationData.default : [])
      
      if (!Array.isArray(scales) || scales.length === 0) {
        console.warn('前端 quantification.js 数据为空或格式错误')
        return []
      }
      
      // 创建量表映射表
      const scaleMap = {}
      scales.forEach(scale => {
        if (scale.code) {
          scaleMap[scale.code] = scale
        }
      })
      
      // 根据 functionalCodes 还原量表并填充答案
      const functionalAssessments = []
      functionalCodes.forEach(code => {
        const scale = scaleMap[code]
        if (scale && scale.content && scale.content.questions) {
          const questions = scale.content.questions.map(q => {
            const questionId = `${scale.code}_${q.id}`
            let answer = answersMap[questionId]
            
            // 处理答案显示
            let answerText = ''
            let answerScore = null
            let videoUrl = null
            
            const hasAnswer = answer !== undefined && answer !== null && answer !== '' && String(answer).trim() !== ''
            
            if (hasAnswer) {
              // 如果是单选题，解析 JSON 格式的答案
              if (q.type === 'radio' && q.options && Array.isArray(q.options)) {
                let parsedAnswer = answer
                try {
                  if (typeof answer === 'string' && answer.startsWith('{')) {
                    parsedAnswer = JSON.parse(answer)
                  }
                } catch (e) {
                  // 不是 JSON，继续使用原始值
                }
                
                const searchValue = typeof parsedAnswer === 'object' && parsedAnswer !== null
                  ? (parsedAnswer.optionId || parsedAnswer.value || answer)
                  : answer
                
                const selectedOption = q.options.find(opt => 
                  opt.id === searchValue || 
                  opt.value === searchValue ||
                  (typeof parsedAnswer === 'object' && parsedAnswer !== null && opt.score === parsedAnswer.score)
                )
                
                if (selectedOption) {
                  answerText = selectedOption.text || selectedOption.label || answer
                  answerScore = selectedOption.score
                } else if (typeof parsedAnswer === 'object' && parsedAnswer !== null) {
                  answerText = parsedAnswer.text || answer
                  answerScore = parsedAnswer.score
                } else {
                  answerText = answer
                }
              } else if (q.type === 'slider') {
                answerText = `${answer}分`
              } else if (q.type === 'video') {
                answerText = '已上传视频'
                videoUrl = answer
              } else {
                answerText = String(answer)
              }
            } else {
              answerText = '未填写'
            }
            
            return {
              id: questionId,
              originalId: q.id,
              text: q.text,
              type: q.type,
              question: q.text,
              answer: answerText,
              score: answerScore,
              videoUrl: videoUrl
            }
          })
          
          // 计算总分
          const totalScore = questions.reduce((sum, q) => {
            if (q.score !== undefined && q.score !== null) {
              return sum + (typeof q.score === 'number' ? q.score : 0)
            }
            return sum
          }, 0)
          
          functionalAssessments.push({
            id: scale.code,
            code: scale.code,
            title: scale.title,
            description: scale.content.description || '',
            questions: questions,
            totalScore: totalScore > 0 ? totalScore : undefined
          })
          
          console.log(`✅ 还原并填充量表: ${code}, 问题数: ${questions.length}, 总分: ${totalScore > 0 ? totalScore : '无'}`)
        } else {
          console.warn(`❌ 未找到量表配置: ${code}`)
        }
      })
      
      return functionalAssessments
    } catch (error) {
      console.error('前端还原量表数据失败:', error)
      return []
    }
  }
})
