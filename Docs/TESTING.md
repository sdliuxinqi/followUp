# 接口测试指南

本文档说明如何测试部署到 LeanCloud 云引擎的 REST API 接口。

## 前置准备

### 1. 获取部署域名

部署完成后，在 LeanCloud 控制台获取云引擎域名：
- 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
- 进入你的应用 → **云引擎** → **设置**
- 查看 **云引擎域名**，例如：`https://your-app-name.leanapp.cn`

### 2. 获取 SessionToken

接口测试需要先获取用户的 `sessionToken`。有两种方式：

#### 方式一：通过 LeanCloud SDK（小程序/Web）

```javascript
// 小程序中
const AV = require('./libs/av-core-min.js')
AV.init({
  appId: 'YOUR_APP_ID',
  appKey: 'YOUR_APP_KEY'
})

// 微信登录
AV.User.loginWithWeapp().then(user => {
  const sessionToken = user.getSessionToken()
  console.log('SessionToken:', sessionToken)
  // 保存这个 token 用于测试
})
```

#### 方式二：通过 LeanCloud REST API

```bash
# 使用用户名密码登录（需要先在控制台创建用户）
curl -X POST \
  https://YOUR_APP_ID.api.lncld.net/1.1/login \
  -H "X-LC-Id: YOUR_APP_ID" \
  -H "X-LC-Key: YOUR_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass"
  }'
```

响应中的 `sessionToken` 字段即为所需。

### 3. 准备测试工具

推荐使用以下工具之一：
- **Postman**（图形界面，推荐）
- **curl**（命令行）
- **HTTPie**（命令行，更友好）
- **Thunder Client**（VS Code 插件）

---

## 测试方法

### 方法一：使用 curl（命令行）

#### 1. 测试无需认证的接口

```bash
# 获取科室列表
curl -X GET \
  https://your-app-name.leanapp.cn/v1/meta/departments \
  -H "Content-Type: application/json"
```

#### 2. 测试需要认证的接口

```bash
# 替换 YOUR_SESSION_TOKEN 为实际获取的 token
curl -X GET \
  https://your-app-name.leanapp.cn/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN"
```

或者使用 Authorization 头：

```bash
curl -X GET \
  https://your-app-name.leanapp.cn/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### 3. 测试 POST 接口

```bash
# 提交随访记录
curl -X POST \
  https://your-app-name.leanapp.cn/v1/followups/records \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN" \
  -d '{
    "planId": "PLAN_ID",
    "timeType": "oneMonth",
    "answers": {
      "basic_name": "张三",
      "basic_gender": "male"
    }
  }'
```

### 方法二：使用 Postman

#### 1. 创建环境变量

在 Postman 中创建环境，设置变量：
- `base_url`: `https://your-app-name.leanapp.cn`
- `session_token`: `YOUR_SESSION_TOKEN`

#### 2. 配置请求

- **URL**: `{{base_url}}/v1/patient/profile`
- **Method**: `GET`
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-LC-Session`: `{{session_token}}`

#### 3. 测试 POST 请求

- **URL**: `{{base_url}}/v1/followups/records`
- **Method**: `POST`
- **Headers**: 同上
- **Body** (选择 raw + JSON):
```json
{
  "planId": "PLAN_ID",
  "timeType": "oneMonth",
  "answers": {
    "basic_name": "张三",
    "basic_gender": "male"
  }
}
```

### 方法三：使用 HTTPie

```bash
# 安装 HTTPie（如果未安装）
# Windows: pip install httpie
# Mac: brew install httpie

# GET 请求
http GET https://your-app-name.leanapp.cn/v1/meta/departments

# 带认证的 GET 请求
http GET https://your-app-name.leanapp.cn/v1/patient/profile \
  X-LC-Session:YOUR_SESSION_TOKEN

# POST 请求
http POST https://your-app-name.leanapp.cn/v1/followups/records \
  X-LC-Session:YOUR_SESSION_TOKEN \
  planId="PLAN_ID" \
  timeType="oneMonth" \
  answers:='{"basic_name":"张三","basic_gender":"male"}'
```

---

## 完整测试流程示例

### 步骤 1：获取科室列表（无需认证）

```bash
curl -X GET \
  https://your-app-name.leanapp.cn/v1/meta/departments
```

**预期响应**:
```json
{
  "success": true,
  "data": [
    { "id": "dept1", "name": "骨科", "code": "ORTHO", "order": 1 }
  ]
}
```

### 步骤 2：微信登录后注册用户信息

```bash
curl -X POST \
  https://your-app-name.leanapp.cn/v1/auth/register-weapp \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN" \
  -d '{
    "nickname": "测试用户",
    "avatar": "https://example.com/avatar.jpg",
    "gender": "male"
  }'
