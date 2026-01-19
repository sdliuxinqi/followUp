## 后端接口文档（LeanCloud 云引擎 REST API）

> 说明：本文件用于记录 **所有** 后端 HTTP 接口。后续增加 / 修改接口时，请务必同步更新此文档，保持与代码一致。  
> 基础路径以 `https://<你的云引擎域名>` 为主机，所有接口前缀统一为 `/v1`。

### 通用约定

- **认证方式**（除特别说明外，所有需要登录的接口都遵守此约定）：
  - 通过 LeanCloud 小程序/SDK 登录后获得 `sessionToken`。
  - 请求头携带其一：
    - `X-LC-Session: <sessionToken>`
    - 或 `Authorization: Bearer <sessionToken>`
- **返回结构**（统一）：
  - 成功：
    ```json
    { "success": true, "data": { ... } }
    ```
  - 失败：
    ```json
    { "success": false, "message": "错误信息" }
    ```

---

### 1. 元数据相关

#### 1.1 获取科室列表

- **URL**：`GET /v1/meta/departments`
- **说明**：用于医生注册/认证时展示科室下拉列表，数据来自 `Department` 表（写死在表里的字典数据）。
- **鉴权**：无需登录。
- **请求参数**：无
- **响应示例**：

```json
{
  "success": true,
  "data": [
    { "id": "dept1", "name": "骨科", "code": "ORTHO", "order": 1 },
    { "id": "dept2", "name": "心内科", "code": "CARDIO", "order": 2 }
  ]
}
```

---

### 2. 认证 / 用户信息

#### 2.1 微信登录后写入用户信息

- **URL**：`POST /v1/auth/register-weapp`
- **鉴权**：需要登录（前端已通过 `AV.User.loginWithWeapp()` 获取到 `sessionToken`，并放在请求头）
- **请求头**：`X-LC-Session` 或 `Authorization: Bearer <sessionToken>`
- **请求体**：
  - `nickname`（可选）：微信昵称
  - `avatar`（可选）：头像 URL
  - `gender`（可选）：建议传 `male` / `female`
- **说明**：仅在对应字段未填写时写入，避免覆盖用户后续修改。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "sessionToken": "SESSION_TOKEN",
    "nickname": "微信昵称",
    "avatar": "https://...",
    "gender": "male",
    "role": "doctor"
  }
}
```

---

#### 2.2 医生注册（提交认证资料）

- **URL**：`POST /v1/auth/register-doctor`
- **鉴权**：需要登录（微信登录后携带 `sessionToken`）
- **请求体**：
  - `name`（必填）：医生姓名
  - `hospital`（必填）：医院名称
  - `department`（必填）：科室名称（与前端科室下拉一致）
  - `workCardImage`（必填）：工作证/执业证照片 URL
- **说明**：
  - 创建/更新 `DoctorProfile`，默认 `isApproved = false`，待人工审核。
  - 审核通过后，可将 `_User.role` 设为 `doctor`，或将 `DoctorProfile.isApproved` 设为 `true`（`doctorRequired` 兼容两种判定）。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "DOCTOR_PROFILE_ID",
    "name": "张三",
    "hospital": "示例医院",
    "department": "骨科",
    "workCertUrl": "https://...",
    "isApproved": false
  }
}
```

---

#### 2.3 获取当前医生档案（是否已注册）

