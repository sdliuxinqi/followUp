# 随访小助手小程序

## 项目介绍

随访小助手是一个基于微信小程序开发的智能健康管理平台，主要功能包括患者随访计划管理、健康档案查看等。

## 技术栈

- 微信小程序原生开发
- LeanCloud 云服务

## 配置说明

### 微信小程序配置

- **AppID**: wx1699aff3054e007b

### LeanCloud 配置

- **App ID**: qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz
- **App Key**: NfPKhZiV31u5F0FjffGuKyT6
- **Server URL**: https://server.tka-followup.top

## 登录失败解决方法

### 错误信息：Please set the appid and the secret of weapp at LeanCloud console

这是因为在 LeanCloud 控制台没有配置微信小程序的 AppID 和 AppSecret。解决步骤：

1. 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
2. 进入当前应用（qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz）
3. 点击左侧菜单的 **设置 > 社交登录**
4. 在 **微信小程序** 部分填写以下信息：
   - **微信小程序 AppID**: wx1699aff3054e007b
   - **微信小程序 AppSecret**: [请在微信公众平台获取]
5. 点击 **保存** 按钮

### 找不到微信小程序设置？

如果在 LeanCloud 控制台找不到微信小程序的设置选项：

1. 请确保您使用的是最新版本的 LeanCloud 控制台
2. 检查您的账户是否有足够的权限（需要管理员权限）
3. 如果仍然找不到，请联系 LeanCloud 技术支持寻求帮助
4. 或者尝试使用其他登录方式替代微信一键登录

### 微信公众平台获取 AppSecret

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序后台
3. 点击左侧菜单的 **开发 > 开发管理 > 开发设置**
4. 在 **开发者 ID** 部分查看 AppID 和生成 AppSecret

## 注意事项

1. 微信小程序上线前，需要在微信公众平台的 **开发设置** 中添加后端 API 的域名到 **request 合法域名**：
   - https://server.tka-followup.top

2. 开发环境可以在微信小程序开发工具中关闭 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书** 选项，方便开发测试。

## 项目结构

```
├── app.js              # 小程序入口文件
├── app.json            # 小程序全局配置
├── app.wxss            # 小程序全局样式
├── pages/              # 小程序页面
│   ├── index/          # 登录页面
│   ├── doctor/         # 医生端页面
│   ├── patient/        # 患者端页面
│   ├── privacy/        # 隐私政策页面
│   └── agreement/      # 用户协议页面
├── cloud/              # 云函数
├── libs/               # 第三方库
├── assets/             # 静态资源
└── utils/              # 工具函数
```
