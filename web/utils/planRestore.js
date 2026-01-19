const { questionMap } = require('../config/questions')
const path = require('path')
const fs = require('fs')

// 加载量化数据
let quantificationData = null
function loadQuantificationData() {
  if (quantificationData) return quantificationData
  
  try {
    // 首先尝试加载 JS 模块（优先）
    // 使用相对路径（相对于当前文件 web/utils/planRestore.js）
    const relativeJsPath = '../../followUp/assets/db/quantification.js'
    const absoluteJsPath = path.resolve(__dirname, relativeJsPath)
    
    if (fs.existsSync(absoluteJsPath)) {
      try {
        // 清除 require 缓存（如果之前加载过）
        try {
          const cachedPath = require.resolve(absoluteJsPath)
          delete require.cache[cachedPath]
        } catch (e) {
          // 文件未在缓存中，继续
        }
        
        // 使用相对路径 require（Node.js 推荐方式）
        quantificationData = require(relativeJsPath)
        console.log('✅ 成功从 JS 模块加载量化数据，量表数量:', Array.isArray(quantificationData) ? quantificationData.length : 0)
        if (Array.isArray(quantificationData) && quantificationData.length > 0) {
          console.log('  量表列表:', quantificationData.map(s => s.code).join(', '))
        }
        return quantificationData
      } catch (requireError) {
        console.warn('⚠️ 加载 JS 模块失败，尝试其他方式:', requireError.message)
        console.warn('  尝试的相对路径:', relativeJsPath)
        console.warn('  绝对路径:', absoluteJsPath)
        console.warn('  错误堆栈:', requireError.stack)
      }
    } else {
      console.warn('⚠️ JS 模块文件不存在')
      console.warn('  相对路径:', relativeJsPath)
      console.warn('  绝对路径:', absoluteJsPath)
      console.warn('  当前工作目录:', process.cwd())
      console.warn('  __dirname:', __dirname)
    }
    
    // 尝试从多个可能的位置加载 JSON 文件
    const possiblePaths = [
      path.join(__dirname, '../../followUp/assets/db/quantification.json'),
      path.join(__dirname, '../config/quantification.json')
    ]
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        quantificationData = JSON.parse(content)
        console.log('✅ 成功从 JSON 文件加载量化数据，量表数量:', Array.isArray(quantificationData) ? quantificationData.length : 0)
        return quantificationData
      }
    }
    
    console.warn('⚠️ 未找到 quantification 文件（.js 或 .json）')
    return []
  } catch (error) {
    console.error('❌ 加载量化数据失败:', error)
    return []
  }
}

// 创建量表映射表（按 code 索引）
function getScaleMap() {
  const scales = loadQuantificationData()
  const scaleMap = {}
  
  scales.forEach(scale => {
    scaleMap[scale.code] = scale
  })
  
  return scaleMap
}

/**
 * 还原问题数据
 * @param {Array} questions - 存储的问题数组（可能只包含 id）
 * @param {Array} functionalCodes - 量表 code 数组
 * @returns {Object} { questions: [], functionalAssessments: [] }
 */
function restorePlanData(questions = [], functionalCodes = []) {
  const restoredQuestions = []
  const functionalAssessments = []
  const scaleMap = getScaleMap()
  
  // 调试日志
  console.log('🔄 restorePlanData 调用:')
  console.log('  functionalCodes:', functionalCodes)
  console.log('  functionalCodes 类型:', Array.isArray(functionalCodes) ? '数组' : typeof functionalCodes)
  console.log('  scaleMap 中的量表代码:', Object.keys(scaleMap))
  console.log('  scaleMap 大小:', Object.keys(scaleMap).length)
  
  // 还原基础问题
  questions.forEach(q => {
    // 如果已经是完整对象，直接使用
    if (q.type && q.title) {
      restoredQuestions.push(q)
      return
    }
    
    // 如果只有 id，从配置中查找
    if (q.id) {
      const config = questionMap[q.id]
      if (config) {
        restoredQuestions.push({
          id: config.id,
          type: config.type,
          title: config.title,
          text: config.text || config.title,
          options: config.options || [],
          min: config.min,
          max: config.max,
          step: config.step,
          marks: config.marks,
          required: config.required !== false,
          group: config.group
        })
      } else {
        // 如果找不到配置，保留原始数据
        console.warn(`未找到问题配置: ${q.id}`)
        restoredQuestions.push(q)
      }
    } else {
      // 保留原始数据
      restoredQuestions.push(q)
    }
  })
  
  // 还原量表数据
  console.log('📊 开始还原量表数据...')
  functionalCodes.forEach(code => {
    console.log(`  处理量表代码: ${code}`)
    const scale = scaleMap[code]
    if (scale) {
      console.log(`  ✅ 找到量表: ${scale.title} (${scale.code})`)
      console.log(`     问题数量: ${scale.content?.questions?.length || 0}`)
      functionalAssessments.push({
        id: scale.code,
        code: scale.code,
        title: scale.title,
        description: scale.content?.description || '',
        questions: (scale.content?.questions || []).map(q => ({
          id: `${scale.code}_${q.id}`,
          originalId: q.id,
          text: q.text,
          type: q.type,
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
      })
    } else {
      console.warn(`  ❌ 未找到量表配置: ${code}`)
      console.warn(`     可用的量表代码: ${Object.keys(scaleMap).join(', ')}`)
    }
  })
  console.log(`✅ 还原完成，共 ${functionalAssessments.length} 个量表`)
  
  return {
    questions: restoredQuestions,
    functionalAssessments
  }
}

module.exports = {
  restorePlanData,
  loadQuantificationData
}