- **URL**：`GET /v1/auth/doctor-profile`
- **鉴权**：需要登录
- **请求体/参数**：无
- **说明**：如果当前用户有 `DoctorProfile`，返回档案；否则返回 `data: null`，前端据此判断是否需要跳转认证页。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "DOCTOR_PROFILE_ID",
    "name": "张三",
    "hospital": "示例医院",
    "department": "骨科",
    "workCertUrl": "https://...",
    "isApproved": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  }
}
```

---

### 3. 患者相关接口

#### 3.1 获取当前患者基础资料

- **URL**：`GET /v1/patient/profile`
- **鉴权**：需要登录（患者）
- **请求参数**：无
- **响应字段**：
  - `id`: PatientProfile 记录 ID
  - `name`, `gender`, `birthDate`, `height`, `admissionNumber`, `admissionDate`, `phone`

#### 3.2 获取当前患者的随访记录列表

- **URL**：`GET /v1/patient/followups`
- **鉴权**：需要登录（患者）
- **说明**：
  - 当前实现返回已填写的随访记录（`FollowUpRecord`），状态统一为 `completed`。
  - 如需“待完成/已失效”等状态，未来可以扩展字段。
- **请求参数**：无
- **响应字段（列表元素）**：
  - `id`: 随访记录 ID（FollowUpRecord）
  - `planId`: 关联计划 ID
  - `planTitle`: 计划名称
  - `doctorName`: 医生/团队名称
  - `fillTime`: 提交时间（记录创建时间）
  - `timeType`: 时间节点（如 `preoperative`, `threeMonths`）
  - `status`: 当前固定为 `"completed"`

#### 3.3 患者绑定随访计划（扫码）

- **URL**：`POST /v1/patient/commitments`
- **鉴权**：需要登录（患者）
- **请求体**：
  - `planId`（必填）：随访计划 ID
- **说明**：
  - 患者通过扫码等方式绑定随访计划，创建 `PatientPlanCommitment` 记录。
  - 如果患者已绑定过该计划，返回成功但不重复创建。
  - 绑定成功后，计划的 `participantCount` 会自动递增。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "commitmentId": "COMMITMENT_ID",
    "planId": "PLAN_ID",
    "planTitle": "术后康复随访计划",
    "message": "绑定成功"
  }
}
```

#### 3.4 获取当前患者的随访承诺列表（用于患者首页）

- **URL**：`GET /v1/patient/commitments`
- **鉴权**：需要登录（患者）
- **说明**：
  - 基于当前患者已绑定的随访计划（`PatientPlanCommitment`）和其历史随访记录（`FollowUpRecord`）动态计算“承诺随访”列表。
  - **只返回已绑定的计划**：患者通过扫码等方式绑定计划后，才会在首页显示。
  - 日常自我评估：如果计划中包含 `dailySelfAssessment`，则在首页「日常自我评估」区块展示该计划。
  - 术后随访：根据手术日期（`answers.basic_surgery_date`） + 时间节点（如 `oneMonth`, `threeMonths` 等）计算应随访日期：
    - 若该时间节点已填写：`status = "completed"`，进入「已填写的随访计划」区块。
    - 若已到达应随访日期，但尚未超过该日期 7 天且尚未填写：`status = "pending"`，进入「待填写的随访计划」区块。
    - 若超过应随访日期 7 天仍未填写：`status = "expired"`，进入「已失效（历史）」区块。
    - 若尚未到达应随访日期：不返回该时间节点（前端不展示）。
  - 术前/出院前节点（`preoperative`, `preDischarge`）暂只在已填写时返回，避免术后补录时产生混淆。
- **请求参数**：无
- **响应字段（列表元素）**：
  - `id`: 随访记录 ID，若为待填写的随访节点（尚未有记录）则为 `null`
  - `planId`: 关联计划 ID
  - `planTitle`: 计划名称
  - `doctorName`: 医生/团队名称
  - `fillTime`:
    - 已填写记录：记录创建时间
    - 待填写/已失效节点：推荐随访日期（由「手术日期 + 对应月份偏移」计算）
  - `timeType`: 时间节点（如 `dailySelfAssessment`, `oneMonth`, `threeMonths` 等）
  - `status`: `"pending"` / `"completed"` / `"expired"`

#### 3.5 获取随访计划 + 患者基础资料（用于填写前）

- **URL**：`GET /v1/followups/plans/:id`
- **鉴权**：需要登录（患者）
- **路径参数**：
  - `id`: FollowUpPlan ID
