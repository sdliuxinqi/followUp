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

    const isDevMode = true
    if (isDevMode) {
      // 开发模式下使用模拟数据
      const mock = [
        {
          id: 'd1',
          name: '张医生',
          hospital: '齐鲁医院',
          department: '骨科',
          isLeader: true,
          planCount: 25
        },
        {
          id: 'd2',
          name: '李医生',
          hospital: '齐鲁医院',
          department: '骨科',
          isLeader: false,
          planCount: 12
        },
        {
          id: 'd3',
          name: '王医生',
          hospital: '齐鲁医院',
          department: '骨科',
          isLeader: false,
          planCount: 8
        }
      ]
      // 分离负责人和普通成员
      const leader = mock.find(m => m.isLeader)
      const normalMembers = mock.filter(m => !m.isLeader)
      
      // 计算总计划数
      const totalPlans = mock.reduce((sum, member) => sum + member.planCount, 0)
      
      // 判断当前用户是否是负责人（开发模式下假设第一个是当前用户）
      const isLeader = mock[0].isLeader
      
      this.setData({
        teamMembers: mock,
        leader: leader,
        normalMembers: normalMembers,
        totalPlans: totalPlans,
        isLeader: isLeader,
        loading: false
      })
      return
    }

    // 生产环境调用云函数获取团队列表
    AV.Cloud.run('getDoctorTeam', {})
      .then(res => {
        const members = res.members || []
        const leader = members.find(m => m.isLeader)
        const normalMembers = members.filter(m => !m.isLeader)
        const totalPlans = members.reduce((sum, member) => sum + (member.planCount || 0), 0)
        const isLeader = res.isCurrentUserLeader || false
        
        this.setData({
          teamMembers: members,
          leader: leader,
          normalMembers: normalMembers,
          totalPlans: totalPlans,
          isLeader: isLeader,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载团队失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '加载团队失败',
          icon: 'none'
        })
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

  // 加载可添加的医生列表
  loadAvailableDoctors() {
    const isDevMode = true;
    if (isDevMode) {
      // 模拟可添加的医生列表（排除已在团队中的医生）
      const currentMemberIds = this.data.teamMembers.map(m => m.id);
      const mockDoctors = [
        {
          id: 'd10',
          name: '赵医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主治医师'
        },
        {
          id: 'd11',
          name: '刘医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '副主任医师'
        },
        {
          id: 'd12',
          name: '陈医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主治医师'
        },
        {
          id: 'd13',
          name: '周医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '住院医师'
        },
        {
          id: 'd14',
          name: '吴医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主任医师'
        }
      ];
      
      // 过滤掉已在团队中的医生
      const availableDoctors = mockDoctors.filter(d => !currentMemberIds.includes(d.id));
      
      this.setData({
        availableDoctors: availableDoctors
      });
      return;
    }

    // 生产环境调用云函数获取可添加的医生列表
    // AV.Cloud.run('getAvailableDoctors', {})
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

  // 选择医生添加到团队
  selectDoctor(e) {
    const doctorId = e.currentTarget.dataset.id;
    const doctor = this.data.availableDoctors.find(d => d.id === doctorId);
    
    if (!doctor) return;

    // 添加新成员
    const newMember = {
      id: doctor.id,
      name: doctor.name,
      hospital: doctor.hospital,
      department: doctor.department,
      isLeader: false,
      planCount: 0
    }

    const teamMembers = [...this.data.teamMembers, newMember]
    const normalMembers = [...this.data.normalMembers, newMember]

    this.setData({
      teamMembers: teamMembers,
      normalMembers: normalMembers,
      showAddDialog: false
    })

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })

    // TODO: 调用云函数添加成员到数据库
    // AV.Cloud.run('addTeamMember', { doctorId })
  },

  // 移除成员
  removeMember(e) {
    const memberId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const teamMembers = this.data.teamMembers.filter(m => m.id !== memberId)
          const normalMembers = this.data.normalMembers.filter(m => m.id !== memberId)
          const totalPlans = teamMembers.reduce((sum, member) => sum + member.planCount, 0)

          this.setData({
            teamMembers: teamMembers,
            normalMembers: normalMembers,
            totalPlans: totalPlans
          })

          wx.showToast({
            title: '移除成功',
            icon: 'success'
          })

          // TODO: 调用云函数从数据库移除成员
          // AV.Cloud.run('removeTeamMember', { memberId })
        }
      }
    })
  }
})