// pages/patient/profile/profile.js
const app = getApp()

Page({
  data: {
    formData: {
      name: '',
      gender: '', // 'male' 或 'female'
      birthDate: '',
      height: ''
    },
    loading: false,
    currentDate: ''
  },

  onLoad() {
    // 获取当前日期（用于日期选择器的最大值）
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    this.setData({
      currentDate: `${year}-${month}-${day}`
    })

    // 加载当前患者信息
    this.loadPatientInfo()
  },

  // 加载患者信息
  loadPatientInfo() {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    if (!sessionToken) {
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/patient/home/home'
        })
      }, 1500)
      return
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    wx.request({
      url: `${app.globalData.apiBase}/v1/patient/profile`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const profile = res.data.data
          // 将性别从后端格式转换为前端显示格式
          let gender = ''
          if (profile.gender === 'male' || profile.gender === '男') {
            gender = 'male'
          } else if (profile.gender === 'female' || profile.gender === '女') {
            gender = 'female'
          }
          
          this.setData({
            formData: {
              name: profile.name || '',
              gender: gender,
              birthDate: profile.birthDate || '',
              height: profile.height || ''
            }
          })
        } else {
          wx.showToast({
            title: '加载个人信息失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载个人信息失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      'formData.gender': gender
    })
  },

  // 选择出生日期
  onDateChange(e) {
    this.setData({
      'formData.birthDate': e.detail.value
    })
  },

  // 输入身高
  onHeightInput(e) {
    this.setData({
      'formData.height': e.detail.value
    })
  },

  // 提交修改
  submitProfile(e) {
    const { formData } = this.data

    // 验证必填项
    if (!formData.name || !formData.name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    if (!formData.gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      })
      return
    }

    if (!formData.birthDate) {
      wx.showToast({
        title: '请选择出生日期',
        icon: 'none'
      })
      return
    }

    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    if (!sessionToken) {
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    wx.request({
      url: `${app.globalData.apiBase}/v1/patient/profile`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      data: {
        name: formData.name.trim(),
        gender: formData.gender,
        birthDate: formData.birthDate,
        height: formData.height || ''
      },
      success: (res) => {
        this.setData({ loading: false })
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({
            title: '修改成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        } else {
          wx.showToast({
            title: res.data?.message || '修改失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('修改个人信息失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  }
})