- **响应结构**：
  - `plan`：随访计划详情
    - `id`, `title`, `timeTypes`, `participantCount`, `creatorName`, `creatorId`, `isDiscarded`, `createdAt`, `updatedAt`
    - `questions`: 计划问题数组（与小程序创建时的结构一致）
    - `functionalAssessments`: 量表数组（如 VAS、EQ-5D-5L、OKS）
  - `patientProfile`：当前患者基础资料（同 2.1）

#### 3.6 提交随访记录

- **URL**：`POST /v1/followups/records`
- **鉴权**：需要登录（患者）
- **请求体示例**：

```json
{
  "planId": "PLAN_ID",
  "timeType": "oneMonth",
  "answers": {
    "basic_name": "张三",
    "basic_gender": "male",
    "basic_birth_date": "1979-05-15",
    "basic_height": "175",
    "basic_weight": "70",
    "basic_admission_number": "2024110001",
    "basic_admission_date": "2024-11-01",
    "basic_surgery_date": "2024-11-15",
    "basic_visit_date": "2024-12-15",
    "basic_contact": "138****5678",
    "vas_pain_score": 5
  }
}
```

- **请求字段**：
  - `planId`（必填）：随访计划 ID。
  - `timeType`（可选）：当前填写对应的时间节点，如 `preoperative`、`threeMonths`；不传则后端会使用计划的第一个 `timeTypes`。
  - `answers`（必填）：答卷对象，key 为题目 ID，value 为答案（文本、数值、选项 ID、数组、URL 等）。
