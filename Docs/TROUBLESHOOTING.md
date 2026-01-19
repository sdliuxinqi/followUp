# 部署问题排查指南

## 问题：Application not Found

### 症状
访问云引擎域名时提示：
```
Application not Found
没有找到对应的云引擎应用，请确认应用已经正确部署。
```

### 可能原因和解决方案

#### 1. 域名未正确绑定（最常见）

**问题**：LeanCloud 云引擎需要先绑定域名才能通过域名访问。

**解决步骤**：

1. **登录 LeanCloud 控制台**
   - 访问：https://console.leancloud.cn/
   - 进入你的应用

2. **进入云引擎设置**
   - 左侧菜单：**云引擎** → **设置**
   - 找到 **域名绑定** 或 **自定义域名** 部分

3. **绑定域名**
   - 如果看到 `qfy2efad.cn-n1-cname-1.leanapp.cn` 这个域名，确保它已绑定到当前应用
   - 如果没有绑定，点击 **绑定域名** 或 **添加域名**
   - 等待域名生效（通常需要几分钟）

4. **验证绑定**
   - 绑定成功后，在控制台查看域名状态
   - 确保域名指向正确的云引擎应用

#### 2. 使用错误的访问方式

**问题**：LeanCloud 云引擎有两种访问方式，可能使用了错误的方式。

**解决方案**：

**方式一：通过云引擎域名访问（推荐）**
```
https://qfy2efad.cn-n1-cname-1.leanapp.cn/health
```

**方式二：通过应用 ID 访问（如果域名未绑定）**
```
https://qfy2efad.api.lncld.net/health
```
注意：这种方式可能不支持自定义路径，只能访问根路径 `/`

#### 3. 先测试根路径

在测试 `/health` 之前，先测试根路径 `/` 是否能访问：

```bash
# 测试根路径
curl https://qfy2efad.cn-n1-cname-1.leanapp.cn/

# 或者
curl http://qfy2efad.cn-n1-cname-1.leanapp.cn/
```

如果根路径能访问，说明部署成功，然后再测试 `/health`。

#### 4. 检查部署状态

1. **查看部署日志**
   ```bash
   lean logs
   ```
   或登录控制台 → **云引擎** → **日志**

2. **确认实例状态**
   - 控制台 → **云引擎** → **部署**
   - 查看实例状态是否为 **运行中**

3. **检查版本**
   - 确认最新版本已部署成功
   - 查看部署时间是否是最新的

#### 5. 等待域名生效

域名绑定后可能需要等待：
- **CNAME 域名**：通常需要 5-10 分钟生效
- **自定义域名**：可能需要更长时间（取决于 DNS 配置）

**建议**：等待 10-15 分钟后重试。

---

## 快速测试步骤

### 步骤 1：测试根路径

```bash
# 使用 HTTP（如果 HTTPS 不行）
curl http://qfy2efad.cn-n1-cname-1.leanapp.cn/

# 或使用 HTTPS
curl https://qfy2efad.cn-n1-cname-1.leanapp.cn/
```

**预期结果**：
- 如果返回 HTML 页面（index.ejs 渲染的内容），说明部署成功
- 如果返回 "Application not Found"，继续下一步

### 步骤 2：检查控制台域名配置

1. 登录 LeanCloud 控制台
2. 进入应用 → **云引擎** → **设置**
3. 查看 **云引擎域名** 或 **自定义域名** 部分
4. 确认域名 `qfy2efad.cn-n1-cname-1.leanapp.cn` 是否已绑定

### 步骤 3：尝试通过应用 ID 访问

```bash
# 使用应用 ID 访问（替换为你的实际 App ID）
curl https://qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz.api.lncld.net/
```

注意：这种方式可能只支持根路径，不支持 `/health` 等自定义路径。

### 步骤 4：重新绑定域名（如果需要）

如果域名未绑定或绑定错误：

1. 控制台 → **云引擎** → **设置**
2. 找到域名绑定部分
3. 添加或修改域名绑定
4. 等待生效后重试

---

## 其他常见问题

### 问题：404 Not Found

**原因**：路径不存在或路由配置错误

**解决**：
1. 先测试根路径 `/` 是否能访问
2. 检查 `app.js` 中的路由配置
3. 确认路径拼写正确（注意大小写）

### 问题：500 Internal Server Error

**原因**：服务器内部错误

**解决**：
1. 查看云引擎日志：`lean logs`
2. 检查代码是否有语法错误
3. 检查环境变量是否配置正确

### 问题：连接超时

**原因**：网络问题或服务未启动

**解决**：
1. 检查实例是否正常运行
2. 查看日志确认服务是否启动成功
3. 等待几分钟后重试

---

## 验证部署成功的标志

部署成功后，你应该能看到：

1. **根路径 `/` 返回页面**
   ```bash
   curl http://qfy2efad.cn-n1-cname-1.leanapp.cn/
   ```
   应该返回 HTML 内容

2. **健康检查接口 `/health` 返回 JSON**
   ```bash
   curl http://qfy2efad.cn-n1-cname-1.leanapp.cn/health
   ```
   应该返回：
   ```json
   {
     "status": "ok",
     "message": "服务运行正常",
     "timestamp": "...",
     "environment": "production"
   }
   ```

3. **日志显示服务运行**
   ```
   Node app is running on port: 3000
   ```

---

## 需要帮助？

如果以上方法都无法解决问题：

1. **查看详细日志**
   ```bash
   lean logs --limit 100
   ```

2. **检查 LeanCloud 文档**
   - https://docs.leancloud.cn/sdk/engine/deploy/getting-started/

3. **联系 LeanCloud 技术支持**
   - 在控制台提交工单
   - 或查看社区论坛

