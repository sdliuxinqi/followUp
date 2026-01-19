// pages/doctor/auth/auth.js
const AV = require('../../../libs/av-core-min.js');

const API_BASE = getApp().globalData.apiBase || 'https://server.tka-followup.top';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      name: '',
      hospital: '',
      department: '',
      workCardImage: ''
    },
    loading: false,
    departmentList: ['关节外科', '脊柱外科', '手足外科', '骨肿瘤科', '创伤外科'],
    showDepartmentPicker: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    const user = getApp().globalData.user;
    if (!user) {
      wx.navigateTo({ url: '/pages/index/index' });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) {
      tabBar.setData({
        mode: 'doctor'
      })
    }
    // 加载科室列表（仅在显示时刷新一次）
    this.loadDepartments()
  },

  /**
   * 选择工作证图片（带压缩）
   */
  chooseWorkCardImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 使用微信自带的压缩，更稳定
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0];
        console.log('选择图片成功，路径:', tempFilePath);
        
        // 先显示图片，确保回显
        // 直接使用 tempFilePath，微信小程序会自动处理路径
        console.log('设置图片路径:', tempFilePath);
        
        // 强制更新视图
        this.setData({
          'formData.workCardImage': tempFilePath
        }, () => {
          console.log('图片路径已更新，当前值:', this.data.formData.workCardImage);
          console.log('formData 完整数据:', this.data.formData);
          
          // 验证视图是否更新
          setTimeout(() => {
            const query = wx.createSelectorQuery().in(this);
            query.select('.image-preview').boundingClientRect((rect) => {
              if (rect) {
                console.log('图片预览区域已显示，尺寸:', rect);
              } else {
                console.warn('图片预览区域未找到，可能条件判断有问题');
              }
            }).exec();
          }, 100);
          
          // 尝试进一步压缩（可选，如果基础库支持）
          // 检查 wx.compressImage 是否存在
          if (wx.compressImage && typeof wx.compressImage === 'function') {
            wx.compressImage({
              src: tempFilePath,
              quality: 80, // 压缩质量 0-100
              success: compressRes => {
                const compressedPath = compressRes.tempFilePath;
                console.log('图片压缩成功，压缩后路径:', compressedPath);
                
                // 更新为压缩后的图片
                this.setData({
                  'formData.workCardImage': compressedPath
                }, () => {
                  console.log('压缩后图片路径已更新，当前值:', this.data.formData.workCardImage);
                  console.log('压缩后 formData 完整数据:', this.data.formData);
                });
                
                // 显示压缩信息
                wx.getFileInfo({
                  filePath: tempFilePath,
                  success: originalInfo => {
                    wx.getFileInfo({
                      filePath: compressedPath,
                      success: compressedInfo => {
                        const originalSize = (originalInfo.size / 1024).toFixed(2);
                        const compressedSize = (compressedInfo.size / 1024).toFixed(2);
                        const ratio = ((1 - compressedInfo.size / originalInfo.size) * 100).toFixed(1);
                        console.log(`图片压缩: ${originalSize}KB -> ${compressedSize}KB (压缩 ${ratio}%)`);
                      },
                      fail: err => {
                        console.warn('获取压缩图片信息失败:', err);
                      }
                    });
                  },
                  fail: err => {
                    console.warn('获取原图信息失败:', err);
                  }
                });
              },
              fail: compressErr => {
                console.warn('图片压缩失败，使用原图:', compressErr);
                // 压缩失败时继续使用已设置的原图（已经回显了）
              }
            });
          } else {
            console.log('wx.compressImage 不支持，使用微信自带的压缩图片');
          }
        });
      },
      fail: err => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 删除工作证图片
   */
  deleteWorkCardImage() {
    this.setData({
      'formData.workCardImage': ''
    });
  },

  /**
   * 显示科室选择弹窗
   */
  showDepartmentPicker() {
    this.setData({
      showDepartmentPicker: true
    });
  },

  /**
   * 隐藏科室选择弹窗
   */
  hideDepartmentPicker() {
    this.setData({
      showDepartmentPicker: false
    });
  },

  /**
   * 选择科室
   */
  selectDepartment(e) {
    const department = e.currentTarget.dataset.department;
    this.setData({
      'formData.department': department,
      showDepartmentPicker: false
    });
  },

  /**
   * 加载科室列表
   */
  loadDepartments() {
    const sessionToken =
      getApp().globalData.sessionToken || wx.getStorageSync('sessionToken')

    wx.request({
      url: `${API_BASE}/v1/meta/departments`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        // 可选：如果你的接口不要求登录，此处可不带 Session
        ...(sessionToken ? { 'X-Session-Token': sessionToken } : {})
      },
      success: res => {
        if (res.data && res.data.success) {
          const list = res.data.data || []
          // 仅取名称显示
          this.setData({
            departmentList: list.map(item => item.name)
          })
        }
      },
      fail: err => {
        console.error('加载科室失败', err)
      }
    })
  },

  /**
   * 提交认证
   */
  submitAuth(e) {
    const isDevMode = false; // 生产环境请设为 false
    const formData = e.detail.value;
    const workCardImage = this.data.formData.workCardImage;

    // 校验
    if (!formData.name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!formData.hospital) {
      wx.showToast({ title: '请输入医院', icon: 'none' });
      return;
    }
    if (!formData.department) {
      wx.showToast({ title: '请选择科室', icon: 'none' });
      return;
    }
    if (!workCardImage) {
      wx.showToast({ title: '请上传工作证图片', icon: 'none' });
      return;
    }

    // 开发模式直接模拟
    if (isDevMode) {
      this.setData({ loading: true });
      setTimeout(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '认证提交成功（开发模式）',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(() => {
              wx.switchTab({ url: '/pages/doctor/home/home' });
            }, 1000);
          }
        });
      }, 300);
      return;
    }

    // 上传图片到后端（使用 base64，已压缩）
    const uploadImage = () => {
      console.log('开始上传图片，路径:', workCardImage);
      
      // 显示上传进度
      wx.showLoading({
        title: '上传图片中...',
        mask: true
      });
      
      // 将图片转为 base64
      return new Promise((resolve, reject) => {
        // 先检查图片大小
        wx.getFileInfo({
          filePath: workCardImage,
          success: (fileInfo) => {
            const fileSizeKB = (fileInfo.size / 1024).toFixed(2);
            console.log('图片文件大小:', fileSizeKB, 'KB');
            
            // base64 编码后大小会增加约 33%，检查是否超过 8MB（留一些余量）
            const estimatedBase64Size = fileInfo.size * 1.33;
            if (estimatedBase64Size > 8 * 1024 * 1024) {
              wx.hideLoading();
              wx.showModal({
                title: '图片过大',
                content: `图片大小 ${fileSizeKB}KB，base64 编码后可能超过限制。请选择更小的图片或重新压缩。`,
                showCancel: false,
                confirmText: '知道了'
              });
              reject(new Error('图片过大'));
              return;
            }
            
            // 读取文件为 base64
            wx.getFileSystemManager().readFile({
              filePath: workCardImage,
              encoding: 'base64',
              success: (readRes) => {
                const base64 = `data:image/jpeg;base64,${readRes.data}`;
                
                // 计算 base64 大小（用于日志）
                const base64Size = (base64.length / 1024).toFixed(2);
                console.log('图片转为 base64 成功，base64 大小:', base64Size, 'KB');
                
                // 调用后端接口上传
                wx.request({
                  url: `${API_BASE}/v1/auth/upload-image-base64`,
                  method: 'POST',
                  header: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken
                  },
                  data: {
                    base64: base64,
                    fileName: `workcard_${Date.now()}.jpg`,
                    quality: 80 // 压缩质量（后端可能会使用）
                  },
                  success: (uploadRes) => {
                    wx.hideLoading();
                    console.log('上传响应:', uploadRes);
                    
                    // 检查响应状态码
                    if (uploadRes.statusCode !== 200) {
                      let errorMsg = `上传失败，状态码: ${uploadRes.statusCode}`;
                      if (uploadRes.statusCode === 413) {
                        errorMsg = '图片过大，请选择更小的图片或重新压缩';
                      }
                      console.error('图片上传失败:', errorMsg);
                      wx.showToast({
                        title: errorMsg,
                        icon: 'none',
                        duration: 3000
                      });
                      reject(new Error(errorMsg));
                      return;
                    }
                    
                    if (uploadRes.data && uploadRes.data.success) {
                      const imageUrl = uploadRes.data.data.url;
                      const fileSize = uploadRes.data.data.size;
                      const originalSize = uploadRes.data.data.originalSize || fileSize;
                      
                      console.log('图片上传成功:', {
                        url: imageUrl,
                        size: `${(fileSize / 1024).toFixed(2)}KB`,
                        originalSize: `${(originalSize / 1024).toFixed(2)}KB`
                      });
                      
                      // 返回类似 AV.File 的对象，保持兼容性
                      resolve({ 
                        url: () => imageUrl 
                      });
                    } else {
                      const errorMsg = uploadRes.data?.message || uploadRes.data?.error || '图片上传失败';
                      console.error('图片上传失败:', errorMsg, uploadRes.data);
                      wx.showToast({
                        title: errorMsg,
                        icon: 'none',
                        duration: 3000
                      });
                      reject(new Error(errorMsg));
                    }
                  },
                  fail: (err) => {
                    wx.hideLoading();
                    console.error('图片上传请求失败:', err);
                    let errorMsg = '图片上传失败，请重试';
                    if (err.errMsg) {
                      if (err.errMsg.includes('time out') || err.errMsg.includes('timeout')) {
                        errorMsg = '上传超时，请检查网络';
                      } else if (err.errMsg.includes('fail')) {
                        errorMsg = '网络请求失败，请检查网络连接';
                      } else {
                        errorMsg = `上传失败: ${err.errMsg}`;
                      }
                    }
                    wx.showToast({
                      title: errorMsg,
                      icon: 'none',
                      duration: 3000
                    });
                    reject(err);
                  }
                });
              },
              fail: (readErr) => {
                wx.hideLoading();
                console.error('读取图片失败:', readErr);
                wx.showToast({
                  title: '读取图片失败',
                  icon: 'none',
                  duration: 2000
                });
                reject(readErr);
              }
            });
          },
          fail: (fileInfoErr) => {
            console.warn('获取图片信息失败，直接尝试读取:', fileInfoErr);
            // 即使获取文件信息失败，也尝试读取文件
            wx.getFileSystemManager().readFile({
              filePath: workCardImage,
              encoding: 'base64',
              success: (readRes) => {
                const base64 = `data:image/jpeg;base64,${readRes.data}`;
                const base64Size = (base64.length / 1024).toFixed(2);
                console.log('图片转为 base64 成功，base64 大小:', base64Size, 'KB');
                
                // 如果 base64 大小超过 8MB，提示用户
                if (base64.length > 8 * 1024 * 1024) {
                  wx.hideLoading();
                  wx.showModal({
                    title: '图片过大',
                    content: `图片 base64 编码后大小为 ${base64Size}KB，超过限制。请选择更小的图片。`,
                    showCancel: false,
                    confirmText: '知道了'
                  });
                  reject(new Error('图片过大'));
                  return;
                }
                
                // 继续上传（这里需要重复上传逻辑，但为了简化，我们直接调用）
                // 实际上应该提取为函数，但为了快速修复，先这样处理
                wx.request({
                  url: `${API_BASE}/v1/auth/upload-image-base64`,
                  method: 'POST',
                  header: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken
                  },
                  data: {
                    base64: base64,
                    fileName: `workcard_${Date.now()}.jpg`,
                    quality: 80
                  },
                  success: (uploadRes) => {
                    wx.hideLoading();
                    if (uploadRes.statusCode === 200 && uploadRes.data && uploadRes.data.success) {
                      resolve({ url: () => uploadRes.data.data.url });
                    } else {
                      const errorMsg = uploadRes.data?.message || '图片上传失败';
                      wx.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
                      reject(new Error(errorMsg));
                    }
                  },
                  fail: (err) => {
                    wx.hideLoading();
                    wx.showToast({ title: '上传失败，请重试', icon: 'none', duration: 2000 });
                    reject(err);
                  }
                });
              },
              fail: (readErr) => {
                wx.hideLoading();
                console.error('读取图片失败:', readErr);
                wx.showToast({
                  title: '读取图片失败',
                  icon: 'none',
                  duration: 2000
                });
                reject(readErr);
              }
            });
          }
        });
      });
    };

    const sessionToken =
      getApp().globalData.sessionToken || wx.getStorageSync('sessionToken');

    this.setData({ loading: true });

    uploadImage()
      .then(file => {
        const imageUrl = file.url();
        console.log('准备提交认证，图片URL:', imageUrl);
        
        const payload = {
          name: formData.name,
          hospital: formData.hospital,
          department: formData.department,
          workCardImage: imageUrl  // 后端接口接收 workCardImage，保存为 workCertUrl
        };
        
        console.log('提交认证数据:', payload);

        return new Promise((resolve, reject) => {
          wx.request({
            url: `${API_BASE}/v1/auth/register-doctor`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken
            },
            data: payload,
            success: res => {
              console.log('认证提交响应:', res.data);
              if (res.data && res.data.success) {
                resolve(res.data.data || {});
              } else {
                reject(res.data || { message: '提交认证失败' });
              }
            },
            fail: err => {
              console.error('认证请求失败:', err);
              reject(err);
            }
          });
        });
      })
      .then(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '认证提交成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              wx.switchTab({ url: '/pages/doctor/home/home' });
            }, 1500);
          }
        });
      })
      .catch(err => {
        console.error('提交认证失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: err?.message || '提交认证失败',
          icon: 'none'
        });
      });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})