# LeanCloud 云函数部署说明

## 项目概述

本项目使用 LeanCloud 云引擎（Cloud Engine）来运行云函数，而非微信云开发。所有云函数已转换为 LeanCloud 云引擎格式。

## 云函数列表

已转换的云函数：
- `checkDoctorRole`: 检查用户是否为认证医生
- `createFollowUpPlan`: 创建随访计划
- `getDoctorTeam`: 获取医生团队成员
- `submitFollowUpRecord`: 提交随访记录

## 部署步骤

### 1. 安装 LeanCloud 命令行工具

```bash
npm install -g leancloud-cli
```

### 2. 登录 LeanCloud 账户

```bash
lean login
```

### 3. 创建云引擎项目配置

在项目根目录创建 `cloudcode/` 目录，并将所有云函数文件移动到该目录：

```bash
mkdir -p cloudcode/functions
cp -r cloud/* cloudcode/functions/
```

### 4. 创建云引擎配置文件

在 `cloudcode/` 目录下创建以下文件：

#### cloudcode/package.json

```json
{
  "name": "follow-up-cloud-functions",
  "version": "1.0.0",
  "description": "随访系统云函数",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "deploy": "lean deploy"
  },
  "dependencies": {
    "leanengine": "^3.6.0"
  }
}
```

#### cloudcode/index.js

```javascript
const AV = require('leanengine');

// 初始化 LeanCloud
AV.init({
  appId: 'qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz',
  appKey: 'NfPKhZiV31u5F0FjffGuKyT6',
  masterKey: 'D37vVcFQmoD0bVI6UY9e9n3S',
  serverURL: 'https://api.tka-followup.top'
});

// 加载所有云函数
require('./functions/checkDoctorRole/main');
require('./functions/createFollowUpPlan/main');
require('./functions/getDoctorTeam/main');
require('./functions/submitFollowUpRecord/main');
```

### 5. 部署到 LeanCloud

```bash
cd cloudcode
npm install
lean deploy
```

## 本地开发（可选）

### 1. 安装依赖

```bash
cd cloudcode
npm install
```

### 2. 启动本地开发服务器

```bash
lean up
```

## 注意事项

1. 确保 LeanCloud 控制台中已正确配置应用的 App ID、App Key 和 Master Key
2. 云函数中使用 `request.currentUser` 获取当前登录用户，无需额外处理认证
3. 错误处理使用 `AV.Cloud.Error` 抛出，这样可以将错误信息正确返回给前端
4. 部署前请确保所有依赖已正确安装

## 前端调用方式

前端通过以下方式调用云函数：

```javascript
AV.Cloud.run('云函数名称', { 参数 }).then(result => {
  // 处理成功结果
}).catch(error => {
  // 处理错误
});
```

例如：

```javascript
AV.Cloud.run('checkDoctorRole', {}).then(result => {
  if (result.success) {
    console.log('是否为医生:', result.isDoctor);
  }
}).catch(error => {
  console.error('调用失败:', error);
});
```
