# 微信小程序登录配置说明

## 概述

现在微信登录使用的是自定义后端接口，不再需要在 LeanCloud 控制台配置微信 AppSecret。

## 环境变量配置

### 在 LeanCloud 云引擎中配置

1. 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
2. 进入你的应用
3. 点击左侧菜单 **云引擎** → **设置** → **环境变量**
4. 添加以下环境变量：
   - `WECHAT_APPID`: `wx1699aff3054e007b`
   - `WECHAT_SECRET`: `61afdd8e138c79c5ed4289038c3cff65`

### 本地开发环境配置

在 `web` 目录下创建 `.env` 文件（已在 `.gitignore` 中，不会提交到代码库）：

```
WECHAT_APPID=wx1699aff3054e007b
WECHAT_SECRET=61afdd8e138c79c5ed4289038c3cff65
```

**注意**：`.env` 文件不应提交到代码库，确保 `.gitignore` 中包含 `.env`

## 代码说明

### 后端接口

- **接口路径**: `POST /v1/auth/login-weapp`
- **请求参数**: 
  ```json
  {
    "code": "微信登录凭证"
  }
  ```
- **返回数据**:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "sessionToken": "LeanCloud Session Token",
      "openid": "微信OpenID",
      "createdAt": "创建时间"
    }
  }
  ```

### 前端调用

小程序前端不再使用 `AV.User.loginWithWeapp()`，而是：
1. 调用 `wx.login()` 获取 code
2. 将 code 发送到后端接口 `/v1/auth/login-weapp`
3. 后端验证 code 并创建/返回 LeanCloud 用户
4. 前端使用返回的 `sessionToken` 进行后续操作

## 工作流程

```
小程序前端
  ↓ wx.login() 获取 code
  ↓ 发送 code 到后端
后端服务器
  ↓ 使用 AppSecret 调用微信 API 换取 openid
  ↓ 使用 openid 创建/查找 LeanCloud 用户
  ↓ 返回 sessionToken
小程序前端
  ↓ 使用 sessionToken 进行后续操作
```

## 安全性

- ✅ AppSecret 仅存在服务器端环境变量中，不会暴露给前端
- ✅ 不需要在 LeanCloud 控制台配置微信信息
- ✅ 完全控制登录流程，可以添加自定义逻辑

## 注意事项

1. **环境变量配置后需要重新部署云引擎**，配置才会生效
2. **确保 AppSecret 的保密性**，不要提交到代码库
3. 如果 AppSecret 泄露，请立即在微信公众平台重新生成

