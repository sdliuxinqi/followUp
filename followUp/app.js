// app.js
const AV = require("./libs/av-core-min.js");
const adapters = require("./libs/leancloud-adapters-weapp.js");

AV.setAdapters(adapters);

// LeanCloud 初始化
AV.init({
  appId: 'qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz',
  appKey: 'NfPKhZiV31u5F0FjffGuKyT6',
  serverURL: 'https://api.tka-followup.top'
});

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

    // 开发环境模拟登录（用于测试，生产环境请注释掉）
    const isDevMode = true; // 设置为 true 启用开发模式
    if (isDevMode) {
      console.log('启用开发模式模拟登录');
      this.mockLogin();
      return;
    }

    // 登录
    wx.login({
      success: res => {
        if (res.code) {
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          AV.User.loginWithWeapp().then(user => {
            console.log('登录成功', user);
            this.globalData.user = user;
          }).catch(error => {
            console.error('微信登录失败:', error);
            // 提取更详细的错误信息
            let errorMsg = '登录失败，请稍后重试';
            if (error.code === 107) {
              errorMsg = '网络连接失败，请检查网络设置';
            }
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            });
          });
        } else {
          console.error('获取微信登录凭证失败:', res);
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

  // 模拟登录功能（开发环境使用）
  mockLogin() {
    // 创建模拟用户数据
    const mockUser = {
      id: 'mock-user-id',
      attributes: {
        username: 'testuser',
        role: 'patient', // 默认角色为患者
        nickname: '测试用户',
        avatarUrl: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      get: function (key) {
        return this.attributes[key];
      },
      set: function (key, value) {
        this.attributes[key] = value;
        return this;
      }
    };

    // 设置全局用户数据
    this.globalData.user = mockUser;
    wx.setStorageSync('user', mockUser);
    console.log('模拟登录成功，用户信息:', mockUser);
    wx.showToast({
      title: '开发模式模拟登录成功',
      icon: 'success',
      duration: 2000
    });
  },

  globalData: {
    user: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null
  }
})