```

### 步骤 3：医生注册（提交认证资料）

```bash
curl -X POST \
  https://your-app-name.leanapp.cn/v1/auth/register-doctor \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN" \
  -d '{
    "name": "张医生",
    "hospital": "示例医院",
    "department": "骨科",
    "workCardImage": "https://example.com/cert.jpg"
  }'
```

### 步骤 4：获取医生档案

```bash
curl -X GET \
  https://your-app-name.leanapp.cn/v1/auth/doctor-profile \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN"
```

### 步骤 5：创建随访计划（需要医生身份）

```bash
curl -X POST \
  https://your-app-name.leanapp.cn/v1/doctor/plans \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN" \
  -d '{
    "title": "术后康复随访计划",
    "timeTypes": ["oneMonth", "threeMonths"],
    "questions": [
      {
        "id": "basic_name",
        "type": "text",
        "title": "姓名",
        "required": true
      }
    ]
  }'
```

### 步骤 6：获取随访计划列表

```bash
curl -X GET \
  https://your-app-name.leanapp.cn/v1/doctor/plans \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: YOUR_SESSION_TOKEN"
```

### 步骤 7：患者提交随访记录

```bash
curl -X POST \
  https://your-app-name.leanapp.cn/v1/followups/records \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: PATIENT_SESSION_TOKEN" \
  -d '{
    "planId": "PLAN_ID_FROM_STEP_5",
    "timeType": "oneMonth",
    "answers": {
      "basic_name": "患者姓名",
      "basic_gender": "male",
      "basic_admission_number": "2024110001"
    }
  }'
```

---

## 常见问题排查

### 1. 401 未授权错误

**原因**: SessionToken 无效或已过期

**解决**:
- 重新获取 sessionToken
- 检查请求头是否正确：`X-LC-Session` 或 `Authorization: Bearer <token>`

### 2. 403 禁止访问错误

**原因**: 用户权限不足（例如：非医生用户访问医生接口）

**解决**:
- 确认用户已通过医生认证（`_User.role = 'doctor'` 或 `DoctorProfile.isApproved = true`）
- 在 LeanCloud 控制台检查用户数据

### 3. 404 接口不存在

**原因**: 
- URL 路径错误
- 接口未部署成功

**解决**:
- 检查 URL 是否正确（注意 `/v1` 前缀）
- 确认部署成功：`lean deploy --prod`
- 查看云引擎日志：`lean logs`

### 4. 500 服务器错误

**原因**: 服务器内部错误

**解决**:
- 查看云引擎日志：`lean logs` 或控制台 → 云引擎 → 日志
- 检查请求参数是否符合接口要求
- 检查数据库表结构是否正确

---

## 查看日志

### 使用命令行

```bash
# 查看实时日志
lean logs

# 查看最近 100 条日志
lean logs --limit 100
```

### 使用控制台

1. 登录 LeanCloud 控制台
2. 进入应用 → **云引擎** → **日志**
3. 查看实时日志或历史日志

---

## 测试脚本示例

可以创建一个测试脚本文件 `test-api.sh`（Linux/Mac）或 `test-api.bat`（Windows）：

```bash
#!/bin/bash

# 配置
BASE_URL="https://your-app-name.leanapp.cn"
SESSION_TOKEN="YOUR_SESSION_TOKEN"

# 测试获取科室列表
echo "测试：获取科室列表"
curl -X GET "${BASE_URL}/v1/meta/departments" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# 测试获取患者资料
echo "测试：获取患者资料"
curl -X GET "${BASE_URL}/v1/patient/profile" \
  -H "Content-Type: application/json" \
  -H "X-LC-Session: ${SESSION_TOKEN}"

echo -e "\n\n"
```

---

## 接口列表速查

| 接口 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 获取科室列表 | GET | `/v1/meta/departments` | 无需 |
| 注册用户信息 | POST | `/v1/auth/register-weapp` | 需要 |
| 医生注册 | POST | `/v1/auth/register-doctor` | 需要 |
| 获取医生档案 | GET | `/v1/auth/doctor-profile` | 需要 |
| 获取患者资料 | GET | `/v1/patient/profile` | 需要 |
| 获取随访记录 | GET | `/v1/patient/followups` | 需要 |
| 获取计划详情 | GET | `/v1/followups/plans/:id` | 需要 |
| 提交随访记录 | POST | `/v1/followups/records` | 需要 |
| 获取医生计划列表 | GET | `/v1/doctor/plans` | 医生 |
| 创建随访计划 | POST | `/v1/doctor/plans` | 医生 |
| 获取计划详情 | GET | `/v1/doctor/plans/:id` | 医生 |
| 获取团队信息 | GET | `/v1/doctor/team` | 医生 |

完整接口文档请参考：`Docs/backend_api.md`

