# 数据表结构设计（LeanCloud）

以下为部署在 LeanCloud 数据存储的建议 Class 及字段定义。类型均为 LeanCloud 支持的字段类型，除特殊说明外无必填约束，可根据业务在控制台添加「必填」「唯一」等限制。

## 1. `_User`（内置用户表）

- `role`: String  
  - 取值示例：`doctor` / `patient`；用于快速鉴权。
- `nickname`: String （可选，微信昵称）
- `avatar`: String （可选，头像 URL）

## 2. `DoctorProfile`（医生资料）

- `user`: Pointer<_User>（关联医生用户）
- `name`: String（姓名）
- `hospital`: String（医院）
- `department`: String（科室）
- `title`: String（职称）
- `isApproved`: Boolean（是否通过认证）
- `extraInfo`: Object（扩展信息，预留）

## 3. `PatientProfile`（患者资料）

- `user`: Pointer<_User>（关联患者用户）
- `name`: String
- `gender`: String（建议值：`male` / `female`）
- `birthDate`: String 或 Date
- `height`: String 或 Number
- `admissionNumber`: String（住院号）
- `admissionDate`: String 或 Date
- `phone`: String
- `extraInfo`: Object（扩展信息，预留）

## 4. `FollowUpPlan`（随访计划）

- `title`: String（计划名称）
- `creator`: Pointer<_User>（创建者）
- `creatorId`: String（冗余创建者 ID，便于查询）
- `creatorName`: String（冗余创建者名，用于展示）
- `teamLeader`: Pointer<_User>（创建该计划的团队负责人）
- `teamLeaderId`: String（团队负责人用户 ID）
- `teamLeaderName`: String（团队名，通常为负责人姓名）
- `timeTypes`: Array<String>（时间节点，如 `dailySelfAssessment`, `preoperative`, `oneMonth` 等）
- `questions`: Array<Object>（计划选中的问题列表；结构与小程序创建页保持一致）
- `functionalAssessments`: Array<Object>（量表结构，可选）
- `participantCount`: Number（参与人数，默认 0）
- `isDiscarded`: Boolean（是否废弃，默认 false）
- `extraConfig`: Object（扩展配置，预留）

## 5. `FollowUpRecord`（随访记录）

- `plan`: Pointer<FollowUpPlan>（关联计划）
- `planId`: String（冗余 Plan ID，便于查询）
- `patient`: Pointer<_User>（患者）
- `patientId`: String（冗余患者 ID）
- `answers`: Object（完整答卷，key 为题目 ID）
- `timeType`: String（本次填写对应的时间节点，如 `preoperative`、`threeMonths`）
- `patientName`: String（冗余，自 answers.basic_name）
- `patientGender`: String（冗余，自 answers.basic_gender）
- `admissionNumber`: String（冗余，自 answers.basic_admission_number）
- `extraInfo`: Object（扩展信息，用于存储 AI 分析报告，包含 `summary`、`details`、`suggestions` 字段）

## 6. `Department`（科室字典表）

- `name`: String（科室名称，例如“骨科”“心内科”）
- `code`: String（科室编码，可选）
- `order`: Number（排序，升序）
- `isEnabled`: Boolean（是否启用，默认 true）

> 说明：用于医生注册/认证时的科室下拉选择。可在控制台预置一组固定科室，后端已提供 `GET /v1/meta/departments` 接口按 `isEnabled=true, order asc` 返回列表。

## 7. `DoctorTeamMember`（医生团队成员）

- `leader`: Pointer<_User>（团队负责人，对应团队唯一标识）
- `member`: Pointer<_User>（团队成员）
- `doctorProfile`: Pointer<DoctorProfile>（成员对应的医生资料，便于展示）
- `isLeader`: Boolean（是否为负责人，负责人自身也有一条记录）
- `isAdmin`: Boolean（是否为管理员，可创建随访计划）
- `planCount`: Number（该成员创建的随访计划数量统计，预留）
- （可选冗余字段）`name`、`hospital`、`department`、`title`: String（可按需添加，减少联表查询）

> 说明：  
> - 一个团队由负责人标识，所有成员记录的 `leader` 字段指向同一负责人。  
> - 负责人在本表中也有一条记录：`leader = member = 负责人`, `isLeader = true`, `isAdmin = true`。  
> - 只有 `isLeader` 或 `isAdmin` 的成员可以创建随访计划。  
> - **除负责人外，其它医生可以同时出现在多个团队中作为成员；负责人只能管理自己的团队，不能加入其他团队。**  
> - **管理员只能属于一个团队：同一名医生在任意时刻最多只在一个团队中拥有 `isAdmin = true` 记录。**

## 8. `PatientPlanCommitment`（患者计划绑定）

- `patient`: Pointer<_User>（患者用户）
- `patientId`: String（冗余患者 ID，便于查询）
- `plan`: Pointer<FollowUpPlan>（关联随访计划）
- `planId`: String（冗余计划 ID，便于查询）
- `admissionNumber`: String（住院号，与计划绑定）
- `teamName`: String（治疗组名称，与计划绑定）
- `doctorId`: String（医生用户ID，与计划绑定）
- `surgeryDate`: String 或 Date（手术时间，与计划绑定）
- `admissionDate`: String 或 Date（住院时间，与计划绑定）
- `dischargeDate`: String 或 Date（出院时间，与计划绑定）
- `isCurrent`: Boolean（是否为当前随访计划，默认 false）
- `createdAt`, `updatedAt`: Date（创建/更新时间）

> 说明：
> - 用于记录患者通过扫码等方式绑定随访计划的关系。
> - 患者扫码后，创建一条绑定记录，表示该患者参与该随访计划。
> - 患者首页的"我的随访计划"列表基于此表生成，只显示已绑定的计划。
> - **住院号和治疗组信息与随访计划绑定**，同一患者在不同计划中可以有不同的住院号和治疗组。
> - **当前随访计划**：患者可以设置其中一个计划为当前计划，用于标识主要关注的随访计划。同一患者同时只能有一个当前计划。
> - 建议在 `patientId` 和 `planId` 上建立索引，便于快速查询。

## 字段校验与索引建议

- 可在 `_User.role` 上添加「枚举」约束，限定 `doctor/patient`。
- 医生身份判定：优先看 `_User.role === 'doctor'`，否则查 `DoctorProfile.isApproved = true`。
- 常用查询可加索引：
  - `FollowUpPlan.creatorId`
  - `FollowUpRecord.planId`
  - `FollowUpRecord.patientId`
  - `PatientPlanCommitment.patientId`
  - `PatientPlanCommitment.planId`
- 如需状态管理（待完成/已完成/已失效），可为 `FollowUpRecord` 增加 `status: String` 字段并建立索引。

