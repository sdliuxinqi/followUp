const AV = require('leanengine')
const crypto = require('crypto')

// Session Token 密钥（从环境变量读取，或使用默认值）
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production'

// 医生资料表，用于身份校验
const DoctorProfile = AV.Object.extend('DoctorProfile')

/**
 * 解析自定义 session_token
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
 * 从请求头中解析用户 Session，并获取当前用户
 * 支持：
 * - X-Session-Token: <sessionToken> (自定义 token)
 * - Authorization: Bearer <sessionToken>
 * - X-LC-Session: <sessionToken> (兼容旧版本)
 */
async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || ''
  const bearerPrefix = 'Bearer '
  
  // 优先使用自定义的 X-Session-Token
  let sessionToken = req.headers['x-session-token'] || req.headers['x-lc-session']

  if (!sessionToken && authHeader.startsWith(bearerPrefix)) {
    sessionToken = authHeader.slice(bearerPrefix.length).trim()
  }

  if (!sessionToken) {
    return null
  }

  try {
    // 解析自定义 session_token
    const tokenInfo = parseSessionToken(sessionToken)
    
    if (!tokenInfo) {
      // 如果不是自定义 token 格式，尝试使用 LeanCloud 的 sessionToken（兼容旧版本）
      try {
        const user = await AV.User.become(sessionToken)
        return user
      } catch (err) {
        console.error('LeanCloud Session 验证失败:', err)
        return null
      }
    }

    // 使用 userId 从 LeanCloud 查询用户
    const user = AV.Object.createWithoutData('_User', tokenInfo.userId)
    await user.fetch({ useMasterKey: true })
    
    // 验证用户是否存在
    if (!user || !user.id) {
      return null
    }

    // 返回用户对象（包装成类似 AV.User 的对象）
    return user
  } catch (err) {
    console.error('解析 Session 失败:', err)
    return null
  }
}

/**
 * 解析自定义 session_token
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
 * 鉴权中间件：需要登录
 */
function authRequired() {
  return async (req, res, next) => {
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '未登录或 Session 无效'
        })
      }
      req.currentUser = user
      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * 鉴权中间件：需要医生身份
 * 规则：
 * 1. _User.role === 'doctor'
 * 2. 或存在 DoctorProfile 记录且 isApproved = true
 */
function doctorRequired() {
  return async (req, res, next) => {
    try {
      const user = await getUserFromRequest(req)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '未登录或 Session 无效'
        })
      }

      const role = user.get('role')
      if (role === 'doctor') {
        req.currentUser = user
        return next()
      }

      const query = new AV.Query(DoctorProfile)
      query.equalTo('user', user)
      query.equalTo('isApproved', true)
      const profile = await query.first({ useMasterKey: true })

      if (!profile) {
        return res.status(403).json({
          success: false,
          message: '当前用户不是已认证医生'
        })
      }

      req.currentUser = user
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = {
  authRequired,
  doctorRequired,
  getUserFromRequest
}


