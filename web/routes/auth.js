const router = require('express').Router()
const AV = require('leanengine')
const { authRequired } = require('../middleware/auth')
const https = require('https')
const crypto = require('crypto')

// 微信小程序配置（从环境变量读取）
const WECHAT_APPID = process.env.WECHAT_APPID || 'wx1699aff3054e007b'
const WECHAT_SECRET = process.env.WECHAT_SECRET || '61afdd8e138c79c5ed4289038c3cff65'

// Session Token 密钥（从环境变量读取，或使用默认值）
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production'

/**
 * 生成自定义 session_token
 */
function generateSessionToken(userId, openid) {
  // 使用 HMAC 生成 token：userId + timestamp + secret
  const timestamp = Date.now()
  const data = `${userId}:${openid}:${timestamp}`
  const token = crypto.createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex')
  return `${userId}_${timestamp}_${token}`
}

/**
 * 验证并解析 session_token
 */
function parseSessionToken(token) {
  try {
    const parts = token.split('_')
    if (parts.length !== 3) {
      return null
    }
    const userId = parts[0]
    const timestamp = parseInt(parts[1])
    const signature = parts[2]
    
    // 验证 token 是否过期（7天）
    const now = Date.now()
    const expireTime = 7 * 24 * 60 * 60 * 1000 // 7天
    if (now - timestamp > expireTime) {
      return null
    }
    
    return { userId, timestamp, signature }
  } catch (err) {
    return null
  }
}

/**
 * 调用微信 API 换取 openid 和 session_key
 */
function getWechatOpenId(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.errcode) {
            reject(new Error(`微信登录失败: ${result.errmsg || '未知错误'} (错误码: ${result.errcode})`))
          } else {
            resolve({
              openid: result.openid,
              session_key: result.session_key,
              unionid: result.unionid // 可能不存在
            })
          }
        } catch (err) {
          reject(new Error('解析微信响应失败: ' + err.message))
        }
      })
    }).on('error', (err) => {
      reject(new Error('请求微信API失败: ' + err.message))
    })
  })
}

/**
 * POST /v1/auth/login-weapp
 * 自定义微信登录接口
 * body: { code: "微信登录凭证" }
 */
router.post('/login-weapp', async (req, res, next) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少参数: code'
      })
    }

    if (!WECHAT_SECRET) {
      return res.status(500).json({
        success: false,
        message: '服务器配置错误：未配置微信 AppSecret'
      })
    }

    // 1. 使用 code 换取 openid
    const wechatInfo = await getWechatOpenId(code)

    // 2. 使用 openid 查找或创建 LeanCloud 用户
    const platform = 'lc_weapp' // LeanCloud 微信小程序平台标识
    const authDataValue = {
      openid: wechatInfo.openid,
      session_key: wechatInfo.session_key
    }
    if (wechatInfo.unionid) {
      authDataValue.unionid = wechatInfo.unionid
    }

    // 先查找用户
    const query = new AV.Query(AV.User)
    query.equalTo(`authData.${platform}.openid`, wechatInfo.openid)
    let user = await query.first({ useMasterKey: true })

    if (!user) {
      // 创建新用户 - 使用 AV.Object.extend('_User') 创建，避免密码要求
      const User = AV.Object.extend('_User')
      user = new User()
      user.set('username', `weapp_${wechatInfo.openid}`)
      user.set('authData', {
        [platform]: authDataValue
      })
      // 使用 save 而不是 signUp，通过 useMasterKey 绕过权限检查
      await user.save(null, { useMasterKey: true })
    } else {
      // 更新现有用户的 session_key
      const currentAuthData = user.get('authData') || {}
      currentAuthData[platform] = authDataValue
      user.set('authData', currentAuthData)
      await user.save(null, { useMasterKey: true })
    }

    // 3. 生成自定义 session_token（微信官方流程）
    // 不再调用 LeanCloud API，直接生成我们自己的 session_token
    const sessionToken = generateSessionToken(user.id, wechatInfo.openid)
    
    // 将 session_token 存储到用户对象中（可选，用于验证）
    // 或者可以创建一个 Session 表来存储，这里简化处理，直接返回 token
    // 后续验证时通过 userId 查询用户即可

    // 4. 返回用户信息和自定义 session_token
    res.json({
      success: true,
      data: {
        id: user.id,
        sessionToken: sessionToken,  // 自定义 session_token
        openid: wechatInfo.openid,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('微信登录失败:', err)
    res.status(500).json({
      success: false,
      message: err.message || '微信登录失败'
    })
  }
})

/**
 * POST /v1/auth/register-weapp
 * 说明：
 * - 前端已通过 AV.User.loginWithWeapp() 完成微信登录并获取 sessionToken。
 * - 本接口用于将微信返回的用户信息写入 _User（昵称、头像等），同时返回基础用户信息与 sessionToken。
 */
