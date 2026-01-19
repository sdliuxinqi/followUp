# 简单接口测试指南

部署完成后，使用以下两个简单的接口来测试服务是否正常运行。

## 测试接口

### 1. 健康检查接口（最简单）

**URL**: `https://your-app-name.leanapp.cn/health`

**方法**: `GET`

**说明**: 无需任何参数，直接访问即可

**测试方法**:

#### 浏览器直接访问
直接在浏览器地址栏输入：
```
https://your-app-name.leanapp.cn/health
```

#### 使用 curl
```bash
curl https://your-app-name.leanapp.cn/health
```

**预期响应**:
```json
{
  "status": "ok",
  "message": "服务运行正常",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production"
}
```

---

### 2. 完整测试接口（测试 LeanCloud 连接）

**URL**: `https://your-app-name.leanapp.cn/test`

**方法**: `GET`

**说明**: 测试 LeanCloud 数据库连接是否正常，会在数据库中创建一个测试对象

**测试方法**:

#### 浏览器直接访问
```
https://your-app-name.leanapp.cn/test
```

#### 使用 curl
```bash
curl https://your-app-name.leanapp.cn/test
```

**预期响应（成功）**:
```json
{
  "success": true,
  "message": "接口测试成功，LeanCloud 连接正常",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "testObjectId": "xxxxx",
  "leancloud": {
    "appId": "已配置",
    "appKey": "已配置"
  }
}
```

**预期响应（失败）**:
```json
{
  "success": false,
  "message": "接口测试失败",
  "error": "错误信息",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 快速测试步骤

1. **部署到 LeanCloud**
   ```bash
   cd web
   lean deploy --prod
   ```

2. **获取云引擎域名**
   - 登录 LeanCloud 控制台
   - 进入应用 → **云引擎** → **设置**
   - 复制云引擎域名
   - ⚠️ **重要**：确保域名已正确绑定到云引擎应用

3. **先测试根路径（验证部署）**
   - 在浏览器访问：`http://your-app-name.leanapp.cn/` 或 `https://your-app-name.leanapp.cn/`
   - 如果能看到页面（即使是错误页面），说明部署成功
   - 如果看到 "Application not Found"，请参考 `Docs/TROUBLESHOOTING.md` 排查

4. **测试健康检查接口**
   - 在浏览器访问：`http://your-app-name.leanapp.cn/health` 或 `https://your-app-name.leanapp.cn/health`
   - 如果看到 JSON 响应，说明部署成功！

4. **测试完整接口（可选）**
   - 在浏览器访问：`https://your-app-name.leanapp.cn/test`
   - 如果返回 `success: true`，说明 LeanCloud 连接正常

---

## 常见问题

### 1. 访问返回 "Application not Found"
- **最常见原因**：域名未正确绑定到云引擎应用
- **解决步骤**：
  1. 登录 LeanCloud 控制台
  2. 进入应用 → **云引擎** → **设置**
  3. 检查域名绑定状态，确保域名已绑定
  4. 等待 5-10 分钟让域名生效
- 详细排查方法请参考：`Docs/TROUBLESHOOTING.md`

### 2. 访问返回 404
- 先测试根路径 `/` 是否能访问
- 检查 URL 是否正确（注意域名和路径）
- 确认部署是否成功完成
- 等待几分钟后重试（部署可能需要时间生效）

### 3. 访问返回 500
- 查看云引擎日志：`lean logs` 或控制台 → 云引擎 → 日志
- 检查环境变量是否配置正确

### 4. /test 接口返回错误
- 检查 LeanCloud 应用配置是否正确
- 确认 `LEANCLOUD_APP_ID` 和 `LEANCLOUD_APP_KEY` 环境变量已设置

---

## 测试脚本（一键测试）

### Windows
```batch
@echo off
echo 测试健康检查接口...
curl https://your-app-name.leanapp.cn/health
echo.
echo.
echo 测试完整接口...
curl https://your-app-name.leanapp.cn/test
pause
```

### Linux/Mac
```bash
#!/bin/bash
echo "测试健康检查接口..."
curl https://your-app-name.leanapp.cn/health
echo -e "\n\n"
echo "测试完整接口..."
curl https://your-app-name.leanapp.cn/test
```

---

就是这么简单！如果 `/health` 接口能正常返回，说明你的服务已经成功部署并运行了！