- **验证规则**：
  - 后端会验证所有必填项是否已填写（包括计划中的必填问题和功能评分量表中的必填项）。
  - 如果同一患者已提交过同一计划的同一时间节点记录，会返回错误提示，不允许重复提交。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "recordId": "RECORD_ID"
  }
}
```

- **错误响应示例**：

```json
{
  "success": false,
  "message": "请填写以下必填项：体重、随访日期、视觉模拟疼痛评分"
}
```

```json
{
  "success": false,
  "message": "您已提交过该时间节点的随访记录，无法重复提交"
}
```

---

### 4. 医生相关接口

#### 4.1 获取当前医生创建的随访计划列表

- **URL**：`GET /v1/doctor/plans`
- **鉴权**：需要医生身份
- **请求参数**：无
- **响应字段（列表元素）**：
  - `id`: 计划 ID
  - `title`: 计划名称
  - `timeTypes`: 时间节点数组
  - `participantCount`: 参与人数
  - `creatorName`: 创建人名称
  - `creatorId`: 创建人用户 ID
  - `teamLeaderId`: 团队负责人用户 ID
  - `teamName`: 团队名（即负责人姓名，用于首页展示“哪个团队创建”）
  - `isDiscarded`: 是否已废弃
  - `createdAt`, `updatedAt`: 创建/更新时间

#### 4.2 创建随访计划

- **URL**：`POST /v1/doctor/plans`
- **鉴权**：需要医生身份，且必须是所在团队的**负责人或管理员**
- **请求体示例**：

```json
{
  "title": "术后康复随访计划",
  "timeTypes": ["oneMonth", "threeMonths"],          // 必填：可直接用页面选中的 value 列表
  "timeNodes": [                                     // 可选：更丰富的时间配置（若前端使用对象）
    { "value": "oneMonth", "label": "术后1月" },
    { "value": "threeMonths", "label": "术后3月" }
  ],
  "questions": [
    {
      "id": "basic_name",
      "type": "text",
      "title": "姓名",
      "required": true
    }
  ],
  "aiEnabled": true,                                 // 可选：是否启用 AI 评估
  "functionalCodes": ["VAS_PAIN", "OKS"],            // 可选：选中的量表 code 列表
  "functionalAssessments": [
    {
      "id": "VAS_PAIN",
      "title": "视觉模拟疼痛评分 (VAS)",
      "questions": [ ... ]
    }
  ]
}
```

- **请求字段**：
  - `title`（必填）：计划名称。
  - `timeTypes`（必填）：时间节点数组（可用页面固定列表的 value）。
  - `timeNodes`（可选）：时间节点对象数组，若前端希望携带 label/value/offset 等自定义信息，可按对象数组提交，后端原样存储。
  - `questions`（必填）：选中的题目数组，来源于页面勾选的基础题目与量表题目。字段包含：
    - `id`（题目 ID，对量表题目形如 `OKS_q1` 或 `VAS_PAIN_1`）
    - `type`（`text` / `single` / `checkbox` / `slider` / `video`）
    - `title` 或 `text`（题干）
    - `options`（可选，多选/单选使用）
    - `min`/`max`/`step`/`marks`（可选，滑块题使用）
    - `required`（是否必填）
  - `aiEnabled`（可选，Boolean）：是否开启 AI 评估。
  - `functionalCodes`（可选，String[]）：选中的量表 code 列表（如 `["VAS_PAIN","OKS"]`）。
  - `functionalAssessments`（可选）：量表数组，如果需要保留原始量表结构可传；当前页面已将选中量表题目扁平化后放进 `questions`。
  - 其他未使用字段会被忽略；`participantCount` 会由后端初始化为 0。
- **响应**：返回新建计划的完整信息（同 3.1 的列表元素字段）。

#### 4.3 获取单个随访计划详情

- **URL**：`GET /v1/doctor/plans/:id`
- **鉴权**：需要医生身份
- **路径参数**：
  - `id`: FollowUpPlan ID
- **响应**：
  - 同 3.1 的字段，额外包含：
    - `questions`
    - `functionalAssessments`
    - `qrPath`: 小程序内随访填写页路径（前端可用此路径拼接二维码）

#### 4.4 废弃随访计划

- **URL**：`POST /v1/doctor/plans/:id/discard`
- **鉴权**：需要医生身份（且必须为该计划的创建者）
- **路径参数**：
  - `id`: FollowUpPlan ID
- **请求体**：无
- **响应示例**：

```json
{ "success": true }
```

#### 4.5 获取某随访计划下的所有随访记录（患者列表）

- **URL**：`GET /v1/doctor/plans/:id/records`
- **鉴权**：需要医生身份
- **路径参数**：
  - `id`: FollowUpPlan ID
- **响应字段（列表元素）**：
  - `id`: FollowUpRecord ID
  - `planId`: 计划 ID
  - `patientId`: 患者用户 ID
  - `timeType`: 时间节点
  - `patientName`: 患者姓名（冗余）
  - `patientGender`: 患者性别（冗余）
  - `admissionNumber`: 住院号（冗余）
  - `fillTime`: 填写时间（同 createdAt）
  - `createdAt`, `updatedAt`

---

#### 4.6 获取指定患者的随访详情（医生视角）

- **URL**：`GET /v1/doctor/plans/:planId/patients/:patientId/record`
- **鉴权**：需要医生身份
- **路径参数**：
  - `planId`: FollowUpPlan ID
  - `patientId`: 患者 `_User` 对象 ID
- **说明**：
  - 用于医生端“患者随访详情”页面；结合随访计划配置和患者填写答案，返回结构化结果。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "planId": "PLAN_ID",
    "planTitle": "术后康复随访计划",
    "patientId": "PATIENT_USER_ID",
    "patientName": "张三",
    "fillTime": "2025-01-01T00:00:00.000Z",
    "status": "completed",
    "answers": [
      { "id": "basic_name", "question": "姓名", "type": "text", "required": true, "answer": "张三" },
      { "id": "basic_gender", "question": "性别", "type": "single", "required": true, "answer": "male" }
    ],
    "requiredAnswers": [
      { "id": "basic_name", "question": "姓名", "type": "text", "required": true, "answer": "张三" }
    ],
    "requiredCount": 1,
    "functionalAssessments": [
      {
        "id": "VAS_PAIN",
        "title": "视觉模拟疼痛评分 (VAS)",
        "questions": [ /* 量表题及得分（如有存储） */ ]
      }
    ],
    "aiReport": {
      "summary": "",
      "details": [],
      "suggestions": []
    }
  }
}
```

