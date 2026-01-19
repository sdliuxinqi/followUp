# 微信小程序登录流程文档

## 概述

本项目采用**微信官方推荐的登录流程**，完全独立于 LeanCloud SDK 的登录方法。LeanCloud 仅作为数据库和部署平台使用。

## 完整流程

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  小程序前端  │         │  后端服务器  │         │  微信服务器  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                        │                        │
       │ 1. wx.login()          │                        │
       │ ────────────────────→  │                        │
       │    获取 code            │                        │
       │                        │                        │
       │ 2. POST /v1/auth/      │                        │
       │    login-weapp         │                        │
       │    { code }            │                        │
       │ ────────────────────→  │                        │
       │                        │                        │
       │                        │ 3. code2Session API    │
       │                        │ ────────────────────→  │
       │                        │   appid + secret + code│
       │                        │                        │
       │                        │ ←──────────────────── │
       │                        │   openid + session_key │
       │                        │                        │
       │                        │ 4. 查询/创建用户        │
       │                        │    (基于 openid)       │
       │                        │    (使用 LeanCloud)    │
       │                        │                        │
       │                        │ 5. 生成自定义          │
       │                        │    session_token       │
       │                        │                        │
       │ ←────────────────────  │                        │
       │   返回 session_token    │                        │
       │   + 用户信息            │                        │
       │                        │                        │
       │ 6. 存储 session_token  │                        │
       │    在后续请求中携带     │                        │
       │                        │                        │
```

## 详细步骤

### 第一步：前端调用 wx.login()

```javascript
wx.login({
  success: res => {
    if (res.code) {
      // res.code 是临时登录凭证，有效期5分钟
      // 发送到后端
    }
  }
})
```

### 第二步：前端发送 code 到后端

```javascript
wx.request({
  url: 'https://server.tka-followup.top/v1/auth/login-weapp',
  method: 'POST',
  data: { code: res.code }
})
```

### 第三步：后端调用微信 code2Session API

后端使用 `code`、`appid` 和 `secret` 调用微信 API：

```
GET https://api.weixin.qq.com/sns/jscode2session
  ?appid=wx1699aff3054e007b
  &secret=61afdd8e138c79c5ed4289038c3cff65
  &js_code={code}
  &grant_type=authorization_code
```

微信返回：
```json
{
  "openid": "用户的唯一标识",
  "session_key": "会话密钥",
  "unionid": "可选，统一标识"
}
```

### 第四步：后端查询/创建用户（使用 LeanCloud 数据库）

```javascript
// 使用 openid 查找用户
const query = new AV.Query(AV.User)
query.equalTo('authData.lc_weapp.openid', openid)
let user = await query.first({ useMasterKey: true })

if (!user) {
  // 创建新用户
  const User = AV.Object.extend('_User')
  user = new User()
  user.set('username', `weapp_${openid}`)
  user.set('authData', {
    lc_weapp: { openid, session_key }
  })
  await user.save(null, { useMasterKey: true })
}
```

### 第五步：后端生成自定义 session_token

```javascript
// 生成自定义 token（格式：userId_timestamp_signature）
const sessionToken = generateSessionToken(user.id, openid)
```

Token 格式：`{userId}_{timestamp}_{signature}`
- `userId`: LeanCloud 用户 ID
- `timestamp`: 生成时间戳
- `signature`: HMAC-SHA256 签名

### 第六步：后端返回 session_token

```json
{
  "success": true,
  "data": {
    "id": "用户ID",
    "sessionToken": "自定义token",
    "openid": "微信openid",
    "createdAt": "创建时间"
  }
}
```

### 第七步：前端存储 session_token

```javascript
wx.setStorageSync('sessionToken', sessionToken)
wx.setStorageSync('userId', userId)
```

### 第八步：后续请求携带 session_token

```javascript
wx.request({
  url: 'https://server.tka-followup.top/v1/api/xxx',
  header: {
    'X-Session-Token': wx.getStorageSync('sessionToken')
  }
})
```

### 第九步：后端验证 session_token

```javascript
// 1. 解析 token 获取 userId
const tokenInfo = parseSessionToken(sessionToken)
// { userId, timestamp, signature }

// 2. 验证 token 是否过期（7天）
if (now - timestamp > 7天) {
  return 401
}

// 3. 使用 userId 查询用户
const user = AV.Object.createWithoutData('_User', userId)
await user.fetch({ useMasterKey: true })
```

## 关键配置

### 后端环境变量

在 LeanCloud 云引擎中配置：
- `WECHAT_APPID`: `wx1699aff3054e007b`
- `WECHAT_SECRET`: `61afdd8e138c79c5ed4289038c3cff65`
- `SESSION_SECRET`: 自定义 session_token 的密钥（建议使用随机字符串）

### 前端配置

- API 基础地址：`https://server.tka-followup.top`
- 请求头：`X-Session-Token: {sessionToken}`

## 安全要点

1. ✅ **AppSecret 仅存在后端**：绝不暴露给前端
2. ✅ **code 立即使用**：不能存储，必须立即发送到后端
3. ✅ **session_token 签名验证**：使用 HMAC-SHA256 防止伪造
4. ✅ **token 过期机制**：7天自动过期
5. ✅ **session_key 不返回前端**：仅存储在后端

## 与 LeanCloud SDK 登录的区别

| 特性 | LeanCloud SDK 登录 | 微信官方流程（当前实现） |
|------|-------------------|----------------------|
| AppSecret 配置 | 需要在 LeanCloud 控制台配置 | 仅在后端环境变量中 |
| 登录方法 | `AV.User.loginWithWeapp()` | 自定义后端接口 |
| sessionToken | LeanCloud 生成的 | 自定义生成的 |
| 网络依赖 | 依赖 LeanCloud API | 仅依赖微信 API |
| 灵活性 | 受限于 LeanCloud | 完全自主控制 |

## 优势

1. **不依赖 LeanCloud 登录 API**：避免网络超时问题
2. **完全控制登录流程**：可以添加自定义逻辑
3. **更安全**：AppSecret 仅在后端，不暴露给前端
4. **更灵活**：可以自定义 token 格式和过期时间

## 注意事项

1. **session_token 格式**：`{userId}_{timestamp}_{signature}`
2. **token 过期时间**：7天（可在代码中修改）
3. **用户对象结构**：前端存储简化的 `{ id, openid }`，完整信息通过后端 API 获取
4. **兼容性**：中间件仍支持旧的 `X-LC-Session` 头（兼容旧版本）

