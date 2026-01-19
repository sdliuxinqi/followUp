const AV = require('leanengine')

/**
 * 云函数：生成用户的 sessionToken
 * 使用 masterKey 直接生成 sessionToken，避免网络超时问题
 */
AV.Cloud.define('generateSessionToken', async (request) => {
  const { userId, authData, platform } = request.params

  if (!userId || !authData || !platform) {
    throw new AV.Cloud.Error('缺少必要参数：userId, authData, platform')
  }

  try {
    // 使用 masterKey 获取用户
    const user = AV.Object.createWithoutData('_User', userId)
    await user.fetch({ useMasterKey: true })

    // 验证 authData
    const userAuthData = user.get('authData')
    if (!userAuthData || !userAuthData[platform] || 
        userAuthData[platform].openid !== authData.openid) {
      throw new AV.Cloud.Error('authData 不匹配')
    }

    // 使用 LeanCloud 的登录方法生成 sessionToken
    // 由于我们已经在云引擎内部，可以使用 LeanCloud 的内部 API
    const appId = process.env.LEANCLOUD_APP_ID
    const appKey = process.env.LEANCLOUD_APP_KEY
    const serverURL = AV.serverURL || 'https://api.leancloud.cn'

    // 使用 LeanCloud REST API 生成 sessionToken
    const https = require('https')
    const loginData = JSON.stringify({
      authData: {
        [platform]: authData
      }
    })

    const sessionToken = await new Promise((resolve, reject) => {
      const url = new URL(serverURL)
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: '/1/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LC-Id': appId,
          'X-LC-Key': appKey,
          'Content-Length': Buffer.byteLength(loginData)
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
              reject(new AV.Cloud.Error(result.error))
            } else if (result.sessionToken) {
              resolve(result.sessionToken)
            } else {
              reject(new AV.Cloud.Error('无法获取 sessionToken'))
            }
          } catch (err) {
            reject(err)
          }
        })
      })

      req.on('error', (err) => {
        reject(err)
      })

      req.write(loginData)
      req.end()
    })

    return { sessionToken }
  } catch (error) {
    throw new AV.Cloud.Error(`生成 sessionToken 失败: ${error.message}`)
  }
})

