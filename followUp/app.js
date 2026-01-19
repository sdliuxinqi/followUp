// app.js
const AV = require("./libs/av-core-min.js");
const adapters = require("./libs/leancloud-adapters-weapp.js");

AV.setAdapters(adapters);

// LeanCloud 初始化
AV.init({
  appId: 'qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz',
  appKey: 'NfPKhZiV31u5F0FjffGuKyT6',
  serverURL: 'https://server.tka-followup.top'
});

// API 基础地址
const API_BASE = 'https://server.tka-followup.top';

App({
  onLaunch() {
    const systemInfo = wx.getSystemInfoSync()
    const menuButton = wx.getMenuButtonBoundingClientRect()

    this.globalData.statusBarHeight = systemInfo.statusBarHeight
    this.globalData.menuButton = menuButton
    this.globalData.navBarHeight =
      menuButton.bottom +
      menuButton.top -
      systemInfo.statusBarHeight

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取状态栏高度并设置全局CSS变量
    const {
      statusBarHeight
    } = wx.getSystemInfoSync()
    wx.getSystemInfo({
      success: res => {
        this.globalData.statusBarHeight = res.statusBarHeight
        // 设置全局CSS变量
        wx.setNavigationBarColor({
          frontColor: '#000000',
          backgroundColor: '#ffffff',
        })
        // 在页面中可以通过 var(--status-bar-height) 获取状态栏高度
      }
    })

    // 微信登录 - 使用自定义后端接口
    wx.login({
      success: res => {
        if (res.code) {
          // 调用自定义后端登录接口
          wx.request({
            url: `${API_BASE}/v1/auth/login-weapp`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              code: res.code
            },
            success: (result) => {
              if (result.data && result.data.success) {
                const { id, sessionToken, openid } = result.data.data;
                
                if (sessionToken) {
                  // 使用自定义 sessionToken（微信官方流程）
                  // 不再使用 LeanCloud SDK，直接存储 token 和用户信息
                  console.log('登录成功', { id, openid });
                  
                  // 保存用户信息和 sessionToken
                  this.globalData.user = { id, openid }; // 简化用户对象
                  this.globalData.sessionToken = sessionToken;
                  this.globalData.userId = id;
                  
                  wx.setStorageSync('userId', id);
                  wx.setStorageSync('sessionToken', sessionToken);
                  wx.setStorageSync('openid', openid);
                  
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success',
                    duration: 2000
                  });
                } else {
                  // 如果没有 sessionToken，说明后端登录失败
                  console.error('后端未返回 sessionToken');
                  wx.showToast({
                    title: '登录失败，请重试',
                    icon: 'none',
                    duration: 3000
                  });
                }
              } else {
                const errorMsg = result.data?.message || '登录失败';
                console.error('登录失败:', errorMsg);
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            });
              }
            },
            fail: err => {
              console.error('登录请求失败:', err);
              let errorMsg = '登录失败，请检查网络';
              
              // 根据错误类型显示不同的提示
              if (err.errMsg && err.errMsg.includes('time out')) {
                errorMsg = '请求超时，请检查：\n1. 是否配置了服务器域名\n2. 服务器是否可访问';
              } else if (err.errMsg && err.errMsg.includes('fail')) {
                errorMsg = '请求失败，请检查：\n1. 微信后台是否配置了域名\n2. 开发工具是否关闭域名校验';
              }
              
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 4000
              });
            }
          });
        } else {
          console.error('获取微信登录凭证失败:', res);
          wx.showToast({
            title: '获取登录凭证失败，请重试',
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: err => {
        console.error('微信登录接口调用失败:', err);
        wx.showToast({
          title: '微信登录失败，请检查网络或重试',
          icon: 'none',
          duration: 3000
        });
      }
    })
  },

  // 处理页面不存在的情况
  onPageNotFound(res) {
    console.error('页面不存在:', res);
    // 重定向到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  globalData: {
    user: null,        // 简化的用户对象 { id, openid }
    userId: null,      // 用户 ID
    sessionToken: null, // 自定义 session_token
    apiBase: API_BASE,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null
  }
})