---

#### 4.6 获取医生团队信息

- **URL**：`GET /v1/doctor/team`
- **鉴权**：需要医生身份
- **说明**：
  - 团队由负责人标识，成员记录的 `leader` 字段均指向负责人。
  - 如当前用户尚无团队记录且已通过医生认证，会自动为其创建一条负责人成员记录。
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "isCurrentUserLeader": true,
    "members": [
      {
        "id": "USER_ID_1",
        "name": "张医生",
        "hospital": "齐鲁医院",
        "department": "骨科",
        "title": "主任医师",
        "isLeader": true,
        "isAdmin": true,
        "planCount": 25
      },
      {
        "id": "USER_ID_2",
        "name": "李医生",
        "hospital": "齐鲁医院",
        "department": "骨科",
        "title": "主治医师",
        "isLeader": false,
        "isAdmin": true,
        "planCount": 12
      }
    ],
    "totalPlans": 37
  }
}
```

---

#### 4.7 添加团队成员（负责人）

- **URL**：`POST /v1/doctor/team/members`
- **鉴权**：需要医生身份，且当前用户必须是团队负责人
- **请求体**：
  - `doctorId`（必填）：要添加成员的 `_User` 对象 ID
- **响应**：
  - 返回新成员对象，结构同 `GET /v1/doctor/team` 中 `members` 元素。
 - **规则**：
   - 除负责人外，其它医生可以被添加到多个不同团队；
   - 若目标医生已经是其他团队的负责人，则不可加入当前团队。

---

#### 4.8 移除团队成员（负责人）

- **URL**：`DELETE /v1/doctor/team/members/:memberId`
- **鉴权**：需要医生身份，且当前用户必须是团队负责人
- **路径参数**：
  - `memberId`：要移除成员的 `_User` 对象 ID
- **说明**：不能移除负责人本人。
- **响应示例**：

```json
{ "success": true }
```

---

#### 4.9 设置/取消管理员（负责人）

- **URL**：`POST /v1/doctor/team/members/:memberId/admin`
- **鉴权**：需要医生身份，且当前用户必须是团队负责人
- **路径参数**：
  - `memberId`：成员 `_User` 对象 ID
- **请求体**：
  - `isAdmin`（必填）：`true` 表示设为管理员，`false` 表示取消管理员
- **响应**：
  - 返回更新后的成员对象，结构同 `GET /v1/doctor/team` 中 `members` 元素。
 - **规则**：
   - 同一名医生在任意时刻最多只在一个团队中担任管理员（`isAdmin = true`）；
   - 如果该医生已经是其他团队的管理员，则会返回 400，提示不可同时管理多个团队。

---

#### 4.10 获取医生列表（用于团队成员管理）

- **URL**：`GET /v1/doctor/list`
- **鉴权**：需要医生身份
- **查询参数**：
  - `department`（可选）：按科室筛选
  - `keyword`（可选）：按姓名或医院搜索
- **说明**：
  - 仅返回已通过认证的医生（`DoctorProfile.isApproved = true`）
  - 用于团队成员管理弹窗，显示可添加的医生列表
- **响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": "USER_ID_1",
      "name": "张医生",
      "hospital": "齐鲁医院",
      "department": "骨科",
      "title": "主任医师"
    },
    {
      "id": "USER_ID_2",
      "name": "李医生",
      "hospital": "齐鲁医院",
      "department": "骨科",
      "title": "主治医师"
    }
  ]
}
```

---

### 5. 维护说明

- 每当在 `web/routes` 中新增、修改、删除路由（特别是 `/v1/...` 开头的接口）时：
  - 请同步在本文件中增删改对应的接口章节；
  - 保证 URL、方法（GET/POST 等）、参数说明、返回结构与实际实现一致；
  - 如有复杂业务规则（权限、状态变更、字段含义），建议在对应小节增加「说明」子段落。 


