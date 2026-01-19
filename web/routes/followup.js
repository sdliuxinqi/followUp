const router = require('express').Router()
const AV = require('leanengine')
const https = require('https')
const { authRequired, doctorRequired, getUserFromRequest } = require('../middleware/auth')
const { restorePlanData } = require('../utils/planRestore')

const FollowUpPlan = AV.Object.extend('FollowUpPlan')
const FollowUpRecord = AV.Object.extend('FollowUpRecord')
const PatientProfile = AV.Object.extend('PatientProfile')
const Department = AV.Object.extend('Department')
const DoctorProfile = AV.Object.extend('DoctorProfile')
const DoctorTeamMember = AV.Object.extend('DoctorTeamMember')
const PatientPlanCommitment = AV.Object.extend('PatientPlanCommitment')

// 时间节点与手术日期的月份偏移（术后随访）
const TIME_TYPE_MONTH_OFFSETS = {
  oneMonth: 1,
  twoMonths: 2,
  threeMonths: 3,
  fourMonths: 4,
  fiveMonths: 5,
  sixMonths: 6,
  sevenMonths: 7,
  eightMonths: 8,
  nineMonths: 9,
  tenMonths: 10,
  elevenMonths: 11,
  twelveMonths: 12,
  thirteenMonths: 13,
  fourteenMonths: 14,
  fifteenMonths: 15,
  sixteenMonths: 16,
  seventeenMonths: 17,
  eighteenMonths: 18,
  nineteenMonths: 19,
  twentyMonths: 20,
  twentyOneMonths: 21,
  twentyTwoMonths: 22,
  twentyThreeMonths: 23,
  twentyFourMonths: 24
}

/**
 * 工具：安全解析手术日期
 * 支持 'YYYY-MM-DD' / 'YYYY/MM/DD'
 * 使用本地时区解析，避免时区问题
 */
function parseSurgeryDate(value) {
  if (!value || typeof value !== 'string') return null
  // 统一分隔符
  const normalized = value.replace(/\./g, '-').replace(/\//g, '-')
  // 使用本地时区解析日期字符串，避免时区转换问题
  const parts = normalized.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // 月份从0开始
    const day = parseInt(parts[2], 10)
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }
  // 如果解析失败，尝试使用 Date 构造函数
  const date = new Date(normalized)
  if (isNaN(date.getTime())) {
    return null
  }
  return date
}

/**
 * 工具：只比较日期部分（年、月、日），忽略时间部分
 * 返回：date1 >= date2 的比较结果
 */
function compareDateOnly(date1, date2) {
  if (!date1 || !date2) return false
  // 确保都是 Date 对象
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) return false
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false
  
  // 创建只包含日期部分的 Date 对象（时间设为 00:00:00）
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate(), 0, 0, 0, 0)
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate(), 0, 0, 0, 0)
  
  // 比较时间戳
  return d1.getTime() >= d2.getTime()
}

/**
 * 工具：在手术日期基础上增加若干"月"
 */
function addMonths(baseDate, months) {
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) return null
  const d = new Date(baseDate.getTime())
  const targetMonth = d.getMonth() + months
  d.setMonth(targetMonth)
  return d
}

/**
 * 调用 DeepSeek API 生成 AI 分析报告
 * @param {Object} params - 分析参数
 * @param {Object} params.answers - 患者回答
 * @param {Array} params.planQuestions - 计划问题列表
 * @param {Array} params.functionalAssessments - 功能评估列表
 * @param {String} params.planTitle - 计划标题
 * @param {String} params.patientName - 患者姓名
 * @returns {Promise<Object>} AI 报告对象 { summary, details, suggestions }
 */
async function generateAIReport({ answers, planQuestions, functionalAssessments, planTitle, patientName }) {
  const DEEPSEEK_API_KEY = 'sk-2ff5b81ef36c47aaa93230618ec7be50'
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

  // 构建提示词
  let prompt = `你是一位专业的医疗AI助手，需要分析患者的随访数据并生成详细的医疗分析报告。

患者信息：
- 姓名：${patientName || '未提供'}
- 随访计划：${planTitle || '未提供'}

基本信息：
`
  
  // 添加基本信息
  const basicFields = ['basic_name', 'basic_gender', 'basic_birth_date', 'basic_height', 
                       'basic_weight', 'basic_admission_number', 'basic_admission_date', 
                       'basic_surgery_date', 'basic_visit_date', 'basic_contact']
  basicFields.forEach(fieldId => {
    const question = planQuestions.find(q => q.id === fieldId)
    const answer = answers[fieldId]
    if (question && answer !== undefined && answer !== null && answer !== '') {
      const fieldName = question.title || question.text || fieldId
      prompt += `- ${fieldName}：${answer}\n`
    }
  })

  prompt += `\n功能评估结果：\n`
  
  // 添加功能评估
  if (functionalAssessments && functionalAssessments.length > 0) {
    functionalAssessments.forEach(assessment => {
      prompt += `\n${assessment.title || assessment.id}：\n`
      if (assessment.description) {
        prompt += `说明：${assessment.description}\n`
      }
      if (assessment.questions && Array.isArray(assessment.questions)) {
        assessment.questions.forEach(q => {
          const answer = answers[q.id]
          if (answer !== undefined && answer !== null && answer !== '') {
            prompt += `- ${q.question || q.text}：${answer}`
            if (q.score !== undefined) {
              prompt += `（得分：${q.score}）`
            }
            prompt += `\n`
          }
        })
      }
      if (assessment.totalScore !== undefined) {
        prompt += `总分：${assessment.totalScore}\n`
      }
    })
  }

  // 添加其他问题
  const otherQuestions = planQuestions.filter(q => 
    !basicFields.includes(q.id) && 
    (!q.group || (q.group !== 'functional' && q.group !== 'basic'))
  )
  if (otherQuestions.length > 0) {
    prompt += `\n其他评估项：\n`
    otherQuestions.forEach(q => {
      const answer = answers[q.id]
      if (answer !== undefined && answer !== null && answer !== '') {
        prompt += `- ${q.title || q.text}：${answer}\n`
      }
    })
  }

  prompt += `\n请基于以上数据生成一份专业的医疗分析报告，报告格式必须为严格的 JSON 格式，包含以下三个字段：
1. summary（字符串）：200-300字的综合评估，包括患者基本情况、手术信息、当前康复状态等
2. details（数组）：详细分析，每个元素包含 label（分析项名称）和 value（分析内容）两个字段，至少包含5项分析
3. suggestions（数组）：医疗建议列表，每个元素为字符串，至少提供5条建议

返回格式示例：
{
  "summary": "患者张三，男性，45岁，BMI为22.9（正常范围），于2024年11月5日接受膝关节手术治疗，术后已42天。根据本次随访评估，术后康复进展整体良好...",
  "details": [
    {"label": "基本情况", "value": "患者信息完整，身高175cm，体重70kg，BMI为22.9，属于正常范围"},
    {"label": "疼痛评估", "value": "良好 - VAS评分3分，牛津评分显示非常轻微疼痛"}
  ],
  "suggestions": [
    "继续疼痛管理：当前疼痛控制良好，建议根据疼痛情况适量使用止痛药物",
    "加强下肢力量训练：重点进行股四头肌和腘绳肌的力量训练"
  ]
}

请只返回 JSON 格式的数据，不要包含任何其他说明文字。`

  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const url = new URL(DEEPSEEK_API_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.error) {
            console.error('DeepSeek API 错误:', result.error)
            reject(new Error(result.error.message || 'DeepSeek API 调用失败'))
            return
          }

          if (result.choices && result.choices.length > 0) {
            const content = result.choices[0].message.content.trim()
            // 尝试提取 JSON（可能包含代码块标记）
            let jsonContent = content
            if (content.startsWith('```')) {
              // 移除代码块标记
              jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            }

            try {
              const aiReport = JSON.parse(jsonContent)
              // 验证返回格式
              if (!aiReport.summary || !Array.isArray(aiReport.details) || !Array.isArray(aiReport.suggestions)) {
                throw new Error('AI 报告格式不正确')
              }
              resolve(aiReport)
            } catch (parseError) {
              console.error('解析 AI 报告 JSON 失败:', parseError)
              console.error('原始内容:', content)
              // 如果解析失败，返回默认结构
              resolve({
                summary: content.substring(0, 500) || 'AI 分析完成，但格式解析失败',
                details: [],
                suggestions: []
              })
            }
          } else {
            reject(new Error('DeepSeek API 返回数据格式不正确'))
          }
        } catch (err) {
          console.error('解析 DeepSeek API 响应失败:', err)
          console.error('响应数据:', data)
          reject(err)
        }
      })
    })

    req.on('error', (err) => {
      console.error('DeepSeek API 请求失败:', err)
      reject(err)
    })

    req.write(requestData)
    req.end()
  })
}

/**
 * 工具：将 FollowUpPlan 转为前端友好的 JSON
 */
