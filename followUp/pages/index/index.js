// pages/index/index.js
const AV = require('../../libs/av-core-min.js');

Page({
  onLoad() {
    // 检查是否已登录
    this.checkLogin();
  },

  checkLogin() {
    const user = getApp().globalData.user;
    if (user) {
      console.log('已登录用户:', user);
    } else {
      console.log('未登录');
    }
  },

  chooseDoctor() {
    this.handleRoleSelection('doctor');
  },

  choosePatient() {
    this.handleRoleSelection('patient');
  },

  handleRoleSelection(role) {
    const app = getApp();
    
    // 检查是否已登录
    if (!app.globalData.user) {
      // 执行微信一键登录
      this.login().then(() => {
        this.navigateToRole(role);
      }).catch(error => {
        console.error('登录失败:', error);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      });
    } else {
      this.navigateToRole(role);
    }
  },

  login() {
    return new Promise((resolve, reject) => {
      wx.showLoading({
        title: '登录中...',
      });

      // 开发环境模拟登录（用于测试，生产环境请注释掉）
      const isDevMode = true; // 设置为 true 启用开发模式
      if (isDevMode) {
        wx.hideLoading();
        // 调用 app.js 中的模拟登录方法
        getApp().mockLogin();
        const user = getApp().globalData.user;
        resolve(user);
        return;
      }

      // 正式环境登录流程
      // 先调用 wx.login 获取 code
      wx.login({
        success: res => {
          if (res.code) {
            // 使用 code 进行登录
            AV.User.loginWithWeapp().then(user => {
              getApp().globalData.user = user;
              wx.setStorageSync('user', user);
              wx.hideLoading();
              resolve(user);
            }).catch(error => {
              wx.hideLoading();
              console.error('LeanCloud 登录失败:', error);
              // 提取更详细的错误信息
              let errorMsg = '登录失败，请稍后重试';
              if (error.code === 211) {
                errorMsg = '该微信账号未绑定医生或患者身份';
              } else if (error.code === 210) {
                errorMsg = '用户名或密码错误';
              } else if (error.code === 107) {
                errorMsg = '网络连接失败，请检查网络设置';
              } else if (error.message && error.message.indexOf('Please set the appid and the secret of weapp') >= 0) {
                errorMsg = '微信小程序配置未完成，请联系管理员';
              }
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 3000
              });
              reject(error);
            });
          } else {
            wx.hideLoading();
            console.error('获取微信登录凭证失败:', res);
            wx.showToast({
              title: '获取登录凭证失败，请重试',
              icon: 'none',
              duration: 3000
            });
            reject(new Error('获取微信登录凭证失败'));
          }
        },
        fail: err => {
          wx.hideLoading();
          console.error('微信登录接口调用失败:', err);
          wx.showToast({
            title: '微信登录失败，请检查网络或重试',
            icon: 'none',
            duration: 3000
          });
          reject(err);
        }
      });
    });
  },

  navigateToRole(role) {
    if (role === 'doctor') {
      // 跳转到医生认证页面
      wx.navigateTo({
        url: '/pages/doctor/auth/auth'
      });
    } else {
      // 跳转到患者登记页面
      wx.navigateTo({
        url: '/pages/patient/register/register'
      });
    }
  },

  // 跳转到用户协议页面
  navigateToAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 跳转到隐私政策页面
  navigateToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
});
