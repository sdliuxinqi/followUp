// pages/doctor/team/team.js
const AV = require('../../../libs/av-core-min.js')

Page({
  data: {
    loading: false,
    teamMembers: [],
    leader: null,
    normalMembers: [],
    totalPlans: 0,
    isLeader: false,
    showAddDialog: false,
    availableDoctors: [],
    showActionMenu: false,
    currentMemberId: '',
    currentMemberIsAdmin: false,
    newMember: {
      name: '',
      hospital: '',
      department: ''
    }
  },

  onLoad() {
    this.loadTeam()
  },

  onShow() {
    this.getTabBar()?.setData({
      mode: 'doctor',
      selected: 1
    })
  },

  // 加载医生团队列表
  loadTeam() {
    this.setData({ loading: true })

    const app = getApp()
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      console.warn('未登录，跳转到首页')
      wx.reLaunch({ url: '/pages/index/index' })
      this.setData({ loading: false })
      return
    }

    // 调用后端 API 获取团队信息
    wx.request({
      url: `${API_BASE}/v1/doctor/team`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        this.setData({ loading: false })

        if (res.statusCode === 200 && res.data && res.data.success) {
          const data = res.data.data
          const members = data.members || []
          
          // 确保所有成员数据都有默认值，防止 null/undefined
          const normalizedMembers = members.map(member => ({
            id: member.id || '',
            name: member.name || '',
            hospital: member.hospital || '',
            department: member.department || '',
            title: member.title || '',
            isLeader: member.isLeader || false,
            isAdmin: member.isAdmin || false,
            planCount: member.planCount || 0
          }))
          
          // 分离负责人和普通成员
          const leader = normalizedMembers.find(m => m.isLeader) || null
          const normalMembers = normalizedMembers.filter(m => !m.isLeader)

          // 计算总计划数（使用后端返回的 totalPlans，如果没有则计算）
          const totalPlans = data.totalPlans || normalizedMembers.reduce((sum, member) => sum + (member.planCount || 0), 0)
          const isLeader = data.isCurrentUserLeader || false

          this.setData({
            teamMembers: normalizedMembers,
            leader: leader,
            normalMembers: normalMembers,
            totalPlans: totalPlans,
            isLeader: isLeader
          })
        } else {
          console.error('加载团队失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '加载团队失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('加载团队请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 显示添加成员对话框
  showAddMemberDialog() {
    // 加载可添加的医生列表
    this.loadAvailableDoctors();
    this.setData({
      showAddDialog: true
    })
  },

  // 加载所有医生列表（显示已添加状态）
  loadAvailableDoctors() {
    const app = getApp()
    const sessionToken = app.globalData.sessionToken || wx.getStorageSync('sessionToken')
    const API_BASE = app.globalData.apiBase || 'https://server.tka-followup.top'

    if (!sessionToken) {
      wx.showToast({
        title: '未登录，请重新登录',
        icon: 'none'
      })
      return
    }

    // 获取当前团队成员的ID列表（包括负责人和普通成员）
    // 确保 ID 都是字符串格式，以便正确比较
    const currentMemberIds = this.data.teamMembers
      .map(m => m && m.id ? String(m.id) : null)
      .filter(id => id !== null)

    console.log('当前团队成员ID列表:', currentMemberIds)
    console.log('团队成员数据:', this.data.teamMembers)

    // 显示加载提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    // 获取当前医生的科室信息，用于筛选同科室医生（可选）
    const currentDepartment = this.data.leader?.department || this.data.normalMembers[0]?.department

    // 调用后端 API 获取医生列表
    wx.request({
      url: `${API_BASE}/v1/doctor/list`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      data: {
        // 可选：按科室筛选，如果当前医生有科室信息，则只显示同科室的医生
        // department: currentDepartment
      },
      success: (res) => {
        wx.hideLoading()

        console.log('加载医生列表响应:', res)

        if (res.statusCode === 200 && res.data && res.data.success) {
          const allDoctors = res.data.data || []

          // 标记哪些医生已添加，并确保所有字段都有默认值
          const availableDoctors = allDoctors.map(doctor => {
            const doctorId = doctor && doctor.id ? String(doctor.id) : null
            const isAdded = doctorId && currentMemberIds.includes(doctorId)
            
            // 确保所有字段都有默认值，防止 null/undefined
            const normalizedDoctor = {
              id: doctorId || '',
              name: (doctor && doctor.name !== null && doctor.name !== undefined) ? String(doctor.name) : '',
              hospital: (doctor && doctor.hospital !== null && doctor.hospital !== undefined) ? String(doctor.hospital) : '',
              department: (doctor && doctor.department !== null && doctor.department !== undefined) ? String(doctor.department) : '',
              title: (doctor && doctor.title !== null && doctor.title !== undefined) ? String(doctor.title) : '',
              isAdded: isAdded
            }
            
            console.log(`医生 ${normalizedDoctor.name || '未知'} (ID: ${normalizedDoctor.id}) 是否已添加:`, isAdded)
            
            return normalizedDoctor
          })

          console.log('处理后的医生列表:', availableDoctors)

          this.setData({
            availableDoctors: availableDoctors
          })
        } else {
          const errorMsg = res.data?.message || `请求失败 (${res.statusCode})`
          console.error('加载医生列表失败:', {
            statusCode: res.statusCode,
            data: res.data,
            errorMsg
          })
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载医生列表请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 隐藏添加成员对话框
  hideAddMemberDialog() {
    this.setData({ showAddDialog: false })
  },

  // 阻止事件冒泡
  preventClose() {
    // 阻止点击弹窗内容时关闭
  },

  // 阻止滚动穿透
  preventMove() {
    // 阻止遮罩层的滚动事件穿透到下层
  },

  // 添加医生（弹窗中只支持添加，不支持移除）
  toggleDoctor(e) {
    const doctorId = e.currentTarget.dataset.id;
    const doctor = this.data.availableDoctors.find(d => {
      const dId = d && d.id ? String(d.id) : null
      return dId === String(doctorId)
    });

    if (!doctor) {
      console.warn('未找到医生信息:', doctorId)
      return
    }

    // 确保 ID 类型一致进行比较
    const doctorIdStr = String(doctorId)
    const currentMemberIds = this.data.teamMembers
      .map(m => m && m.id ? String(m.id) : null)
      .filter(id => id !== null)
    const isAdded = currentMemberIds.includes(doctorIdStr)

    // 如果已添加，则提示并返回（弹窗中不支持移除）
    if (isAdded) {
      wx.showToast({
        title: '该医生已在团队中',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 如果未添加，则添加
    this.addTeamMember(doctorIdStr, doctor);
  },

  // 添加团队成员
  addTeamMember(doctorId, doctor) {
    const app = getApp()
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
      title: '添加中...',
      mask: true
    })

    wx.request({
      url: `${API_BASE}/v1/doctor/team/members`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      data: {
        doctorId: doctorId
      },
      success: (res) => {
        wx.hideLoading()

        // 接受 200 和 201 状态码（201 是创建资源的标准状态码）
        const isSuccess = (res.statusCode === 200 || res.statusCode === 201) && res.data && res.data.success

        if (isSuccess) {
          const newMember = res.data.data
          
          // 确保新成员数据都有默认值
          const normalizedMember = {
            id: newMember.id || '',
            name: newMember.name || '',
            hospital: newMember.hospital || '',
            department: newMember.department || '',
            title: newMember.title || '',
            isLeader: newMember.isLeader || false,
            isAdmin: newMember.isAdmin || false,
            planCount: newMember.planCount || 0
          }
          
          // 更新团队成员列表
          const teamMembers = [...this.data.teamMembers, normalizedMember]
          const normalMembers = [...this.data.normalMembers, normalizedMember]
          const totalPlans = teamMembers.reduce((sum, member) => sum + (member.planCount || 0), 0)

          // 更新医生列表的isAdded状态（确保 ID 类型一致，并确保所有字段都有默认值）
          const doctorIdStr = String(doctorId)
          const availableDoctors = this.data.availableDoctors.map(d => {
            const dId = d && d.id ? String(d.id) : null
            if (dId === doctorIdStr) {
              // 更新时确保所有字段都有默认值
              return {
                id: d.id || '',
                name: (d.name !== null && d.name !== undefined) ? String(d.name) : '',
                hospital: (d.hospital !== null && d.hospital !== undefined) ? String(d.hospital) : '',
                department: (d.department !== null && d.department !== undefined) ? String(d.department) : '',
                title: (d.title !== null && d.title !== undefined) ? String(d.title) : '',
                isAdded: true
              }
            }
            // 保持原有数据，但确保字段安全
            return {
              id: d.id || '',
              name: (d.name !== null && d.name !== undefined) ? String(d.name) : '',
              hospital: (d.hospital !== null && d.hospital !== undefined) ? String(d.hospital) : '',
              department: (d.department !== null && d.department !== undefined) ? String(d.department) : '',
              title: (d.title !== null && d.title !== undefined) ? String(d.title) : '',
              isAdded: d.isAdded || false
            }
          })

          this.setData({
            teamMembers: teamMembers,
            normalMembers: normalMembers,
            totalPlans: totalPlans,
            availableDoctors: availableDoctors
          })

          wx.showToast({
            title: '添加成功',
            icon: 'success'
          })
        } else {
          console.error('添加成员失败:', {
            statusCode: res.statusCode,
            data: res.data,
            message: res.data?.message || '未知错误'
          })
          wx.showToast({
            title: res.data?.message || '添加失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('添加成员请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 显示成员操作菜单
  showMemberActions(e) {
    const memberId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const member = this.data.normalMembers[index];

    if (!member) return;

    this.setData({
      showActionMenu: true,
      currentMemberId: memberId,
      currentMemberIsAdmin: member.isAdmin || false
    });
  },

  // 隐藏成员操作菜单
  hideMemberActions() {
    this.setData({
      showActionMenu: false,
      currentMemberId: '',
      currentMemberIsAdmin: false
    });
  },

  // 阻止菜单关闭事件冒泡
  preventMenuClose() {
    // 阻止事件冒泡
  },

  // 切换管理员状态
  toggleAdmin(e) {
    const memberId = e.currentTarget.dataset.id;
    const memberIndex = this.data.normalMembers.findIndex(m => m.id === memberId);
    const teamMemberIndex = this.data.teamMembers.findIndex(m => m.id === memberId);

    if (memberIndex === -1 || teamMemberIndex === -1) return;

    const newAdminState = !this.data.normalMembers[memberIndex].isAdmin;

    const app = getApp()
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
      title: '设置中...',
      mask: true
    })

    wx.request({
      url: `${API_BASE}/v1/doctor/team/members/${memberId}/admin`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      data: {
        isAdmin: newAdminState
      },
      success: (res) => {
        wx.hideLoading()

        if (res.statusCode === 200 && res.data && res.data.success) {
          const updatedMember = res.data.data

          // 确保 ID 类型一致
          const memberIdStr = String(memberId)

          // 更新成员数据（合并原有数据和更新数据，确保所有字段都存在）
          const normalMembers = [...this.data.normalMembers]
          const memberIdx = normalMembers.findIndex(m => {
            const mId = m && m.id ? String(m.id) : null
            return mId === memberIdStr
          })
          if (memberIdx !== -1) {
            // 保留原有成员的所有字段，只更新 isAdmin 和其他返回的字段，确保所有字段都有默认值
            const oldMember = normalMembers[memberIdx]
            // 辅助函数：如果新值有效则使用，否则保留原值
            const getValue = (newVal, oldVal) => {
              if (newVal !== null && newVal !== undefined && newVal !== '') {
                return String(newVal)
              }
              return oldVal || ''
            }
            
            normalMembers[memberIdx] = {
              id: updatedMember.id || oldMember.id || '',
              name: getValue(updatedMember.name, oldMember.name),
              hospital: getValue(updatedMember.hospital, oldMember.hospital),
              department: getValue(updatedMember.department, oldMember.department),
              title: getValue(updatedMember.title, oldMember.title),
              isLeader: updatedMember.isLeader !== undefined ? updatedMember.isLeader : (oldMember.isLeader || false),
              isAdmin: updatedMember.isAdmin !== undefined ? updatedMember.isAdmin : (oldMember.isAdmin || false),
              planCount: updatedMember.planCount !== undefined ? updatedMember.planCount : (oldMember.planCount || 0)
            }
          }

          const teamMembers = [...this.data.teamMembers]
          const teamIdx = teamMembers.findIndex(m => {
            const mId = m && m.id ? String(m.id) : null
            return mId === memberIdStr
          })
          if (teamIdx !== -1) {
            // 保留原有成员的所有字段，只更新 isAdmin 和其他返回的字段，确保所有字段都有默认值
            const oldMember = teamMembers[teamIdx]
            // 辅助函数：如果新值有效则使用，否则保留原值
            const getValue = (newVal, oldVal) => {
              if (newVal !== null && newVal !== undefined && newVal !== '') {
                return String(newVal)
              }
              return oldVal || ''
            }
            
            teamMembers[teamIdx] = {
              id: updatedMember.id || oldMember.id || '',
              name: getValue(updatedMember.name, oldMember.name),
              hospital: getValue(updatedMember.hospital, oldMember.hospital),
              department: getValue(updatedMember.department, oldMember.department),
              title: getValue(updatedMember.title, oldMember.title),
              isLeader: updatedMember.isLeader !== undefined ? updatedMember.isLeader : (oldMember.isLeader || false),
              isAdmin: updatedMember.isAdmin !== undefined ? updatedMember.isAdmin : (oldMember.isAdmin || false),
              planCount: updatedMember.planCount !== undefined ? updatedMember.planCount : (oldMember.planCount || 0)
            }
          }

          this.setData({
            normalMembers: normalMembers,
            teamMembers: teamMembers,
            showActionMenu: false,
            currentMemberId: '',
            currentMemberIsAdmin: false
          })

          wx.showToast({
            title: newAdminState ? '已设置为管理员' : '已取消管理员',
            icon: 'success'
          })
        } else {
          console.error('设置管理员失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '设置失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('设置管理员请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 确认移除成员
  confirmRemoveMember(e) {
    const memberId = e.currentTarget.dataset.id;

    this.hideMemberActions();

    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.removeMemberById(memberId);
        }
      }
    });
  },

  // 移除成员（根据ID）
  removeMemberById(memberId) {
    const app = getApp()
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
      title: '移除中...',
      mask: true
    })

    wx.request({
      url: `${API_BASE}/v1/doctor/team/members/${memberId}`,
      method: 'DELETE',
      header: {
        'Content-Type': 'application/json',
        'X-LC-Session': sessionToken
      },
      success: (res) => {
        wx.hideLoading()

        if (res.statusCode === 200 && res.data && res.data.success) {
          // 更新团队成员列表
          const teamMembers = this.data.teamMembers.filter(m => m.id !== memberId)
          const normalMembers = this.data.normalMembers.filter(m => m.id !== memberId)
          const totalPlans = teamMembers.reduce((sum, member) => sum + (member.planCount || 0), 0)

          // 更新医生列表的isAdded状态（如果在弹窗中，确保 ID 类型一致，并确保所有字段都有默认值）
          const memberIdStr = String(memberId)
          const availableDoctors = this.data.availableDoctors.map(d => {
            const dId = d && d.id ? String(d.id) : null
            // 确保所有字段都有默认值
            const normalized = {
              id: d.id || '',
              name: (d.name !== null && d.name !== undefined) ? String(d.name) : '',
              hospital: (d.hospital !== null && d.hospital !== undefined) ? String(d.hospital) : '',
              department: (d.department !== null && d.department !== undefined) ? String(d.department) : '',
              title: (d.title !== null && d.title !== undefined) ? String(d.title) : '',
              isAdded: dId === memberIdStr ? false : (d.isAdded || false)
            }
            return normalized
          })

          this.setData({
            teamMembers: teamMembers,
            normalMembers: normalMembers,
            totalPlans: totalPlans,
            availableDoctors: availableDoctors
          })

          wx.showToast({
            title: '移除成功',
            icon: 'success'
          })
        } else {
          console.error('移除成员失败:', res.data?.message || '未知错误')
          wx.showToast({
            title: res.data?.message || '移除失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('移除成员请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 移除成员（保留兼容性）
  removeMember(e) {
    const memberId = e.currentTarget.dataset.id;
    this.confirmRemoveMember({ currentTarget: { dataset: { id: memberId } } });
  }
})