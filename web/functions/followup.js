const AV = require('leanengine')

// === Class 定义 ===

// 随访计划
const FollowUpPlan = AV.Object.extend('FollowUpPlan')
// 随访填写记录
const FollowUpRecord = AV.Object.extend('FollowUpRecord')
// 医生资料（用于标记医生身份）
const DoctorProfile = AV.Object.extend('DoctorProfile')
// 患者资料（小程序端直接通过 AV.Query 使用）
const PatientProfile = AV.Object.extend('PatientProfile')

/**
 * 工具：从 request 中获取当前用户（支持 userId 参数覆盖）
 */
async function getUserFromRequest(request) {
  const { currentUser, params } = request
  if (params && params.userId) {
    const query = new AV.Query('_User')
    return query.get(params.userId)
  }
  return currentUser
}

/**
 * 云函数：检查当前用户是否为医生
 *
 * 小程序调用示例：
 * AV.Cloud.run('checkDoctorRole', {}) // 在 doctor/home.js 中已使用
 */
AV.Cloud.define('checkDoctorRole', async request => {
  const user = await getUserFromRequest(request)

  if (!user) {
    return {
      success: false,
      isDoctor: false,
      message: '未登录'
    }
  }

  // 约定 1：优先检查 _User 表中的 role 字段是否为 'doctor'
  const role = user.get('role')
  if (role === 'doctor') {
    return {
      success: true,
      isDoctor: true,
      message: '用户角色为医生'
    }
  }

  // 约定 2：检查是否存在已认证的 DoctorProfile
  const profileQuery = new AV.Query(DoctorProfile)
  profileQuery.equalTo('user', user)
  profileQuery.equalTo('isApproved', true)

  const profile = await profileQuery.first({ useMasterKey: true })

  return {
    success: true,
    isDoctor: !!profile,
    message: profile ? '存在已认证的医生资料' : '未找到医生认证资料'
  }
})

/**
 * 云函数：创建随访计划
 *
 * 小程序调用预期（参考 pages/doctor/plan/create/create.js）：
 * AV.Cloud.run('createFollowUpPlan', {
 *   creator: app.globalData.user.id, // 前端会传，但以当前用户为准
 *   title: formData.title,
 *   timeTypes: formData.timeTypes,
 *   questions: [...],
 *   participantCount: 0
 * })
 */
AV.Cloud.define('createFollowUpPlan', async request => {
  const { params } = request
  const user = await getUserFromRequest(request)

  if (!user) {
    throw new AV.Cloud.Error('未登录，无法创建随访计划', { status: 401 })
  }

  const { title, timeTypes, questions, functionalAssessments, participantCount } = params || {}

  if (!title || !Array.isArray(timeTypes) || timeTypes.length === 0) {
    throw new AV.Cloud.Error('缺少必要参数：title 或 timeTypes', { status: 400 })
  }

  const plan = new FollowUpPlan()

  // 计划基础信息
  plan.set('title', title)
  plan.set('creator', user)
  plan.set('creatorId', user.id)
  plan.set('creatorName', user.get('nickname') || user.get('username') || user.get('mobilePhoneNumber') || '')
  plan.set('timeTypes', timeTypes)
  plan.set('questions', questions || [])
  plan.set('functionalAssessments', functionalAssessments || [])
  plan.set('participantCount', typeof participantCount === 'number' ? participantCount : 0)
  plan.set('isDiscarded', false)

  await plan.save(null, { useMasterKey: true })

  return {
    success: true,
    planId: plan.id
  }
})

/**
 * 云函数：废弃随访计划
 *
 * 约定参数：
 * - planId: 要废弃的计划 ID
 *
 * 小程序 doctor/plan/detail/detail.js 中预留：
 * // AV.Cloud.run('discardFollowUpPlan', { planId: this.data.planId })
 */
AV.Cloud.define('discardFollowUpPlan', async request => {
  const { planId } = request.params || {}
  const user = await getUserFromRequest(request)

  if (!user) {
    throw new AV.Cloud.Error('未登录，无法废弃随访计划', { status: 401 })
  }

  if (!planId) {
    throw new AV.Cloud.Error('缺少参数 planId', { status: 400 })
  }

  const query = new AV.Query(FollowUpPlan)
  const plan = await query.get(planId, { useMasterKey: true })

  if (!plan) {
    throw new AV.Cloud.Error('随访计划不存在', { status: 404 })
  }

  // 只允许创建者废弃自己的计划
  const creator = plan.get('creator')
  if (creator && creator.id !== user.id) {
    throw new AV.Cloud.Error('无权废弃他人的随访计划', { status: 403 })
  }

  plan.set('isDiscarded', true)
  await plan.save(null, { useMasterKey: true })

  return {
    success: true
  }
})

/**
 * 云函数：提交随访记录
 *
 * 小程序调用预期（参考 pages/patient/fill/fill.js）：
 * AV.Cloud.run('submitFollowUpRecord', {
 *   planId: this.data.planId,
 *   timeType: this.data.timeType, // 建议在前端补充传入
 *   answers: this.data.answers
 * })
 */
AV.Cloud.define('submitFollowUpRecord', async request => {
  const { planId, answers, timeType } = request.params || {}
  const user = await getUserFromRequest(request)

  if (!user) {
    throw new AV.Cloud.Error('未登录，无法提交随访记录', { status: 401 })
  }

  if (!planId || !answers || typeof answers !== 'object') {
    throw new AV.Cloud.Error('缺少必要参数：planId 或 answers', { status: 400 })
  }

  // 读取计划
  const planQuery = new AV.Query(FollowUpPlan)
  const plan = await planQuery.get(planId, { useMasterKey: true })

  if (!plan) {
    throw new AV.Cloud.Error('随访计划不存在', { status: 404 })
  }
  if (plan.get('isDiscarded')) {
    throw new AV.Cloud.Error('该随访计划已被废弃，无法提交', { status: 400 })
  }

  const record = new FollowUpRecord()

  record.set('plan', plan)
  record.set('planId', plan.id)
  record.set('patient', user)
  record.set('patientId', user.id)
  record.set('answers', answers)

  // timeType 可选；如果前端未传，则尝试按第一个 timeTypes 兜底
  const planTimeTypes = plan.get('timeTypes') || []
  record.set('timeType', timeType || planTimeTypes[0] || null)

  // 复制部分基础信息字段，方便查询、统计（与小程序逻辑对齐）
  record.set('patientName', answers['basic_name'] || '')
  record.set('patientGender', answers['basic_gender'] || '')
  record.set('admissionNumber', answers['basic_admission_number'] || '')

  await record.save(null, { useMasterKey: true })

  return {
    success: true,
    recordId: record.id
  }
})

/**
 * afterSave 钩子：自动维护 FollowUpPlan.participantCount
 */
AV.Cloud.afterSave('FollowUpRecord', async request => {
  const record = request.object
  const plan = record.get('plan')
  if (!plan) return

  try {
    const planObj = await plan.fetch({ useMasterKey: true })
    planObj.increment('participantCount', 1)
    await planObj.save(null, { useMasterKey: true })
  } catch (e) {
    console.error('更新随访计划 participantCount 失败:', e)
  }
})