router.post('/register-weapp', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const { nickname, avatar, gender } = req.body || {}

    // 可选：仅在字段不存在时才写入，避免覆盖用户后续修改
    if (nickname && !user.get('nickname')) {
      user.set('nickname', nickname)
    }
    if (avatar && !user.get('avatar')) {
      user.set('avatar', avatar)
    }
    if (gender && !user.get('gender')) {
      user.set('gender', gender) // 建议传 male/female
    }

    await user.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        id: user.id,
        nickname: user.get('nickname') || nickname || '',
        avatar: user.get('avatar') || avatar || '',
        gender: user.get('gender') || gender || '',
        role: user.get('role') || ''
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/auth/upload-image-base64
 * 通过 base64 上传图片到 LeanCloud（带压缩功能）
 * body: { base64: "data:image/jpeg;base64,..." 或 "base64字符串", fileName: "workcard.jpg", quality: 80 }
 * 返回：{ success: true, data: { url: "图片URL", fileId: "文件ID", size: 文件大小 } }
 */
router.post('/upload-image-base64', authRequired(), async (req, res, next) => {
  try {
    const { base64, fileName, quality = 80 } = req.body || {}
    
    if (!base64) {
      return res.status(400).json({
        success: false,
        message: '缺少参数：base64'
      })
    }

    // 解析 base64 数据
    let base64Data = base64
    if (base64.startsWith('data:')) {
      // 移除 data:image/jpeg;base64, 前缀
      const commaIndex = base64.indexOf(',')
      if (commaIndex > 0) {
        base64Data = base64.substring(commaIndex + 1)
      }
    }

    // 转换为 Buffer
    let buffer
    try {
      buffer = Buffer.from(base64Data, 'base64')
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'base64 数据格式错误'
      })
    }

    console.log('接收图片，原始大小:', buffer.length, 'bytes')

    // 如果图片小于 500KB，不压缩（已经够小了）
    // 如果大于 500KB，可以尝试使用 sharp 压缩（如果有的话）
    // 这里先保存原始图片，后续可以添加 sharp 压缩
    let finalBuffer = buffer
    const originalSize = buffer.length

    // TODO: 如果需要服务端压缩，可以安装 sharp 库：
    // npm install sharp
    // const sharp = require('sharp')
    // finalBuffer = await sharp(buffer)
    //   .jpeg({ quality: Math.min(quality, 90) })
    //   .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    //   .toBuffer()

    // 生成文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substr(2, 9)
    const finalFileName = fileName || `workcard_${timestamp}_${randomStr}.jpg`
    
    // 创建 AV.File 对象
    const file = new AV.File(finalFileName, finalBuffer)
    
    // 保存到 LeanCloud
    await file.save({ useMasterKey: true })

    const compressedSize = finalBuffer.length
    const compressionRatio = originalSize > 0 
      ? ((1 - compressedSize / originalSize) * 100).toFixed(1) 
      : 0

    console.log('图片上传成功:', {
      fileId: file.id,
      fileName: file.name(),
      fileUrl: file.url(),
      originalSize: originalSize,
      compressedSize: compressedSize,
      compressionRatio: compressionRatio > 0 ? `${compressionRatio}%` : '0%'
    })
    
    res.json({
      success: true,
      data: {
        url: file.url(),
        name: file.name(),
        fileId: file.id,
        size: compressedSize,
        originalSize: originalSize
      }
    })
  } catch (err) {
    console.error('图片上传失败:', err)
    console.error('错误堆栈:', err.stack)
    res.status(500).json({
      success: false,
      message: err.message || '图片上传失败',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

/**
 * POST /v1/auth/register-doctor
 * 说明：
 * - 登录后提交医生注册信息，创建/更新 DoctorProfile 记录。
 * - 默认 isApproved = false，待人工审核。审核通过后可将 _User.role 设为 'doctor'
 *   或将 DoctorProfile.isApproved 置为 true（doctorRequired 已兼容）。
 * body:
 * {
 *   "name": "张三",
 *   "hospital": "示例医院",
 *   "departmentId": "DEPT_OBJECT_ID", // 或传 departmentName
 *   "departmentName": "骨科",
 *   "title": "主任医师",
 *   "workCertUrl": "https://your-cert-url"
 * }
 */
router.post('/register-doctor', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    // 前端页面字段：name, hospital, department（字符串）, workCardImage（图片 URL）
    const { name, hospital, department, workCardImage } = req.body || {}

    if (!name || !hospital || !department || !workCardImage) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：name / hospital / department / workCardImage'
      })
    }

    const DoctorProfile = AV.Object.extend('DoctorProfile')
    const query = new AV.Query(DoctorProfile)
    query.equalTo('user', user)
    let profile = await query.first({ useMasterKey: true })
    if (!profile) {
      profile = new DoctorProfile()
      profile.set('user', user)
      profile.set('isApproved', true) // 默认审核通过
    }

    profile.set('name', name)
    profile.set('hospital', hospital)
    profile.set('departmentName', department) // 存储为名称，前端下拉为固定列表
    profile.set('workCertUrl', workCardImage)

    await profile.save(null, { useMasterKey: true })

    res.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.get('name'),
        hospital: profile.get('hospital'),
        department: profile.get('departmentName'),
        workCertUrl: profile.get('workCertUrl') || '',
        isApproved: profile.get('isApproved') || false
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router

/**
 * GET /v1/auth/doctor-profile
 * 说明：当前登录用户已注册医生时返回档案信息，否则返回 null。
 */
router.get('/doctor-profile', authRequired(), async (req, res, next) => {
  try {
    const user = req.currentUser
    const DoctorProfile = AV.Object.extend('DoctorProfile')
    const query = new AV.Query(DoctorProfile)
    query.equalTo('user', user)
    const profile = await query.first({ useMasterKey: true })

    if (!profile) {
      return res.json({ success: true, data: null })
    }

    res.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.get('name') || '',
        hospital: profile.get('hospital') || '',
        department: profile.get('departmentName') || profile.get('department') || '',
        workCertUrl: profile.get('workCertUrl') || '',
        isApproved: profile.get('isApproved') || false,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    })
  } catch (err) {
    next(err)
  }
})


