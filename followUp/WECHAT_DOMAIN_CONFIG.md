# 微信小程序服务器域名配置指南

## 问题：请求超时 `request:fail fail:time out`

这个错误通常是因为微信小程序没有配置服务器域名，导致请求被阻止或超时。

## 解决步骤

### 方法一：开发环境（快速测试）

**在微信开发者工具中关闭域名校验：**

1. 打开微信开发者工具
2. 点击右上角的 **详情**
3. 找到 **本地设置** 标签
4. 勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
5. 重新编译小程序

⚠️ **注意**：这只是开发环境设置，正式版本必须配置正确的域名。

### 方法二：配置服务器域名（生产环境必需）

**在微信公众平台配置服务器域名：**

1. **登录微信公众平台**
   - 访问：https://mp.weixin.qq.com/
   - 使用管理员账号登录

2. **进入小程序后台**
   - 选择你的小程序

3. **进入开发设置**
   - 点击左侧菜单 **开发** → **开发管理** → **开发设置**
   - 或直接访问：https://mp.weixin.qq.com/wxopen/devprofile?action=get_profile&token=&lang=zh_CN

4. **配置服务器域名**
   - 找到 **服务器域名** 部分
   - 点击 **修改** 按钮
   - 在 **request 合法域名** 中添加：
     ```
     https://server.tka-followup.top
     ```
   - 点击 **保存并提交**

5. **等待审核生效**
   - 域名配置需要审核，通常几分钟内生效
   - 审核通过后，小程序的网络请求才能访问该域名

### 方法三：检查服务器是否可访问

**测试服务器是否正常工作：**

1. **在浏览器中测试**
   - 打开浏览器，访问：https://server.tka-followup.top/health
   - 如果返回 `{"status":"ok"}` 说明服务器正常

2. **在开发者工具控制台测试**
   ```javascript
   // 在开发者工具的控制台中执行
   wx.request({
     url: 'https://server.tka-followup.top/health',
     success: (res) => {
       console.log('服务器正常:', res.data)
     },
     fail: (err) => {
       console.error('服务器不可访问:', err)
     }
   })
   ```

## 常见问题

### Q1: 开发环境还是提示域名未配置？

**解决方法：**
1. 确保在 **详情** → **本地设置** 中勾选了 **不校验合法域名**
2. 关闭开发者工具，重新打开
3. 清除缓存：**工具** → **清除缓存** → **清除全部缓存**

### Q2: 配置域名后仍然超时？

**可能原因和解决方法：**

1. **域名未审核通过**
   - 等待几分钟让域名审核生效
   - 检查微信公众平台是否显示"已配置"

2. **服务器不可访问**
   - 检查服务器是否正常运行
   - 检查服务器防火墙是否阻止了请求
   - 检查域名 DNS 解析是否正确

3. **HTTPS 证书问题**
   - 确保服务器使用了有效的 HTTPS 证书
   - 证书必须是受信任的 CA 颁发的

4. **网络问题**
   - 检查网络连接
   - 尝试使用手机热点测试（排除本地网络问题）

### Q3: 如何查看详细的错误信息？

**在代码中添加更详细的日志：**

```javascript
wx.request({
  url: 'https://server.tka-followup.top/v1/auth/login-weapp',
  method: 'POST',
  header: {
    'Content-Type': 'application/json'
  },
  data: {
    code: res.code
  },
  success: (result) => {
    console.log('请求成功:', result)
  },
  fail: (err) => {
    console.error('请求失败详情:', {
      errMsg: err.errMsg,
      errno: err.errno,
      statusCode: err.statusCode
    })
    // 更详细的错误处理
    if (err.errMsg.includes('time out')) {
      wx.showToast({
        title: '请求超时，请检查网络或服务器',
        icon: 'none',
        duration: 3000
      })
    } else if (err.errMsg.includes('fail')) {
      wx.showToast({
        title: '请求失败，请检查域名配置',
        icon: 'none',
        duration: 3000
      })
    }
  }
})
```

## 配置检查清单

- [ ] 开发环境：已在开发者工具中关闭域名校验
- [ ] 生产环境：已在微信公众平台配置 `https://server.tka-followup.top`
- [ ] 域名审核已通过（在微信公众平台查看状态）
- [ ] 服务器可访问（浏览器测试 `/health` 接口）
- [ ] 服务器使用有效的 HTTPS 证书
- [ ] 小程序已重新编译或重新打开

## 快速诊断命令

在微信开发者工具控制台执行以下命令，检查配置：

```javascript
// 检查网络配置
console.log('网络请求配置:', wx.getSystemInfoSync())

// 测试服务器连通性
wx.request({
  url: 'https://server.tka-followup.top/health',
  method: 'GET',
  success: (res) => {
    console.log('✅ 服务器可访问:', res.data)
  },
  fail: (err) => {
    console.error('❌ 服务器不可访问:', err)
  }
})
```

## 相关链接

- [微信小程序官方文档 - 网络请求](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [微信小程序官方文档 - 服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- [微信公众平台](https://mp.weixin.qq.com/)

