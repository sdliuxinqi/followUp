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
    saving: false
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    this.getTabBar()?.setData({
      mode: 'doctor',
      selected: 2
    })
  },

  // 加载医生档案信息
  loadProfile() {
    const isDevMode = true
    const user = getApp().globalData.user

    if (!user) {
      wx.navigateTo({ url: '/pages/index/index' })
      return
    }

    if (isDevMode) {
      const mockProfile = {
        name: '测试医生',
        hospital: '齐鲁医院',
        department: '骨科',
        status: 'approved',
        statusText: '已认证',
        workCardImage: ''
      }
      this.setData({
        profile: mockProfile,
        editForm: {
          name: mockProfile.name,
          hospital: mockProfile.hospital,
          department: mockProfile.department,
          workCardImage: mockProfile.workCardImage
        }
      })
      return
    }

    const query = new AV.Query('DoctorProfile')
    query.equalTo('user', AV.Object.createWithoutData('_User', user.id))
    query.first().then(doc => {
      if (!doc) return
      const status = doc.get('status') || 'pending'
      const statusTextMap = {
        pending: '审核中',
        approved: '已认证',
        rejected: '已驳回'
      }

      const profile = {
        name: doc.get('name'),
        hospital: doc.get('hospital'),
        department: doc.get('department'),
        status,
        statusText: statusTextMap[status] || status,
        workCardImage: doc.get('workCardImage') || ''
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
    }).catch(err => {
      console.error('加载医生信息失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
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