function formatPlan(plan) {
  if (!plan) return null
  return {
    id: plan.id,
    title: plan.get('title'),
    timeTypes: plan.get('timeTypes') || [],
    timeNodes: plan.get('timeNodes') || [],
    participantCount: plan.get('participantCount') || 0,
    creatorName: plan.get('creatorName') || '',
    creatorId: plan.get('creatorId') || (plan.get('creator') && plan.get('creator').id),
    teamLeaderId: plan.get('teamLeaderId') || (plan.get('teamLeader') && plan.get('teamLeader').id),
    teamName: plan.get('teamLeaderName') || plan.get('creatorName') || '',
    isDiscarded: plan.get('isDiscarded') || false,
    aiEnabled: plan.get('aiEnabled') || false,
    functionalCodes: plan.get('functionalCodes') || [],
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  }
}

/**
 * 工具：查找当前用户所在团队的负责人（leader）
 * 约定：
 * - 团队由负责人用户标识，所有成员记录的 leader 字段指向负责人
 * - 负责人自己也有一条 DoctorTeamMember 记录：member=leader, isLeader=true
 */
async function findTeamLeader(user) {
  const q = new AV.Query(DoctorTeamMember)
  q.equalTo('member', user)
  q.include('leader')
  const membership = await q.first({ useMasterKey: true })
  if (!membership) {
    return null
  }
  const leader = membership.get('leader')
  return leader || null
}

/**
 * 工具：确保当前用户作为负责人时，存在一条自己的团队成员记录
 */
async function ensureLeaderSelfMember(user) {
  const q = new AV.Query(DoctorTeamMember)
  q.equalTo('leader', user)
  q.equalTo('member', user)
  let self = await q.first({ useMasterKey: true })
  if (!self) {
    self = new DoctorTeamMember()
    self.set('leader', user)
    self.set('member', user)
    self.set('isLeader', true)
    self.set('isAdmin', true)
    self.set('planCount', 0)
    await self.save(null, { useMasterKey: true })
  }
  return self
}

/**
 * 工具：获取当前用户在任意团队中的一条负责人/管理员成员记录
 */
async function getOneAdminMembership(user) {
  const leaderQuery = new AV.Query(DoctorTeamMember)
  leaderQuery.equalTo('member', user)
  leaderQuery.equalTo('isLeader', true)

  const adminQuery = new AV.Query(DoctorTeamMember)
  adminQuery.equalTo('member', user)
  adminQuery.equalTo('isAdmin', true)

  const any = AV.Query.or(leaderQuery, adminQuery)
  return await any.first({ useMasterKey: true })
}

/**
 * 工具：判断当前用户是否在任意团队中为负责人或管理员
 */
async function isTeamAdmin(user) {
  const membership = await getOneAdminMembership(user)
  return !!membership
}

/**
 * 工具：格式化团队成员
 */
function formatTeamMember(memberObj) {
  const memberUser = memberObj.get('member')
  const profile = memberObj.get('doctorProfile')
  return {
    id: memberUser ? memberUser.id : memberObj.id,
    name: profile ? (profile.get('name') || '') : '',
    hospital: profile ? (profile.get('hospital') || '') : '',
    department: profile ? (profile.get('departmentName') || profile.get('department') || '') : '',
    title: profile ? (profile.get('title') || '') : '',
    isLeader: !!memberObj.get('isLeader'),
    isAdmin: !!memberObj.get('isAdmin'),
    planCount: memberObj.get('planCount') || 0
  }
}

/**
 * 工具：将 FollowUpRecord 转为前端友好的 JSON
 * 约定：
 * - 如果 includePlan=true，会把 plan 字段也一起格式化
 */
function formatRecord(record, includePlan = false) {
  if (!record) return null
  const plan = record.get('plan')
  const base = {
    id: record.id,
    planId: record.get('planId') || (plan && plan.id),
    patientId: record.get('patientId'),
    timeType: record.get('timeType') || null,
    patientName: record.get('patientName') || '',
    patientGender: record.get('patientGender') || '',
    admissionNumber: record.get('admissionNumber') || '',
    createdAt: record.createdAt,
    fillTime: record.createdAt,
    updatedAt: record.updatedAt
  }
  if (includePlan && plan) {
    base.plan = formatPlan(plan)
  }
  return base
}

/**
 * 工具：随访填写页的跳转路径（小程序内部）
 */
function buildFillMiniProgramPath(planId) {
  return `/pages/patient/fill/fill?planId=${planId}`
}

/**
 * GET /v1/patient/profile
 * 获取当前患者的基础资料
 */
