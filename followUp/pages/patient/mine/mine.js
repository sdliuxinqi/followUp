// pages/patient/mine/mine.js
const app = getApp()

Page({
  data: {
    nickname: '',
    boundPlans: [], // 已绑定的随访计划列表
    loading: true
  },

  onShow() {
    this.getTabBar()?.setData({
      mode: 'patient',
      selected: 1
    })

    // 这里可以根据实际登录用户信息设置昵称，暂时使用本地存储/占位
    const nickname = wx.getStorageSync('patientNickname') || ''
    this.setData({ nickname })
    
    // 加载已绑定的随访计划列表
    this.loadBoundPlans()
  },

  // 加载已绑定的随访计划列表
  loadBoundPlans() {
    this.setData({ loading: true })
    
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    
    if (!sessionToken) {
      console.warn('患者我的页面：缺少 sessionToken，无法获取已绑定计划')
      this.setData({ loading: false, boundPlans: [] })
      return
    }

    // 直接查询所有 commitments，然后过滤出当前计划
    wx.request({
      url: `${app.globalData.apiBase}/v1/patient/commitments/all`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        if (!res.data || !res.data.success) {
          console.error('获取已绑定计划失败:', res.data)
          this.setData({ loading: false, boundPlans: [] })
          return
        }

        const commitments = res.data.data || []
        
        // 只保留当前计划（isCurrent === true）
        const currentCommitments = commitments.filter(item => item.isCurrent === true)
        
        if (currentCommitments.length === 0) {
          this.setData({ loading: false, boundPlans: [] })
          return
        }
        
        // 从当前计划的 commitments 中提取唯一的计划信息
        const planMap = new Map()
        
        currentCommitments.forEach(item => {
          const planId = item.planId
          if (planId && !planMap.has(planId)) {
            planMap.set(planId, {
              planId: planId,
              planTitle: item.planTitle || '未命名计划',
              doctorName: item.doctorName || '',
              commitmentId: item.commitmentId, // 保存 commitmentId
              isCurrent: true
            })
          }
        })
        
        // 转换为数组
        const boundPlans = Array.from(planMap.values())

        // 加载每个计划的绑定记录信息（检查是否已填写住院号和治疗组）
        this.loadPlansCommitmentInfo(boundPlans)
      },
      fail: (error) => {
        console.error('加载已绑定计划失败:', error)
        this.setData({ loading: false, boundPlans: [] })
      }
    })
  },

  // 加载每个计划的绑定记录信息
  loadPlansCommitmentInfo(plans) {
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    
    if (!sessionToken || plans.length === 0) {
      this.setData({
        boundPlans: plans,
        loading: false
      })
      return
    }

    // 并行加载所有计划的绑定记录信息
    const promises = plans.map(plan => {
      return new Promise((resolve) => {
        wx.request({
          url: `${app.globalData.apiBase}/v1/patient/commitments/${plan.planId}/info`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
              const data = res.data.data
              plan.commitmentId = data.commitmentId
              plan.hasSupplementInfo = !!(data.admissionNumber && data.teamName && data.doctorId)
              plan.isCurrent = data.isCurrent || false
            } else {
              plan.hasSupplementInfo = false
              plan.isCurrent = false
            }
            resolve(plan)
          },
          fail: () => {
            plan.hasSupplementInfo = false
            plan.isCurrent = false
            resolve(plan)
          }
        })
      })
    })

    Promise.all(promises).then(updatedPlans => {
      // 只保留当前计划
      const currentPlans = updatedPlans.filter(plan => plan.isCurrent)
      
      // 按计划名称排序
      currentPlans.sort((a, b) => {
        return a.planTitle.localeCompare(b.planTitle, 'zh-CN')
      })
      
      this.setData({
        boundPlans: currentPlans,
        loading: false
      })
    })
  },

  // 点击计划，跳转到补充信息页面
  viewPlanDetail(e) {
    const planId = e.currentTarget.dataset.planId
    const commitmentId = e.currentTarget.dataset.commitmentId
    
    // 跳转到补充信息页面
    const url = `/pages/patient/supplement/supplement?planId=${planId}${commitmentId ? `&commitmentId=${commitmentId}` : ''}`
    wx.navigateTo({
      url: url
    })
  },

  // 设置当前随访计划
  setCurrentPlan(e) {
    e.stopPropagation() // 阻止事件冒泡，避免触发 viewPlanDetail
    
    const commitmentId = e.currentTarget.dataset.commitmentId
    const planTitle = e.currentTarget.dataset.planTitle
    const isCurrent = e.currentTarget.dataset.isCurrent === 'true'
    
    if (!commitmentId) {
      wx.showToast({
        title: '缺少绑定记录信息',
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

    // 如果已经是当前计划，则取消；否则设置为当前计划
    const method = isCurrent ? 'DELETE' : 'PUT'
    const url = `${app.globalData.apiBase}/v1/patient/commitments/${commitmentId}/current`

    wx.showLoading({
      title: isCurrent ? '取消中...' : '设置中...',
      mask: true
    })

    wx.request({
      url: url,
      method: method,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({
            title: res.data.data.message || (isCurrent ? '已取消当前计划' : '已设置为当前计划'),
            icon: 'success',
            duration: 2000
          })
          // 刷新列表
          setTimeout(() => {
            this.loadBoundPlans()
          }, 500)
        } else {
          wx.showToast({
            title: res.data?.message || '操作失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('设置当前计划失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  editProfile() {
    wx.navigateTo({
      url: '/pages/patient/profile/profile'
    })
  },

  openAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    })
  },

  openPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadBoundPlans()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 500)
  }
})