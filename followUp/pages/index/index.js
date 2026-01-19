// pages/index/index.js
const AV = require('../../libs/av-core-min.js');

const API_BASE = 'https://server.tka-followup.top';

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

      // 微信登录流程 - 使用自定义后端接口
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
              success: async (result) => {
                if (result.data && result.data.success) {
                  const { id, sessionToken, openid } = result.data.data;
                  
                  if (sessionToken) {
                    // 使用自定义 sessionToken（微信官方流程）
                    // 不再使用 LeanCloud SDK，直接存储 token 和用户信息
                    console.log('登录成功', { id, openid });
                    
                    // 保存用户信息和 sessionToken
                    const user = { id, openid }; // 简化用户对象
                    getApp().globalData.user = user;
                    getApp().globalData.sessionToken = sessionToken;
                    getApp().globalData.userId = id;
                    
                    wx.setStorageSync('userId', id);
                    wx.setStorageSync('sessionToken', sessionToken);
                    wx.setStorageSync('openid', openid);
                    
                    // 微信用户信息补全：nickname / avatar / gender
                    // 通过后端 API 更新用户信息
                    try {
                      await this.registerWeapp(user, sessionToken);
                    } catch (err) {
                      console.error('注册写入失败:', err);
                      // 不影响登录流程，继续
                    }

                    wx.hideLoading();
                    resolve(user);
                  } else {
                    // 如果没有 sessionToken，说明后端登录失败
                    wx.hideLoading();
                    console.error('后端未返回 sessionToken');
                    wx.showToast({
                      title: '登录失败，请重试',
                      icon: 'none',
                      duration: 3000
                    });
                    reject(new Error('未获取到 sessionToken'));
                  }
                } else {
                  wx.hideLoading();
                  const errorMsg = result.data?.message || '登录失败';
                  console.error('登录失败:', errorMsg);
                  wx.showToast({
                    title: errorMsg,
                    icon: 'none',
                    duration: 3000
                  });
                  reject(new Error(errorMsg));
                }
              },
              fail: err => {
                wx.hideLoading();
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
                reject(err);
              }
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

  /**
   * 调用后端 REST：注册/补全微信用户信息
   * 注意：现在使用自定义 session_token，不再使用 LeanCloud SDK
   */
  registerWeapp(user, sessionToken) {
    // 获取微信用户信息（如果需要）
    // 由于不再使用 LeanCloud SDK，这里可以获取微信用户信息或使用默认值
    const nickname = '';
    const avatar = '';
    const gender = '';

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}/v1/auth/register-weapp`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken  // 使用自定义 session_token
        },
        data: { nickname, avatar, gender },
        success: (res) => {
          if (res.data && res.data.success) {
            const data = res.data.data || {};
            // 更新用户信息
            if (data.role) {
              wx.setStorageSync('role', data.role);
            }
            resolve(data);
          } else {
            // 如果失败，不影响登录流程
            console.warn('补全用户信息失败:', res.data);
            resolve({});
          }
        },
        fail: (err) => {
          // 如果失败，不影响登录流程
          console.warn('补全用户信息请求失败:', err);
          resolve({});
        }
      });
    });
  },

  navigateToRole(role) {
    if (role === 'doctor') {
      // 先检查医生是否已注册
      this.checkDoctorExists().then(hasDoctor => {
        if (hasDoctor) {
          // 如果已注册，直接跳转到医生首页（tabBar 页面）
          wx.switchTab({
            url: '/pages/doctor/home/home'
          });
        } else {
          // 如果未注册，跳转到医生认证页面
          wx.navigateTo({
            url: '/pages/doctor/auth/auth'
          });
        }
      }).catch(err => {
        console.error('检查医生状态失败:', err);
        // 出错时默认跳转到注册页面
        wx.navigateTo({
          url: '/pages/doctor/auth/auth'
        });
      });
    } else {
      // 先检查患者是否已登记
      this.checkPatientExists().then(hasPatient => {
        if (hasPatient) {
          // 已登记患者，直接进入患者首页（tabBar 页面）
          wx.switchTab({
            url: '/pages/patient/home/home'
          });
        } else {
          // 未登记患者，进入患者登记页面
          wx.navigateTo({
            url: '/pages/patient/register/register'
          });
        }
      }).catch(err => {
        console.error('检查患者状态失败:', err);
        // 出错时默认跳转到登记页面
        wx.navigateTo({
          url: '/pages/patient/register/register'
        });
      });
    }
  },

  /**
   * 检查医生是否已注册
   * @returns {Promise<boolean>} 返回 true 表示已注册，false 表示未注册
   */
  checkDoctorExists() {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
      
      if (!sessionToken) {
        // 未登录，返回 false
        resolve(false);
        return;
      }

      // 显示加载提示
      wx.showLoading({
        title: '检查中...',
        mask: true
      });

      // 调用后端 API 检查医生状态
      wx.request({
        url: `${API_BASE}/v1/auth/doctor-profile`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        success: (res) => {
          // 隐藏加载提示
          wx.hideLoading();
          
          if (res.statusCode === 200 && res.data && res.data.success) {
            // 如果返回了医生档案数据，说明已注册
            const hasDoctor = res.data.data !== null && res.data.data !== undefined;
            console.log('医生状态检查:', hasDoctor ? '已注册' : '未注册');
            resolve(hasDoctor);
          } else {
            // API 返回失败，视为未注册
            console.warn('检查医生状态失败:', res.data?.message || '未知错误');
            resolve(false);
          }
        },
        fail: (err) => {
          // 隐藏加载提示
          wx.hideLoading();
          
          console.error('检查医生状态请求失败:', err);
          // 网络错误，视为未注册
          resolve(false);
        }
      });
    });
  },

  /**
   * 检查患者是否已登记
   * @returns {Promise<boolean>} 返回 true 表示已登记，false 表示未登记
   */
  checkPatientExists() {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken');
      
      if (!sessionToken) {
        // 未登录，视为未登记
        resolve(false);
        return;
      }

      wx.showLoading({
        title: '检查中...',
        mask: true
      });

      wx.request({
        url: `${API_BASE}/v1/patient/profile`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'X-LC-Session': sessionToken
        },
        success: (res) => {
          wx.hideLoading();

          if (res.statusCode === 200 && res.data && res.data.success) {
            // 有患者资料即视为已登记
            const profile = res.data.data;
            const hasPatient = profile !== null && profile !== undefined;
            if (hasPatient) {
              console.log('首页 checkPatientExists 拿到的患者资料:', profile);
              console.log('首页 checkPatientExists 中的 gender 字段:', profile.gender);
              // 把患者资料缓存到全局和本地，后续页面可直接使用（包括 gender）
              app.globalData.patientProfile = profile;
              try {
                wx.setStorageSync('patientProfile', profile);
              } catch (e) {
                console.warn('本地缓存 patientProfile 失败:', e);
              }
            }
            console.log('患者状态检查:', hasPatient ? '已登记' : '未登记');
            resolve(hasPatient);
          } else {
            console.warn('检查患者状态失败:', res.data?.message || '未知错误');
            resolve(false);
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('检查患者状态请求失败:', err);
          resolve(false);
        }
      });
    });
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
