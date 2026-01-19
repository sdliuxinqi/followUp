// pages/patient/supplement/supplement.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      admissionNumber: '',
      teamName: '',
      doctorId: '',
      surgeryDate: '',
      admissionDate: '',
      dischargeDate: ''
    },
    currentDate: '', // 当前日期，用于日期选择器的最大值
    loading: false,
    showDoctorModal: false,
    doctorList: [],
    planId: null, // 从扫码绑定传入的计划ID
    commitmentId: null, // 绑定记录ID
    fromBinding: false // 是否来自绑定流程
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从参数中获取 planId、commitmentId 和 fromBinding
    const planId = options.planId || null
    const commitmentId = options.commitmentId || null
    const fromBinding = options.fromBinding === 'true'
    
    this.setData({
      planId: planId,
      commitmentId: commitmentId,
      fromBinding: fromBinding
    })

    // 如果有 commitmentId，加载已有的绑定信息
    if (commitmentId) {
      this.loadCommitmentInfo(commitmentId)
    } else if (planId) {
      // 如果没有 commitmentId 但有 planId，尝试获取绑定记录
      this.loadCommitmentInfoByPlanId(planId)
    }

    // 设置当前日期作为最大可选日期
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    this.setData({
      currentDate: `${year}-${month}-${day}`
    })

    // 加载治疗组（团队负责人医生）列表
    this.loadDoctorTeams()
  },

  /**
   * 通过 commitmentId 加载绑定记录信息
   */
  loadCommitmentInfo(commitmentId) {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      return
    }

    wx.request({
      url: `${API_BASE}/v1/patient/commitments/${commitmentId}/info`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const data = res.data.data
          this.setData({
            'formData.admissionNumber': data.admissionNumber || '',
            'formData.teamName': data.teamName || '',
            'formData.doctorId': data.doctorId || '',
            'formData.surgeryDate': data.surgeryDate || '',
            'formData.admissionDate': data.admissionDate || '',
            'formData.dischargeDate': data.dischargeDate || '',
            planId: data.planId
          })
        }
      },
      fail: (err) => {
        console.error('加载绑定记录信息失败:', err)
      }
    })
  },

  /**
   * 通过 planId 加载绑定记录信息
   */
  loadCommitmentInfoByPlanId(planId) {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      return
    }

    wx.request({
      url: `${API_BASE}/v1/patient/commitments/${planId}/info`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const data = res.data.data
          this.setData({
            'formData.admissionNumber': data.admissionNumber || '',
            'formData.teamName': data.teamName || '',
            'formData.doctorId': data.doctorId || '',
            'formData.surgeryDate': data.surgeryDate || '',
            'formData.admissionDate': data.admissionDate || '',
            'formData.dischargeDate': data.dischargeDate || '',
            commitmentId: data.commitmentId
          })
        }
      },
      fail: (err) => {
        console.error('加载绑定记录信息失败:', err)
      }
    })
  },

  /**
   * 加载治疗组列表（团队负责人医生）
   */
  loadDoctorTeams() {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    wx.request({
      url: `${API_BASE}/v1/patient/teams`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data && res.data.success) {
          const list = res.data.data || []
          this.setData({
            doctorList: list
          })
        } else {
          console.error('加载治疗组失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '加载治疗组失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载治疗组请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 显示医生列表弹窗
   */
  showDoctorList() {
    this.setData({
      showDoctorModal: true
    })
  },

  /**
   * 隐藏医生列表弹窗
   */
  hideDoctorList() {
    this.setData({
      showDoctorModal: false
    })
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭
  },

  /**
   * 选择医生团队
   */
  selectDoctor(e) {
    const doctor = e.currentTarget.dataset.doctor
    this.setData({
      'formData.doctorId': doctor.id,
      'formData.teamName': doctor.teamName,
      showDoctorModal: false
    })
    wx.showToast({
      title: '选择成功',
      icon: 'success',
      duration: 1000
    })
  },

  /**
   * 选择日期
   */
  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    const date = e.detail.value
    this.setData({
      [`formData.${field}`]: date
    })
  },

  /**
   * 提交补充信息
   */
  submitSupplement(e) {
    const formData = e.detail.value

    // 表单验证
    if (!formData.admissionNumber || !formData.admissionNumber.trim()) {
      wx.showToast({ title: '请输入住院号', icon: 'none' })
      return
    }

    if (!this.data.formData.doctorId) {
      wx.showToast({ title: '请选择治疗组', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      this.setData({ loading: false })
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      })
      return
    }

    // 如果没有 commitmentId，需要先获取
    if (!this.data.commitmentId && this.data.planId) {
      // 先获取绑定记录ID
      wx.request({
        url: `${API_BASE}/v1/patient/commitments/${this.data.planId}/info`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
            const commitmentId = res.data.data.commitmentId
            this.setData({ commitmentId })
            // 继续提交
            this.updateCommitment(
              commitmentId, 
              formData.admissionNumber.trim(), 
              this.data.formData.teamName, 
              this.data.formData.doctorId,
              this.data.formData.surgeryDate,
              this.data.formData.admissionDate,
              this.data.formData.dischargeDate
            )
          } else {
            this.setData({ loading: false })
            wx.showToast({
              title: '未找到绑定记录',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          this.setData({ loading: false })
          console.error('获取绑定记录失败:', err)
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          })
        }
      })
      return
    }

    // 有 commitmentId，直接更新
    if (this.data.commitmentId) {
      this.updateCommitment(
        this.data.commitmentId, 
        formData.admissionNumber.trim(), 
        this.data.formData.teamName, 
        this.data.formData.doctorId,
        this.data.formData.surgeryDate,
        this.data.formData.admissionDate,
        this.data.formData.dischargeDate
      )
    } else {
      this.setData({ loading: false })
      wx.showToast({
        title: '缺少必要信息',
        icon: 'none'
      })
    }
  },

  /**
   * 更新绑定记录
   */
  updateCommitment(commitmentId, admissionNumber, teamName, doctorId, surgeryDate, admissionDate, dischargeDate) {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    wx.request({
      url: `${API_BASE}/v1/patient/commitments/${commitmentId}`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      data: {
        admissionNumber: admissionNumber,
        teamName: teamName,
        doctorId: doctorId,
        surgeryDate: surgeryDate || null,
        admissionDate: admissionDate || null,
        dischargeDate: dischargeDate || null
      },
      success: (res) => {
        this.setData({ loading: false })
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({
            title: '信息补充成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                // 如果来自绑定流程，返回首页并刷新
                if (this.data.fromBinding) {
                  wx.switchTab({
                    url: '/pages/patient/home/home'
                  })
                } else {
                  // 否则返回上一页
                  wx.navigateBack()
                }
              }, 1500)
            }
          })
        } else {
          console.error('更新绑定记录失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '提交失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('更新绑定记录请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  }
})

