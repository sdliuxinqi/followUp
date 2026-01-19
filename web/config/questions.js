// 基础题目配置（与前端 create.js 保持一致）
const availableQuestions = [
  // 一般状态（必选）
  {
    id: 'basic_name',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '姓名',
    required: true
  },
  {
    id: 'basic_gender',
    group: 'basic',
    type: 'single',
    typeName: '单选',
    title: '性别',
    options: ['男', '女'],
    required: true
  },
  {
    id: 'basic_birth_date',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '出生日期',
    required: true
  },
  {
    id: 'basic_height',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '身高',
    required: true
  },
  {
    id: 'basic_weight',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '体重',
    required: true
  },
  {
    id: 'basic_admission_number',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '住院号',
    required: true
  },
  {
    id: 'basic_admission_date',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '住院日期',
    required: true
  },
  {
    id: 'basic_surgery_date',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '手术日期',
    required: true
  },
  {
    id: 'basic_visit_date',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '随访日期',
    required: true
  },
  {
    id: 'basic_contact',
    group: 'basic',
    type: 'text',
    typeName: '文本',
    title: '联系方式',
    required: true
  },
  // 活动评估（可选）
  {
    id: 'activity_knee_video',
    group: 'activity',
    type: 'video',
    typeName: '视频',
    title: '膝关节屈伸视频',
    required: false
  },
  {
    id: 'activity_walk_video',
    group: 'activity',
    type: 'video',
    typeName: '视频',
    title: '行走视频',
    required: false
  },
  // AI 辅助评估（可选）
  {
    id: 'ai_enable',
    group: 'ai',
    type: 'single',
    typeName: '单选',
    title: '启用基于已有数据的智能分析',
    options: ['是', '否'],
    required: false
  }
]

// 创建题目映射表（按 id 索引）
const questionMap = {}
availableQuestions.forEach(q => {
  questionMap[q.id] = q
})

module.exports = {
  availableQuestions,
  questionMap
}