router.get('/patient/profile', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const query = new AV.Query(PatientProfile)
    query.equalTo('user', user)
    const profile = await query.first({ useMasterKey: true })

    if (!profile) {
      return res.json({
        success: true,
        data: null
      })
    }

    res.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.get('name') || '',
        gender: profile.get('gender') || '',
        birthDate: profile.get('birthDate') || '',
        height: profile.get('height') || '',
        admissionNumber: profile.get('admissionNumber') || '',
        admissionDate: profile.get('admissionDate') || '',
        phone: profile.get('phone') || '',
        teamName: profile.get('teamName') || '',
        doctorId: profile.get('doctorId') || ''
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/patient/profile
 * 创建或更新当前患者的基础资料（用于小程序注册登记）
 * body:
 * {
 *   "name": "张三",
 *   "gender": "male" | "female",
 *   "birthDate": "1990-01-01",
 *   "admissionNumber": "住院号",
 *   "phone": "手机号",
 *   "teamName": "张三医生团队",
 *   "doctorId": "医生用户ID"
 * }
 */
router.post('/patient/profile', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const {
      name,
      gender,
      birthDate,
      height,
      admissionNumber,
      admissionDate,
      phone,
      teamName,
      doctorId
    } = req.body || {}

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：name / phone'
      })
    }

    // 查找是否已有患者资料
    const query = new AV.Query(PatientProfile)
    query.equalTo('user', user)
    let profile = await query.first({ useMasterKey: true })

    if (!profile) {
      profile = new PatientProfile()
      profile.set('user', user)
    }

    profile.set('name', name)
    if (gender) {
      profile.set('gender', gender)
    }
    if (birthDate) {
      profile.set('birthDate', birthDate)
    }
    if (height !== undefined) {
      profile.set('height', height)
    }
    if (admissionNumber) {
      profile.set('admissionNumber', admissionNumber)
    }
    if (admissionDate) {
      profile.set('admissionDate', admissionDate)
    }
    profile.set('phone', phone)
    if (teamName) {
      profile.set('teamName', teamName)
    }
    if (doctorId) {
      profile.set('doctorId', doctorId)
    }
    // 简单状态字段，标记待随访确认
    profile.set('status', 'pending')

    await profile.save(null, { useMasterKey: true })

    res.status(201).json({
      success: true,
      data: {
        id: profile.id
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /v1/patient/profile
 * 更新当前患者的基础资料（可用于更新个人信息：姓名、性别、出生日期、身高等）
 * body:
 * {
 *   "name": "姓名",
 *   "gender": "male" | "female",
 *   "birthDate": "1990-01-01",
 *   "height": "175",
 *   "admissionNumber": "住院号",
 *   "teamName": "张三医生团队",
 *   "doctorId": "医生用户ID"
 * }
 */
router.put('/patient/profile', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const {
      name,
      gender,
      birthDate,
      height,
      admissionNumber,
      teamName,
      doctorId
    } = req.body || {}

    // 查找是否已有患者资料
    const query = new AV.Query(PatientProfile)
    query.equalTo('user', user)
    let profile = await query.first({ useMasterKey: true })

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '患者资料不存在，请先完成注册'
      })
    }

    // 更新字段
    if (name !== undefined) {
      profile.set('name', name)
    }
    if (gender !== undefined) {
      profile.set('gender', gender)
    }
    if (birthDate !== undefined) {
      profile.set('birthDate', birthDate)
    }
    if (height !== undefined) {
      profile.set('height', height)
    }
    if (admissionNumber !== undefined) {
      profile.set('admissionNumber', admissionNumber)
    }
    if (teamName !== undefined) {
      profile.set('teamName', teamName)
    }
    if (doctorId !== undefined) {
      profile.set('doctorId', doctorId)
    }

    await profile.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        id: profile.id
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/doctor/plans
 * 获取当前医生创建的随访计划列表
 */
router.get('/doctor/plans', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const query = new AV.Query(FollowUpPlan)
    query.equalTo('creator', user)
    query.descending('createdAt')
    query.include('creator')
    const results = await query.find({ useMasterKey: true })

    // 格式化计划列表，确保 creatorName 从 DoctorProfile 获取
    const formattedPlans = await Promise.all(
      results.map(async (plan) => {
        const formatted = formatPlan(plan)
        
        // 如果 creator 存在，从 DoctorProfile 获取姓名
        const creator = plan.get('creator')
        if (creator) {
          const creatorProfileQuery = new AV.Query(DoctorProfile)
          creatorProfileQuery.equalTo('user', creator)
          const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
          if (creatorProfile) {
            const doctorName = creatorProfile.get('name')
            if (doctorName) {
              formatted.creatorName = doctorName
            }
          }
        }
        
        return formatted
      })
    )

    res.json({
      success: true,
      data: formattedPlans
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/doctor/plans
 * 创建随访计划
 * body:
 * {
 *   "title": "术后康复随访计划",
 *   "timeTypes": ["oneMonth","threeMonths"],
 *   "questions": [...],
 *   "functionalAssessments": [...optional...]
 * }
 */
router.post('/doctor/plans', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { title, timeTypes, timeNodes, questions, functionalAssessments, functionalCodes, aiEnabled } = req.body || {}

    // 调试日志
    console.log('接收到的创建计划数据:', {
      title,
      timeTypes,
      questionsCount: questions?.length || 0,
      functionalCodes,
      functionalCodesType: typeof functionalCodes,
      functionalCodesIsArray: Array.isArray(functionalCodes),
      aiEnabled
    })

    if (!title || !Array.isArray(timeTypes) || timeTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：title 或 timeTypes'
      })
    }

    // 仅允许团队负责人或管理员创建随访计划
    const adminMembership = await getOneAdminMembership(user)
    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        message: '当前用户不是团队负责人或管理员，无法创建随访计划'
      })
    }

    const teamLeader = adminMembership.get('leader') || user

    // 查找负责人姓名（团队名）
    let teamLeaderName = ''
    const leaderProfileQuery = new AV.Query(DoctorProfile)
    leaderProfileQuery.equalTo('user', teamLeader)
    const leaderProfile = await leaderProfileQuery.first({ useMasterKey: true })
    if (leaderProfile) {
      teamLeaderName = leaderProfile.get('name') || ''
    }
    if (!teamLeaderName) {
      teamLeaderName = teamLeader.get('nickname') || teamLeader.get('username') || teamLeader.get('mobilePhoneNumber') || ''
    }

    // 查找创建者姓名（从 DoctorProfile 表获取）
    let creatorName = ''
    const creatorProfileQuery = new AV.Query(DoctorProfile)
    creatorProfileQuery.equalTo('user', user)
    const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
    if (creatorProfile) {
      creatorName = creatorProfile.get('name') || ''
    }
    if (!creatorName) {
      creatorName = user.get('nickname') || user.get('username') || user.get('mobilePhoneNumber') || ''
    }

    const plan = new FollowUpPlan()
    plan.set('title', title)
    plan.set('creator', user)
    plan.set('creatorId', user.id)
    plan.set('creatorName', creatorName)
    // 记录团队负责人信息，作为团队名
    plan.set('teamLeader', teamLeader)
    plan.set('teamLeaderId', teamLeader.id)
    plan.set('teamLeaderName', teamLeaderName)
    plan.set('timeTypes', timeTypes)
    if (Array.isArray(timeNodes)) {
      plan.set('timeNodes', timeNodes) // 更丰富的时间配置，前端可自定义 label/value/offset
    }
    plan.set('questions', questions || [])
    plan.set('functionalAssessments', functionalAssessments || [])
    if (Array.isArray(functionalCodes)) {
      plan.set('functionalCodes', functionalCodes)
      console.log('设置 functionalCodes:', functionalCodes)
    } else {
      console.warn('functionalCodes 不是数组，未设置:', functionalCodes, typeof functionalCodes)
    }
    plan.set('aiEnabled', !!aiEnabled)
    plan.set('participantCount', 0)
    plan.set('isDiscarded', false)

    await plan.save(null, { useMasterKey: true })
    
    // 验证保存后的数据
    const savedFunctionalCodes = plan.get('functionalCodes')
    console.log('保存后的 functionalCodes:', savedFunctionalCodes)

    // 还原完整数据用于返回（与获取接口保持一致）
    const storedQuestions = plan.get('questions') || []
    const savedFunctionalCodesForRestore = plan.get('functionalCodes') || []
    const { questions: restoredQuestions, functionalAssessments: restoredFunctionalAssessments } = restorePlanData(storedQuestions, savedFunctionalCodesForRestore)

    res.status(201).json({
      success: true,
      data: {
        ...formatPlan(plan),
        questions: restoredQuestions,
        functionalAssessments: restoredFunctionalAssessments
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/doctor/plans/:id
 * 获取单个随访计划详情
 */
router.get('/doctor/plans/:id', doctorRequired(), async (req, res, next) => {
  try {
    const { id } = req.params
    const planQuery = new AV.Query(FollowUpPlan)
    planQuery.include('creator')
    const plan = await planQuery.get(id, { useMasterKey: true })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '随访计划不存在'
      })
    }

    // 获取存储的数据
    const storedQuestions = plan.get('questions') || []
    const functionalCodes = plan.get('functionalCodes') || []
    
    // 还原完整数据
    const { questions, functionalAssessments } = restorePlanData(storedQuestions, functionalCodes)

    // 格式化计划，确保 creatorName 从 DoctorProfile 获取
    const formatted = formatPlan(plan)
    
    // 如果 creator 存在，从 DoctorProfile 获取姓名
    const creator = plan.get('creator')
    if (creator) {
      const creatorProfileQuery = new AV.Query(DoctorProfile)
      creatorProfileQuery.equalTo('user', creator)
      const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
      if (creatorProfile) {
        const doctorName = creatorProfile.get('name')
        if (doctorName) {
          formatted.creatorName = doctorName
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...formatted,
        questions,
        functionalAssessments,
        qrPath: buildFillMiniProgramPath(plan.id)
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/doctor/plans/:id/discard
 * 废弃随访计划（逻辑删除）
 */
router.post('/doctor/plans/:id/discard', doctorRequired(), async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.currentUser

    const planQuery = new AV.Query(FollowUpPlan)
    const plan = await planQuery.get(id, { useMasterKey: true })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '随访计划不存在'
      })
    }

    const creator = plan.get('creator')
    if (creator && creator.id !== user.id) {
      return res.status(403).json({
        success: false,
        message: '无权废弃他人的随访计划'
      })
    }

    plan.set('isDiscarded', true)
    await plan.save(null, { useMasterKey: true })

    res.json({
      success: true
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/doctor/plans/:id/records
 * 获取某个随访计划下的所有随访记录（患者列表）
 */
router.get('/doctor/plans/:id/records', doctorRequired(), async (req, res, next) => {
  try {
    const { id } = req.params
    const plan = AV.Object.createWithoutData('FollowUpPlan', id)

    const query = new AV.Query(FollowUpRecord)
    query.equalTo('plan', plan)
    query.descending('createdAt')

    const results = await query.find({ useMasterKey: true })

    res.json({
      success: true,
      data: results.map(r => formatRecord(r, false))
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/patient/followups
 * 获取当前患者的随访记录列表（用于患者首页）
 * 这里仅返回已完成记录，状态默认为 completed
 */
router.get('/patient/followups', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const query = new AV.Query(FollowUpRecord)
    query.equalTo('patient', user)
    query.include('plan')
    query.descending('createdAt')

    const results = await query.find({ useMasterKey: true })

    // 处理每条记录，从 DoctorProfile 获取医生姓名
    const data = await Promise.all(
      results.map(async (record) => {
        const plan = record.get('plan')
        let doctorName = ''
        
        if (plan) {
          const creator = plan.get('creator')
          if (creator) {
            const creatorProfileQuery = new AV.Query(DoctorProfile)
            creatorProfileQuery.equalTo('user', creator)
            const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
            if (creatorProfile) {
              doctorName = creatorProfile.get('name') || ''
            }
          }
          // 如果从 DoctorProfile 没获取到，使用冗余字段作为后备
          if (!doctorName) {
            doctorName = plan.get('creatorName') || ''
          }
        }
        
        return {
          id: record.id,
          planId: plan ? plan.id : record.get('planId'),
          planTitle: plan ? plan.get('title') : '',
          doctorName: doctorName,
          fillTime: record.createdAt,
          timeType: record.get('timeType') || null,
          status: 'completed'
        }
      })
    )

    res.json({
      success: true,
      data
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/patient/commitments
 * 患者扫码绑定随访计划
 * body: { 
 *   planId: "PLAN_ID",
 *   admissionNumber: "住院号"（可选，可在绑定时或绑定后补充）,
 *   teamName: "治疗组名称"（可选）,
 *   doctorId: "医生用户ID"（可选）
 * }
 */
router.post('/patient/commitments', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const body = req.body || {}
    const planId = body.planId
    const admissionNumber = body.admissionNumber
    const teamName = body.teamName
    const doctorId = body.doctorId
    const surgeryDate = body.surgeryDate
    const admissionDate = body.admissionDate
    const dischargeDate = body.dischargeDate

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：planId'
      })
    }

    // 检查计划是否存在且未废弃
    const planQuery = new AV.Query(FollowUpPlan)
    const plan = await planQuery.get(planId, { useMasterKey: true })
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '随访计划不存在'
      })
    }
    if (plan.get('isDiscarded')) {
      return res.status(400).json({
        success: false,
        message: '随访计划已废弃，无法绑定'
      })
    }

    // 检查是否已经绑定过
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    commitmentQuery.equalTo('patient', user)
    commitmentQuery.equalTo('plan', plan)
    const existingCommitment = await commitmentQuery.first({ useMasterKey: true })

    if (existingCommitment) {
      // 已经绑定过，检查是否已有完整信息
      const existingAdmissionNumber = existingCommitment.get('admissionNumber')
      const existingTeamName = existingCommitment.get('teamName')
      const existingDoctorId = existingCommitment.get('doctorId')
      let needsSupplement = !existingAdmissionNumber || !existingTeamName || !existingDoctorId
      
      // 如果绑定时提供了新信息，更新绑定记录
      if (admissionNumber || teamName || doctorId || surgeryDate || admissionDate || dischargeDate) {
        if (admissionNumber) {
          existingCommitment.set('admissionNumber', admissionNumber)
        }
        if (teamName) {
          existingCommitment.set('teamName', teamName)
        }
        if (doctorId) {
          existingCommitment.set('doctorId', doctorId)
        }
        if (surgeryDate) {
          existingCommitment.set('surgeryDate', surgeryDate)
        }
        if (admissionDate) {
          existingCommitment.set('admissionDate', admissionDate)
        }
        if (dischargeDate) {
          existingCommitment.set('dischargeDate', dischargeDate)
        }
        await existingCommitment.save(null, { useMasterKey: true })
        // 如果提供了住院号和治疗组，则不再需要补充
        if (admissionNumber && teamName && doctorId) {
          needsSupplement = false
        }
      }
      
      return res.json({
        success: true,
        data: {
          commitmentId: existingCommitment.id,
          planId: plan.id,
          planTitle: plan.get('title') || '',
          message: '您已绑定该随访计划',
          needsSupplement: needsSupplement
        }
      })
    }

    // 检查患者是否已有当前计划
    const currentCommitmentQuery = new AV.Query(PatientPlanCommitment)
    currentCommitmentQuery.equalTo('patient', user)
    currentCommitmentQuery.equalTo('isCurrent', true)
    const currentCommitment = await currentCommitmentQuery.first({ useMasterKey: true })
    
    // 如果患者还没有当前计划，将新绑定的计划自动设置为当前计划
    const shouldSetAsCurrent = !currentCommitment

    // 创建绑定记录
    const commitment = new PatientPlanCommitment()
    commitment.set('patient', user)
    commitment.set('patientId', user.id)
    commitment.set('plan', plan)
    commitment.set('planId', plan.id)
    // 如果患者还没有当前计划，自动设置为当前计划
    if (shouldSetAsCurrent) {
      commitment.set('isCurrent', true)
    }
    // 如果绑定时提供了信息，则保存
    if (admissionNumber) {
      commitment.set('admissionNumber', admissionNumber)
    }
    if (teamName) {
      commitment.set('teamName', teamName)
    }
    if (doctorId) {
      commitment.set('doctorId', doctorId)
    }
    if (surgeryDate) {
      commitment.set('surgeryDate', surgeryDate)
    }
    if (admissionDate) {
      commitment.set('admissionDate', admissionDate)
    }
    if (dischargeDate) {
      commitment.set('dischargeDate', dischargeDate)
    }
    await commitment.save(null, { useMasterKey: true })

    // 递增参与人数
    plan.increment('participantCount', 1)
    await plan.save(null, { useMasterKey: true })

    res.status(201).json({
      success: true,
      data: {
        commitmentId: commitment.id,
        planId: plan.id,
        planTitle: plan.get('title') || '',
        message: '绑定成功',
        needsSupplement: !admissionNumber || !teamName || !doctorId
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/patient/commitments
 * 获取当前患者的随访承诺列表（基于已绑定的计划 + 手术日期计算出的时间节点）
 * - 日常自我评估：如果计划中包含 dailySelfAssessment，则在首页“日常自我评估”区块展示
 * - 术后随访：根据手术日期 + timeTypes（如 oneMonth、threeMonths 等）计算应随访日期
 *   - 已有记录：status = completed
 *   - 到期但尚未填写：status = pending
 *   - 超过应随访日期+7天未填：status = expired
 *   - 未来未到期：不返回（前端不展示）
 */
router.get('/patient/commitments', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser

    // 1. 获取患者已绑定的所有计划，只处理当前计划（isCurrent === true）
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    commitmentQuery.equalTo('patient', user)
    commitmentQuery.equalTo('isCurrent', true) // 只获取当前计划
    commitmentQuery.include('plan')
    const commitments = await commitmentQuery.find({ useMasterKey: true })

    if (commitments.length === 0) {
      return res.json({
        success: true,
        data: []
      })
    }

    // 2. 获取患者的所有随访记录
    const recordQuery = new AV.Query(FollowUpRecord)
    recordQuery.equalTo('patient', user)
    recordQuery.include('plan')
    recordQuery.ascending('createdAt')
    const records = await recordQuery.find({ useMasterKey: true })

    const now = new Date()
    const planMap = new Map()

    // 3. 按计划分组记录，并尝试从 PatientPlanCommitment 或 answers 中提取手术日期/出院日期
    // 首先从 commitment 中获取时间信息
    const commitmentTimeMap = new Map()
    commitments.forEach(commitment => {
      const plan = commitment.get('plan')
      if (!plan) return
      const planId = plan.id
      
      // 优先使用 commitment 中的 surgeryDate 或 dischargeDate
      const surgeryDateStr = commitment.get('surgeryDate')
      const dischargeDateStr = commitment.get('dischargeDate')
      
      let baseDate = null
      if (surgeryDateStr) {
        baseDate = parseSurgeryDate(surgeryDateStr)
      } else if (dischargeDateStr) {
        // 如果使用出院日期，对于术后随访节点，需要减去住院天数（假设为0，即出院当天）
        baseDate = parseSurgeryDate(dischargeDateStr)
      }
      
      if (baseDate) {
        commitmentTimeMap.set(planId, baseDate)
      }
    })
    
    records.forEach(record => {
      const plan = record.get('plan')
      if (!plan) return

      const planId = plan.id
      if (!planMap.has(planId)) {
        planMap.set(planId, {
          plan,
          records: [],
          surgeryDate: commitmentTimeMap.get(planId) || null // 优先使用 commitment 中的时间
        })
      }

      const entry = planMap.get(planId)
      entry.records.push(record)

      // 如果 commitment 中没有时间，再尝试从 answers 中提取
      if (!entry.surgeryDate) {
        try {
          const answers = record.get('answers') || {}
          const surgeryStr = answers['basic_surgery_date']
          const surgeryDate = parseSurgeryDate(surgeryStr)
          if (surgeryDate) {
            // 取最早的手术日期（防止用户多次填写）
            if (!entry.surgeryDate || surgeryDate < entry.surgeryDate) {
              entry.surgeryDate = surgeryDate
            }
          }
        } catch (e) {
          // 忽略解析错误，继续
        }
      }
    })

    const resultCommitments = []

    // 4. 为每个已绑定的计划构造承诺列表
    for (const commitment of commitments) {
      const plan = commitment.get('plan')
      if (!plan || plan.get('isDiscarded')) {
        continue // 跳过已废弃的计划
      }

      const planId = plan.id
      const entry = planMap.get(planId) || {
        plan,
        records: [],
        surgeryDate: commitmentTimeMap.get(planId) || null // 如果 planMap 中没有，从 commitmentTimeMap 中获取
      }
      // 如果 entry 中的 surgeryDate 为 null，但 commitmentTimeMap 中有，则使用 commitmentTimeMap 中的
      const surgeryDate = entry.surgeryDate || commitmentTimeMap.get(planId) || null
      const { plan: planObj, records: planRecords } = entry
      const timeTypes = planObj.get('timeTypes') || []
      
      // 获取当前计划的 isCurrent 状态
      const isCurrent = commitment.get('isCurrent') || false

      // 记录中按 timeType 建索引，便于快速查找已完成记录
      const recordByTimeType = {}
      planRecords.forEach(r => {
        const tt = r.get('timeType') || null
        if (tt) {
          // 若存在重复，以最早创建的为准（前面已按 createdAt 升序）
          if (!recordByTimeType[tt]) {
            recordByTimeType[tt] = r
          }
        }
      })

      // 获取医生/团队名称
      let doctorName = ''
      try {
        const creator = plan.get('creator')
        if (creator) {
          const creatorProfileQuery = new AV.Query(DoctorProfile)
          creatorProfileQuery.equalTo('user', creator)
          const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
          if (creatorProfile) {
            doctorName = creatorProfile.get('name') || ''
          }
        }
        if (!doctorName) {
          doctorName = plan.get('creatorName') || plan.get('teamLeaderName') || ''
        }
      } catch (e) {
        // 医生信息获取失败时忽略，使用空字符串
      }

      for (const timeType of timeTypes) {
        // 1) 日常自我评估：只要计划中选了 dailySelfAssessment，就在专门区块展示
        // 日常自我评估始终显示为 pending 状态，允许用户随时填写，不限制填写次数
        if (timeType === 'dailySelfAssessment') {
          const record = recordByTimeType[timeType] || null
          resultCommitments.push({
            id: record ? record.id : null,
            planId: planObj.id,
            planTitle: planObj.get('title') || '',
            doctorName,
            fillTime: record ? record.createdAt : null, // 显示最近一次填写时间，但状态始终为 pending
            timeType,
            status: 'pending', // 始终为 pending，允许随时填写
            isCurrent: isCurrent
          })
          continue
        }

        // 2) 术前/出院前等节点：暂时仅根据是否已填写来区分
        if (timeType === 'preoperative' || timeType === 'preDischarge') {
          const record = recordByTimeType[timeType] || null
          if (record) {
            resultCommitments.push({
              id: record.id,
              planId: planObj.id,
              planTitle: planObj.get('title') || '',
              doctorName,
              fillTime: record.createdAt,
              timeType,
              status: 'completed',
              isCurrent: isCurrent
            })
          }
          // 未填写的术前/出院前记录不再额外生成“待办”，防止术后补录造成困惑
          continue
        }

        // 3) 术后随访节点：根据手术日期 + 月份偏移，生成“待填写 / 已填写”记录
        const offsetMonths = TIME_TYPE_MONTH_OFFSETS[timeType]
        const record = recordByTimeType[timeType] || null

        // 如果时间节点类型无效，跳过
        if (typeof offsetMonths !== 'number') {
          continue
        }

        // 如果已填写过，显示为"已完成"
        if (record) {
          resultCommitments.push({
            id: record.id,
            planId: planObj.id,
            planTitle: planObj.get('title') || '',
            doctorName,
            fillTime: record.createdAt,
            timeType,
            status: 'completed',
            isCurrent: isCurrent
          })
          continue
        }

        // 如果没有手术日期，但时间节点有效，显示为"待填写"（让患者知道需要填写）
        if (!surgeryDate) {
          resultCommitments.push({
            id: null,
            planId: planObj.id,
            planTitle: planObj.get('title') || '',
            doctorName,
            fillTime: null, // 没有手术日期，无法计算具体时间
            timeType,
            status: 'pending',
            isCurrent: isCurrent
          })
          continue
        }

        const scheduledAt = addMonths(surgeryDate, offsetMonths)

        if (record) {
          // 已填写：进入"已填写随访计划"区块
          resultCommitments.push({
            id: record.id,
            planId: planObj.id,
            planTitle: planObj.get('title') || '',
            doctorName,
            fillTime: record.createdAt,
            timeType,
            status: 'completed',
            isCurrent: isCurrent
          })
        } else if (scheduledAt) {
          // 还未填写，根据当前日期和应随访日期比较（只比较日期部分，忽略时间）
          if (compareDateOnly(now, scheduledAt)) {
            // 当前日期已经超过或等于应随访日期：视为已失效（放在已完成/已失效中）
            resultCommitments.push({
              id: null,
              planId: planObj.id,
              planTitle: planObj.get('title') || '',
              doctorName,
              fillTime: scheduledAt,
              timeType,
              status: 'expired',
              isCurrent: isCurrent
            })
          } else {
            // 当前日期还未到应随访日期：作为待办事项（放在待办事项中）
            resultCommitments.push({
              id: null,
              planId: planObj.id,
              planTitle: planObj.get('title') || '',
              doctorName,
              fillTime: scheduledAt,
              timeType,
              status: 'pending',
              isCurrent: isCurrent
            })
          }
        }
        // 对于未来未到期的节点，不返回，前端也不会展示
      }
    }

    // 分离 pending 状态和其他状态的记录
    // 注意：日常自我评估（dailySelfAssessment）应该始终显示，不参与过滤
    const dailyAssessmentItems = resultCommitments.filter(item => item.timeType === 'dailySelfAssessment')
    const pendingItems = resultCommitments.filter(item => item.status === 'pending' && item.timeType !== 'dailySelfAssessment')
    const otherItems = resultCommitments.filter(item => item.status !== 'pending' && item.timeType !== 'dailySelfAssessment')

    // 对于 pending 状态的记录（排除日常自我评估），只保留 fillTime 最近（最早到期）的一条
    let filteredPendingItems = []
    if (pendingItems.length > 0) {
      // 按 fillTime 升序排序（最早的在前面），如果没有 fillTime 则放在最后
      pendingItems.sort((a, b) => {
        const ta = a.fillTime ? new Date(a.fillTime).getTime() : Infinity
        const tb = b.fillTime ? new Date(b.fillTime).getTime() : Infinity
        return ta - tb
      })
      // 只取第一条（最早到期的）
      filteredPendingItems = [pendingItems[0]]
    }

    // 合并：日常自我评估（始终显示）+ pending 记录（只有一条）+ 其他记录
    const finalResult = [...dailyAssessmentItems, ...filteredPendingItems, ...otherItems]

    // 为了跟老接口行为保持统一，按时间倒序返回（最新在前）
    finalResult.sort((a, b) => {
      const ta = a.fillTime ? new Date(a.fillTime).getTime() : 0
      const tb = b.fillTime ? new Date(b.fillTime).getTime() : 0
      return tb - ta
    })

    res.json({
      success: true,
      data: finalResult
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /v1/patient/commitments/:commitmentId
 * 更新绑定记录的住院号、治疗组和时间信息
 * body: {
 *   admissionNumber: "住院号",
 *   teamName: "治疗组名称",
 *   doctorId: "医生用户ID",
 *   surgeryDate: "手术时间（YYYY-MM-DD）",
 *   admissionDate: "住院时间（YYYY-MM-DD）",
 *   dischargeDate: "出院时间（YYYY-MM-DD）"
 * }
 */
router.put('/patient/commitments/:commitmentId', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { commitmentId } = req.params
    const { admissionNumber, teamName, doctorId, surgeryDate, admissionDate, dischargeDate } = req.body || {}

    // 查找绑定记录
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    const commitment = await commitmentQuery.get(commitmentId, { useMasterKey: true })

    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: '绑定记录不存在'
      })
    }

    // 验证是否为当前用户的绑定记录
    const commitmentPatient = commitment.get('patient')
    if (commitmentPatient.id !== user.id) {
      return res.status(403).json({
        success: false,
        message: '无权修改此绑定记录'
      })
    }

    // 更新字段
    if (admissionNumber !== undefined) {
      commitment.set('admissionNumber', admissionNumber || null)
    }
    if (teamName !== undefined) {
      commitment.set('teamName', teamName || null)
    }
    if (doctorId !== undefined) {
      commitment.set('doctorId', doctorId || null)
    }
    if (surgeryDate !== undefined) {
      commitment.set('surgeryDate', surgeryDate || null)
    }
    if (admissionDate !== undefined) {
      commitment.set('admissionDate', admissionDate || null)
    }
    if (dischargeDate !== undefined) {
      commitment.set('dischargeDate', dischargeDate || null)
    }

    await commitment.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        commitmentId: commitment.id,
        planId: commitment.get('planId')
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/patient/commitments/all
 * 获取患者所有已绑定的计划列表（不限制 isCurrent，用于"我的"页面）
 */
router.get('/patient/commitments/all', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser

    // 获取患者已绑定的所有计划
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    commitmentQuery.equalTo('patient', user)
    commitmentQuery.include('plan')
    const commitments = await commitmentQuery.find({ useMasterKey: true })

    if (commitments.length === 0) {
      return res.json({
        success: true,
        data: []
      })
    }

    const result = []

    for (const commitment of commitments) {
      const plan = commitment.get('plan')
      if (!plan || plan.get('isDiscarded')) {
        continue
      }

      // 获取医生/团队名称
      let doctorName = ''
      try {
        const creator = plan.get('creator')
        if (creator) {
          const creatorProfileQuery = new AV.Query(DoctorProfile)
          creatorProfileQuery.equalTo('user', creator)
          const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
          if (creatorProfile) {
            doctorName = creatorProfile.get('name') || ''
          }
        }
        if (!doctorName) {
          doctorName = plan.get('creatorName') || plan.get('teamLeaderName') || ''
        }
      } catch (e) {
        // 医生信息获取失败时忽略
      }

      result.push({
        commitmentId: commitment.id,
        planId: plan.id,
        planTitle: plan.get('title') || '',
        doctorName: doctorName,
        isCurrent: commitment.get('isCurrent') || false
      })
    }

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/patient/commitments/:id/info
 * 获取绑定记录信息（包括住院号和治疗组）
 * 支持通过 planId 或 commitmentId 查询
 */
router.get('/patient/commitments/:id/info', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { id } = req.params
    let commitment = null

    // 先尝试作为 commitmentId 查询
    try {
      const commitmentQuery = new AV.Query(PatientPlanCommitment)
      commitment = await commitmentQuery.get(id, { useMasterKey: true })
      
      // 验证是否为当前用户的绑定记录
      const commitmentPatient = commitment.get('patient')
      if (commitmentPatient.id !== user.id) {
        commitment = null // 不是当前用户的，重置为 null
      }
    } catch (e) {
      // 不是有效的 commitmentId，继续尝试作为 planId 查询
      commitment = null
    }

    // 如果不是 commitmentId 或查询失败，尝试作为 planId 查询
    if (!commitment) {
      const planQuery = new AV.Query(FollowUpPlan)
      const plan = await planQuery.get(id, { useMasterKey: true })
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: '随访计划或绑定记录不存在'
        })
      }

      const commitmentQuery = new AV.Query(PatientPlanCommitment)
      commitmentQuery.equalTo('patient', user)
      commitmentQuery.equalTo('plan', plan)
      commitment = await commitmentQuery.first({ useMasterKey: true })
    }

    if (!commitment) {
      return res.json({
        success: true,
        data: null
      })
    }

    res.json({
      success: true,
      data: {
        commitmentId: commitment.id,
        planId: commitment.get('planId'),
        admissionNumber: commitment.get('admissionNumber') || '',
        teamName: commitment.get('teamName') || '',
        doctorId: commitment.get('doctorId') || '',
        surgeryDate: commitment.get('surgeryDate') || '',
        admissionDate: commitment.get('admissionDate') || '',
        dischargeDate: commitment.get('dischargeDate') || '',
        isCurrent: commitment.get('isCurrent') || false
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /v1/patient/commitments/:commitmentId/current
 * 设置指定绑定记录为当前随访计划
 * 设置新的当前计划时，会自动取消其他计划的当前状态
 */
router.put('/patient/commitments/:commitmentId/current', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { commitmentId } = req.params

    // 查找绑定记录
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    const commitment = await commitmentQuery.get(commitmentId, { useMasterKey: true })

    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: '绑定记录不存在'
      })
    }

    // 验证是否为当前用户的绑定记录
    const commitmentPatient = commitment.get('patient')
    if (commitmentPatient.id !== user.id) {
      return res.status(403).json({
        success: false,
        message: '无权修改此绑定记录'
      })
    }

    // 先取消该患者所有绑定记录的当前状态
    const allCommitmentsQuery = new AV.Query(PatientPlanCommitment)
    allCommitmentsQuery.equalTo('patient', user)
    allCommitmentsQuery.equalTo('isCurrent', true)
    const currentCommitments = await allCommitmentsQuery.find({ useMasterKey: true })
    
    for (const currentCommitment of currentCommitments) {
      currentCommitment.set('isCurrent', false)
      await currentCommitment.save(null, { useMasterKey: true })
    }

    // 设置当前绑定记录为当前计划
    commitment.set('isCurrent', true)
    await commitment.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        commitmentId: commitment.id,
        planId: commitment.get('planId'),
        message: '已设置为当前随访计划'
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /v1/patient/commitments/:commitmentId/current
 * 取消当前随访计划设置
 */
router.delete('/patient/commitments/:commitmentId/current', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { commitmentId } = req.params

    // 查找绑定记录
    const commitmentQuery = new AV.Query(PatientPlanCommitment)
    const commitment = await commitmentQuery.get(commitmentId, { useMasterKey: true })

    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: '绑定记录不存在'
      })
    }

    // 验证是否为当前用户的绑定记录
    const commitmentPatient = commitment.get('patient')
    if (commitmentPatient.id !== user.id) {
      return res.status(403).json({
        success: false,
        message: '无权修改此绑定记录'
      })
    }

    // 取消当前状态
    commitment.set('isCurrent', false)
    await commitment.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        commitmentId: commitment.id,
        planId: commitment.get('planId'),
        message: '已取消当前随访计划'
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/followups/plans/:id
 * 患者填写随访前，获取计划详情 + 当前患者基础信息
 */
router.get('/followups/plans/:id', authRequired(), async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.currentUser

    const planQuery = new AV.Query(FollowUpPlan)
    planQuery.include('creator')
    const plan = await planQuery.get(id, { useMasterKey: true })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '随访计划不存在'
      })
    }

    // 查询患者基础资料
    const profileQuery = new AV.Query(PatientProfile)
    profileQuery.equalTo('user', user)
    const profile = await profileQuery.first({ useMasterKey: true })

    // 获取存储的数据
    const storedQuestions = plan.get('questions') || []
    const functionalCodes = plan.get('functionalCodes') || []
    
    // 还原完整数据
    const { questions, functionalAssessments } = restorePlanData(storedQuestions, functionalCodes)

    // 格式化计划，确保 creatorName 从 DoctorProfile 获取
    const formatted = formatPlan(plan)
    
    // 如果 creator 存在，从 DoctorProfile 获取姓名
    const creator = plan.get('creator')
    if (creator) {
      const creatorProfileQuery = new AV.Query(DoctorProfile)
      creatorProfileQuery.equalTo('user', creator)
      const creatorProfile = await creatorProfileQuery.first({ useMasterKey: true })
      if (creatorProfile) {
        const doctorName = creatorProfile.get('name')
        if (doctorName) {
          formatted.creatorName = doctorName
        }
      }
    }

    res.json({
      success: true,
      data: {
        plan: {
          ...formatted,
          questions,
          functionalAssessments
        },
        patientProfile: profile
          ? {
              id: profile.id,
              name: profile.get('name') || '',
              gender: profile.get('gender') || '',
              birthDate: profile.get('birthDate') || '',
              height: profile.get('height') || '',
              admissionNumber: profile.get('admissionNumber') || '',
              admissionDate: profile.get('admissionDate') || '',
              phone: profile.get('phone') || ''
            }
          : null
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/followups/records
 * 患者提交随访记录
 * body:
 * {
 *   "planId": "xxxx",
 *   "timeType": "oneMonth",
 *   "answers": { ... }
 * }
 */
router.post('/followups/records', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { planId, timeType, answers } = req.body || {}
    
    // 调试日志：检查接收到的答案
    console.log('=== 后端接收随访记录提交 ===')
    console.log('planId:', planId)
    console.log('timeType:', timeType)
    console.log('answers 类型:', typeof answers)
    console.log('answers 键数量:', answers ? Object.keys(answers).length : 0)
    if (answers) {
      console.log('answers 键列表:', Object.keys(answers))
      console.log('量表相关答案:')
      Object.keys(answers).forEach(key => {
        if (key.startsWith('OKS_') || key.startsWith('VAS_') || key.startsWith('EQ-')) {
          console.log(`  ${key}: ${answers[key]} (类型: ${typeof answers[key]})`)
        }
      })
      console.log('完整 answers:', JSON.stringify(answers, null, 2))
    }

    if (!planId || !answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：planId 或 answers'
      })
    }

    const planQuery = new AV.Query(FollowUpPlan)
    const plan = await planQuery.get(planId, { useMasterKey: true })
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '随访计划不存在'
      })
    }
    if (plan.get('isDiscarded')) {
      return res.status(400).json({
        success: false,
        message: '随访计划已废弃，无法提交'
      })
    }

    // 还原计划数据以进行验证（只还原基础问题，量表结构由前端还原）
    const storedQuestions = plan.get('questions') || []
    const functionalCodes = plan.get('functionalCodes') || []
    const { questions: planQuestions, functionalAssessments } = restorePlanData(storedQuestions, functionalCodes)

    // 验证必填项
    const missingRequiredFields = []
    const finalTimeType = timeType || (plan.get('timeTypes') || [])[0] || null
    const isPreoperative = finalTimeType === 'preoperative'
    
    // 验证计划中的必填问题
    planQuestions.forEach(q => {
      // 如果是术前随访，跳过手术日期字段的必填验证
      if (isPreoperative && q.id === 'basic_surgery_date') {
        return
      }
      
      if (q.required) {
        const answer = answers[q.id]
        if (answer === undefined || answer === null || answer === '') {
          missingRequiredFields.push(q.title || q.text || q.id)
        } else if (Array.isArray(answer) && answer.length === 0) {
          missingRequiredFields.push(q.title || q.text || q.id)
        } else if (typeof answer === 'string' && !answer.trim()) {
          missingRequiredFields.push(q.title || q.text || q.id)
        }
      }
    })

    // 验证功能评分量表中的必填项
    functionalAssessments.forEach(assessment => {
      if (assessment.questions && Array.isArray(assessment.questions)) {
        assessment.questions.forEach(q => {
          if (q.required !== false) { // 默认必填
            const answer = answers[q.id]
            if (answer === undefined || answer === null || answer === '') {
              missingRequiredFields.push(q.text || q.id)
            } else if (Array.isArray(answer) && answer.length === 0) {
              missingRequiredFields.push(q.text || q.id)
            } else if (typeof answer === 'string' && !answer.trim()) {
              missingRequiredFields.push(q.text || q.id)
            }
          }
        })
      }
    })

    if (missingRequiredFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `请填写以下必填项：${missingRequiredFields.slice(0, 3).join('、')}${missingRequiredFields.length > 3 ? '等' : ''}`
      })
    }

    // 检查是否重复提交（同一患者、同一计划、同一时间节点）
    if (finalTimeType) {
      const existingRecordQuery = new AV.Query(FollowUpRecord)
      existingRecordQuery.equalTo('planId', plan.id)
      existingRecordQuery.equalTo('patientId', user.id)
      existingRecordQuery.equalTo('timeType', finalTimeType)
      const existingRecord = await existingRecordQuery.first({ useMasterKey: true })
      
      if (existingRecord) {
        return res.status(400).json({
          success: false,
          message: '您已提交过该时间节点的随访记录，无法重复提交'
        })
      }
    }

    const record = new FollowUpRecord()
    record.set('plan', plan)
    record.set('planId', plan.id)
    record.set('patient', user)
    record.set('patientId', user.id)
    
    // 调试日志：检查要保存的答案
    console.log('=== 准备保存到数据库 ===')
    console.log('要保存的 answers 键数量:', Object.keys(answers).length)
    console.log('量表相关答案:')
    Object.keys(answers).forEach(key => {
      if (key.startsWith('OKS_') || key.startsWith('VAS_') || key.startsWith('EQ-')) {
        console.log(`  ${key}: ${answers[key]} (类型: ${typeof answers[key]})`)
      }
    })
    
    record.set('answers', answers)
    record.set('timeType', finalTimeType)

    record.set('patientName', answers['basic_name'] || '')
    record.set('patientGender', answers['basic_gender'] || '')
    record.set('admissionNumber', answers['basic_admission_number'] || '')
    
    // 注意：不保存 functionalAssessments 结构，只保存答案
    // 量表结构由前端根据 functionalCodes 还原

    await record.save(null, { useMasterKey: true })

    // 递增参与人数
    plan.increment('participantCount', 1)
    await plan.save(null, { useMasterKey: true })

    // 异步调用 DeepSeek API 生成 AI 报告
    generateAIReport({
      answers,
      planQuestions,
      functionalAssessments,
      planTitle: plan.get('title') || '',
      patientName: answers['basic_name'] || ''
    }).then(aiReport => {
      // 更新记录的 AI 报告到 extraInfo 字段（符合 schema 设计）
      record.set('extraInfo', aiReport)
      return record.save(null, { useMasterKey: true })
    }).catch(err => {
      // AI 报告生成失败不影响记录保存，只记录错误
      console.error('生成 AI 报告失败:', err)
      // 设置默认的空报告
      record.set('extraInfo', {
        summary: 'AI 分析报告生成中，请稍后刷新查看',
        details: [],
        suggestions: []
      })
      return record.save(null, { useMasterKey: true }).catch(saveErr => {
        console.error('保存 AI 报告失败:', saveErr)
      })
    })

    res.status(201).json({
      success: true,
      data: {
        recordId: record.id
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/doctor/plans/:planId/patients/:patientId/record
 * 医生查看某随访计划下指定患者的随访详情
 */
router.get('/doctor/plans/:planId/patients/:patientId/record', doctorRequired(), async (req, res, next) => {
  try {
    const { planId, patientId } = req.params
    if (!planId || !patientId) {
      return res.status(400).json({
        success: false,
        message: '缺少 planId 或 patientId'
      })
    }

    const query = new AV.Query(FollowUpRecord)
    query.equalTo('planId', planId)
    query.equalTo('patientId', patientId)
    query.include('plan')
    const record = await query.first({ useMasterKey: true })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '未找到该患者的随访记录'
      })
    }

    let plan = record.get('plan')
    
    // 如果 plan 只是一个 Pointer，需要单独查询
    if (!plan || !plan.get) {
      const planQuery = new AV.Query(FollowUpPlan)
      plan = await planQuery.get(planId, { useMasterKey: true })
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: '随访计划不存在'
        })
      }
    }
    
    const storedQuestions = (plan && plan.get('questions')) || []
    const answersMap = record.get('answers') || {}
    let functionalCodes = (plan && plan.get('functionalCodes')) || []
    
    // 如果 functionalCodes 为空，尝试从答案中推断（向后兼容）
    if (!functionalCodes || (Array.isArray(functionalCodes) && functionalCodes.length === 0)) {
      console.log('⚠️ 计划的 functionalCodes 为空，尝试从答案中推断...')
      const inferredCodes = new Set()
      const answerKeys = Object.keys(answersMap)
      
      answerKeys.forEach(key => {
        const match = key.match(/^([A-Z][A-Z0-9_-]+)_/)
        if (match && match[1]) {
          inferredCodes.add(match[1])
        }
      })
      
      if (inferredCodes.size > 0) {
        functionalCodes = Array.from(inferredCodes)
        console.log('✅ 从答案中推断出的 functionalCodes:', functionalCodes)
      }
    }
    
    // 还原基础问题（用于基本信息展示）
    const { questions: planQuestions } = restorePlanData(storedQuestions, [])
    
    // 注意：不在这里还原 functionalAssessments
    // 量表结构由前端根据 functionalCodes 和 answers 还原
    // 后端只返回 functionalCodes 和 answers，前端负责还原并填充答案

    // 基础/活动/AI 评估题目的平铺答案，用于详情页展示
    const answers = planQuestions
      .filter(q => !q.group || q.group === 'basic' || q.group === 'activity' || q.group === 'ai')
      .map(q => {
        const answerValue = answersMap[q.id] !== undefined ? answersMap[q.id] : null
        return {
          id: q.id,
          question: q.title || q.text || q.id,
          type: q.type,
          required: !!q.required,
          // 视频类型直接返回URL，其他类型返回答案值
          answer: q.type === 'video' && answerValue ? answerValue : (answerValue || null)
        }
      })

    const requiredAnswers = answers.filter(item => item.required)
    const requiredCount = requiredAnswers.length

    // 注意：不在这里还原和填充 functionalAssessments
    // 后端只返回 functionalCodes 和 answers，前端负责还原量表结构并填充答案
    // 这样前端可以使用 quantification.js 统一还原，保持数据一致性
    
    console.log('=== 后端返回数据 ===')
    console.log('functionalCodes:', JSON.stringify(functionalCodes))
    console.log('answersMap keys:', Object.keys(answersMap))
    console.log('注意：functionalAssessments 由前端还原')
    
    // 从 extraInfo 字段读取 AI 报告（符合 schema 设计）
    const extraInfo = record.get('extraInfo') || {}
    const aiReport = extraInfo.summary !== undefined ? extraInfo : {
      summary: '',
      details: [],
      suggestions: []
    }

    // 调试日志
    console.log('=== 后端返回数据 ===')
    console.log('functionalCodes:', JSON.stringify(functionalCodes))
    console.log('answers 数量:', answers.length)
    console.log('aiReport summary 长度:', aiReport.summary ? aiReport.summary.length : 0)
    console.log('aiReport details 长度:', aiReport.details ? aiReport.details.length : 0)
    console.log('aiReport suggestions 长度:', aiReport.suggestions ? aiReport.suggestions.length : 0)
    console.log('extraInfo 原始值:', JSON.stringify(extraInfo))

    res.json({
      success: true,
      data: {
        planId: planId,
        planTitle: plan ? plan.get('title') : '',
        patientId: patientId,
        patientName: record.get('patientName') || '',
        fillTime: record.createdAt,
        status: record.get('status') || 'completed',
        answers,
        requiredAnswers,
        requiredCount,
        functionalCodes, // 返回 functionalCodes，前端根据此还原量表结构
        answersMap, // 返回原始 answersMap，前端用于填充答案
        functionalAssessments: [], // 空数组，前端自己还原
        aiReport,
        // 调试信息（开发环境）
        _debug: {
          functionalCodes: functionalCodes,
          answersMapKeys: Object.keys(answersMap),
          extraInfoKeys: Object.keys(extraInfo),
          hasAiReport: !!(aiReport && aiReport.summary)
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router

/**
 * GET /v1/doctor/team
 * 获取当前用户所在医生团队信息
 * 返回：
 * {
 *   success: true,
 *   data: {
 *     isCurrentUserLeader: boolean,
 *     members: [ { id, name, hospital, department, title, isLeader, isAdmin, planCount }, ... ],
 *     totalPlans: number
 *   }
 * }
 */
router.get('/doctor/team', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser

    // 查找当前用户所属团队负责人
    let leader = await findTeamLeader(user)

    // 如果没有团队记录，且用户已通过医生认证，则自动创建一个以自己为负责人的团队
    if (!leader) {
      await ensureLeaderSelfMember(user)
      leader = user
    }

    const isCurrentUserLeader = leader && leader.id === user.id

    const q = new AV.Query(DoctorTeamMember)
    q.equalTo('leader', leader)
    q.include('member')
    q.include('doctorProfile')
    const members = await q.find({ useMasterKey: true })

    // 计算总随访计划数（简单按成员记录中的 planCount 汇总）
    const totalPlans = members.reduce((sum, m) => sum + (m.get('planCount') || 0), 0)

    res.json({
      success: true,
      data: {
        isCurrentUserLeader,
        members: members.map(formatTeamMember),
        totalPlans
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/doctor/team/members
 * 添加团队成员（仅负责人可操作）
 * body: { doctorId: '<_User objectId>' }
 */
router.post('/doctor/team/members', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { doctorId } = req.body || {}

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: '缺少 doctorId'
      })
    }

    // 确保当前用户是负责人
    await ensureLeaderSelfMember(user)
    const leader = user

    if (doctorId === leader.id) {
      return res.status(400).json({
        success: false,
        message: '负责人已在团队中'
      })
    }

    // 查询医生用户
    const userQuery = new AV.Query('_User')
    const doctorUser = await userQuery.get(doctorId, { useMasterKey: true })

    // 限制：负责人不能加入其他团队（除了自己作为 leader 的团队）
    const leaderCheck = new AV.Query(DoctorTeamMember)
    leaderCheck.equalTo('member', doctorUser)
    leaderCheck.equalTo('isLeader', true)
    const leaderMembership = await leaderCheck.first({ useMasterKey: true })
    if (leaderMembership && leaderMembership.get('leader').id !== leader.id) {
      return res.status(400).json({
        success: false,
        message: '该医生是其他团队的负责人，不能加入当前团队'
      })
    }

    // 检查是否已在团队中
    const q = new AV.Query(DoctorTeamMember)
    q.equalTo('leader', leader)
    q.equalTo('member', doctorUser)
    const existed = await q.first({ useMasterKey: true })
    if (existed) {
      return res.json({
        success: true,
        data: formatTeamMember(existed)
      })
    }

    // 获取医生资料
    const profileQ = new AV.Query(DoctorProfile)
    profileQ.equalTo('user', doctorUser)
    const profile = await profileQ.first({ useMasterKey: true })

    const member = new DoctorTeamMember()
    member.set('leader', leader)
    member.set('member', doctorUser)
    member.set('doctorProfile', profile || null)
    member.set('isLeader', false)
    member.set('isAdmin', false)
    member.set('planCount', 0)
    await member.save(null, { useMasterKey: true })

    res.status(201).json({
      success: true,
      data: formatTeamMember(member)
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /v1/doctor/team/members/:memberId
 * 移除团队成员（仅负责人可操作，不能移除自己）
 */
router.delete('/doctor/team/members/:memberId', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { memberId } = req.params

    await ensureLeaderSelfMember(user)
    const leader = user

    if (memberId === leader.id) {
      return res.status(400).json({
        success: false,
        message: '不能移除负责人自己'
      })
    }

    const userQuery = new AV.Query('_User')
    const memberUser = await userQuery.get(memberId, { useMasterKey: true })

    const q = new AV.Query(DoctorTeamMember)
    q.equalTo('leader', leader)
    q.equalTo('member', memberUser)
    const membership = await q.first({ useMasterKey: true })

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: '该医生不在当前团队中'
      })
    }

    await membership.destroy({ useMasterKey: true })

    res.json({
      success: true
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/doctor/team/members/:memberId/admin
 * 设置/取消管理员（仅负责人可操作）
 * body: { isAdmin: true/false }
 */
router.post('/doctor/team/members/:memberId/admin', doctorRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { memberId } = req.params
    const { isAdmin } = req.body || {}

    await ensureLeaderSelfMember(user)
    const leader = user

    if (memberId === leader.id) {
      return res.status(400).json({
        success: false,
        message: '负责人默认具有管理员权限，无需单独设置'
      })
    }

    const userQuery = new AV.Query('_User')
    const memberUser = await userQuery.get(memberId, { useMasterKey: true })

    const q = new AV.Query(DoctorTeamMember)
    q.equalTo('leader', leader)
    q.equalTo('member', memberUser)
    q.include('member')
    q.include('doctorProfile')
    const membership = await q.first({ useMasterKey: true })

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: '该医生不在当前团队中'
      })
    }

    // 业务规则：一个医生只能在一个团队中担任管理员
    if (isAdmin) {
      const otherAdminQ = new AV.Query(DoctorTeamMember)
      otherAdminQ.equalTo('member', memberUser)
      otherAdminQ.equalTo('isAdmin', true)
      otherAdminQ.notEqualTo('leader', leader)
      const otherAdminMembership = await otherAdminQ.first({ useMasterKey: true })
      if (otherAdminMembership) {
        return res.status(400).json({
          success: false,
          message: '该医生已是其他团队的管理员，不能同时管理多个团队'
        })
      }
    }

    membership.set('isAdmin', !!isAdmin)
    await membership.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: formatTeamMember(membership)
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/doctor/list
 * 获取医生列表（用于团队成员管理）
 * 查询参数：
 * - department: 可选，按科室筛选
 * - keyword: 可选，按姓名或医院搜索
 * 说明：
 * - 仅返回已通过认证的医生（isApproved = true）
 * - 返回格式：{ id: userId, name, hospital, department, title }
 */
router.get('/doctor/list', doctorRequired(), async (req, res, next) => {
  try {
    const { department, keyword } = req.query || {}

    let profileQuery

    // 按关键词搜索（姓名或医院）
    if (keyword) {
      const nameQuery = new AV.Query(DoctorProfile)
      nameQuery.equalTo('isApproved', true)
      nameQuery.contains('name', keyword)
      
      const hospitalQuery = new AV.Query(DoctorProfile)
      hospitalQuery.equalTo('isApproved', true)
      hospitalQuery.contains('hospital', keyword)
      
      profileQuery = AV.Query.or(nameQuery, hospitalQuery)
    } else {
      // 查询所有已认证的医生档案
      profileQuery = new AV.Query(DoctorProfile)
      profileQuery.equalTo('isApproved', true)
    }
    
    // 按科室筛选
    if (department) {
      profileQuery.equalTo('departmentName', department)
    }

    const profiles = await profileQuery.find({ useMasterKey: true })

    // 获取对应的用户信息
    const doctors = await Promise.all(
      profiles.map(async (profile) => {
        const user = profile.get('user')
        if (!user) return null

        // 确保用户已加载
        await user.fetch({ useMasterKey: true })

        return {
          id: user.id,
          name: profile.get('name') || '',
          hospital: profile.get('hospital') || '',
          department: profile.get('departmentName') || profile.get('department') || '',
          title: profile.get('title') || ''
        }
      })
    )

    // 过滤掉 null 值
    const validDoctors = doctors.filter(d => d !== null)

    res.json({
      success: true,
      data: validDoctors
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/patient/teams
 * 患者端获取可选择的治疗组列表（团队负责人医生列表）
 * 返回：
 * {
 *   success: true,
 *   data: [
 *     { id, name, teamDisplayName, hospital, department, title, teamName },
 *     ...
 *   ]
 * }
 */
router.get('/patient/teams', authRequired(), async (req, res, next) => {
  try {
    // 查询所有团队负责人记录（DoctorTeamMember 中 isLeader = true）
    const q = new AV.Query(DoctorTeamMember)
    q.equalTo('isLeader', true)
    q.include('member')
    q.include('doctorProfile')

    const leaders = await q.find({ useMasterKey: true })

    const teams = leaders.map(memberObj => {
      const memberUser = memberObj.get('member')
      const profile = memberObj.get('doctorProfile')

      const id = memberUser ? memberUser.id : memberObj.id
      const name = profile ? (profile.get('name') || '') : ''
      const hospital = profile ? (profile.get('hospital') || '') : ''
      const department = profile
        ? (profile.get('departmentName') || profile.get('department') || '')
        : ''
      const title = profile ? (profile.get('title') || '') : ''

      // 团队显示名：优先使用姓名拼接“医生团队”
      const teamDisplayName = name ? `${name}医生团队` : '医生团队'

      return {
        id,
        name,
        hospital,
        department,
        title,
        teamDisplayName,
        teamName: teamDisplayName
      }
    })

    res.json({
      success: true,
      data: teams
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /v1/meta/departments
 * 获取科室列表（医生注册/认证时使用）
 * 说明：
 * - 数据通过 Department 表维护，可在控制台预置如「骨科」「心内科」等
 * - 排序优先级：isEnabled=true 优先，order 升序，其次按 createdAt
 */
router.get('/meta/departments', async (req, res, next) => {
  try {
    const query = new AV.Query(Department)
    query.equalTo('isEnabled', true)
    query.ascending('order')
    query.addAscending('createdAt')
    const list = await query.find({ useMasterKey: true })

    res.json({
      success: true,
      data: list.map(item => ({
        id: item.id,
        name: item.get('name'),
        code: item.get('code') || null,
        order: item.get('order') || 0
      }))
    })
  } catch (err) {
    next(err)
  }
})


