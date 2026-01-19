// pages/doctor/mine/mine.js
const AV = require('../../../libs/av-core-min.js')

Page({
  data: {
    profile: {
      name: '',
      hospital: '',
      department: '',
      status: '',
      statusText: ''
    },
    editForm: {
      name: '',
      hospital: '',
      department: '',
      workCardImage: ''
    },
    saving: false,
    loading: false
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    this.getTabBar()?.setData({
      mode: 'doctor',
      selected: 2
    })
    // 每次显示时重新加载，确保数据最新
    this.loadProfile()
  },

  // 加载医生档案信息
  loadProfile() {
    const app = getApp()
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'
    
    if (!sessionToken) {
      console.warn('未登录，跳转到首页')
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }

    // 显示加载提示
    this.setData({ loading: true })
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    // 调用后端 API 获取医生信息
    wx.request({
      url: `${API_BASE}/v1/auth/doctor-profile`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      },
      success: (res) => {
        wx.hideLoading()
        this.setData({ loading: false })
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          const data = res.data.data
          
          if (!data) {
            // 没有医生档案，跳转到认证页面
            console.log('未找到医生档案，跳转到认证页面')
            wx.showToast({
              title: '请先完成认证',
              icon: 'none',
              duration: 2000
            })
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/doctor/auth/auth'
              })
            }, 2000)
            return
          }

          // 状态映射
          const status = data.isApproved ? 'approved' : 'pending'
          const statusTextMap = {
            pending: '审核中',
            approved: '已认证',
            rejected: '已驳回'
          }

          const profile = {
            name: (data.name && typeof data.name === 'string') ? data.name : '',
            hospital: (data.hospital && typeof data.hospital === 'string') ? data.hospital : '',
            department: (data.department && typeof data.department === 'string') ? data.department : '',
            status,
            statusText: statusTextMap[status] || '未知',
            workCardImage: (data.workCertUrl && typeof data.workCertUrl === 'string') ? data.workCertUrl : ''
          }

          this.setData({
            profile,
            editForm: {
              name: profile.name,
              hospital: profile.hospital,
              department: profile.department,
              workCardImage: profile.workCardImage
            }
          })
        } else {
          console.error('加载医生信息失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ loading: false })
        console.error('加载医生信息请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  onNameChange(e) {
    this.setData({
      'editForm.name': e.detail.value
    })
  },

  onHospitalChange(e) {
    this.setData({
      'editForm.hospital': e.detail.value
    })
  },

  onDepartmentChange(e) {
    this.setData({
      'editForm.department': e.detail.value
    })
  },

  chooseWorkCardImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.setData({
          'editForm.workCardImage': res.tempFilePaths[0]
        })
      }
    })
  },

  previewImage() {
    const { workCardImage } = this.data.editForm
    if (!workCardImage) return
    wx.previewImage({
      urls: [workCardImage]
    })
  },

  removeWorkCardImage() {
    this.setData({
      'editForm.workCardImage': ''
    })
  },

  // 保存修改（主要用于修改姓名、医院、科室、工作证）
  saveProfile() {
    if (this.data.saving) return // 防止重复提交
    
    const { name, hospital, department } = this.data.editForm
    const user = getApp().globalData.user

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!hospital || !hospital.trim()) {
      wx.showToast({ title: '请输入医院', icon: 'none' })
      return
    }
    if (!department || !department.trim()) {
      wx.showToast({ title: '请输入科室', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    const isDevMode = true
    if (isDevMode) {
      // 开发模式只做前端状态更新
      this.setData({
        'profile.name': name,
        'profile.hospital': hospital,
        'profile.department': department,
        saving: false
      })
      wx.showToast({ title: '已保存（本地）', icon: 'success' })
      return
    }

    const query = new AV.Query('DoctorProfile')
    query.equalTo('user', AV.Object.createWithoutData('_User', user.id))
    query.first().then(doc => {
      if (!doc) throw new Error('未找到医生档案')
      doc.set('name', name)
      doc.set('hospital', hospital)
      doc.set('department', department)
      // 工作证图片的真正上传逻辑这里略过，按需补充
      return doc.save()
    }).then(() => {
      this.setData({ saving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.loadProfile()
    }).catch(err => {
      console.error('保存失败', err)
      this.setData({ saving: false })
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})