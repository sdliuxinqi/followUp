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
          isAdmin: true,
          planCount: 12
        },
        {
          id: 'd3',
          name: '王医生',
          hospital: '齐鲁医院',
          department: '骨科',
          isLeader: false,
          isAdmin: false,
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

  // 加载所有医生列表（显示已添加状态）
  loadAvailableDoctors() {
    const isDevMode = true;
    if (isDevMode) {
      // 获取当前团队成员的ID列表
      const currentMemberIds = this.data.teamMembers.map(m => m.id);

      // 模拟所有医生列表（包含已在团队中的）
      const allDoctors = [
        {
          id: 'd1',
          name: '张医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主任医师'
        },
        {
          id: 'd2',
          name: '李医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主治医师'
        },
        {
          id: 'd3',
          name: '王医生',
          hospital: '齐鲁医院',
          department: '骨科',
          title: '主治医师'
        },
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

      // 标记哪些医生已添加
      const availableDoctors = allDoctors.map(doctor => ({
        ...doctor,
        isAdded: currentMemberIds.includes(doctor.id)
      }));

      this.setData({
        availableDoctors: availableDoctors
      });
      return;
    }

    // 生产环境调用云函数获取所有医生列表
    // AV.Cloud.run('getAllDoctors', {})
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

  // 切换医生（添加/移除）
  toggleDoctor(e) {
    const doctorId = e.currentTarget.dataset.id;
    const doctor = this.data.availableDoctors.find(d => d.id === doctorId);

    if (!doctor) return;

    const currentMemberIds = this.data.teamMembers.map(m => m.id);
    const isAdded = currentMemberIds.includes(doctorId);

    if (isAdded) {
      // 如果已添加，则移除
      const teamMembers = this.data.teamMembers.filter(m => m.id !== doctorId);
      const normalMembers = this.data.normalMembers.filter(m => m.id !== doctorId);
      const totalPlans = teamMembers.reduce((sum, member) => sum + member.planCount, 0);

      // 更新医生列表的isAdded状态
      const availableDoctors = this.data.availableDoctors.map(d =>
        d.id === doctorId ? { ...d, isAdded: false } : d
      );

      this.setData({
        teamMembers: teamMembers,
        normalMembers: normalMembers,
        totalPlans: totalPlans,
        availableDoctors: availableDoctors
      });

      wx.showToast({
        title: '移除成功',
        icon: 'success'
      });

      // TODO: 调用云函数从数据库移除成员
      // AV.Cloud.run('removeTeamMember', { doctorId })
    } else {
      // 如果未添加，则添加
      const newMember = {
        id: doctor.id,
        name: doctor.name,
        hospital: doctor.hospital,
        department: doctor.department,
        isLeader: false,
        isAdmin: false,
        planCount: 0
      };

      const teamMembers = [...this.data.teamMembers, newMember];
      const normalMembers = [...this.data.normalMembers, newMember];

      // 更新医生列表的isAdded状态
      const availableDoctors = this.data.availableDoctors.map(d =>
        d.id === doctorId ? { ...d, isAdded: true } : d
      );

      this.setData({
        teamMembers: teamMembers,
        normalMembers: normalMembers,
        availableDoctors: availableDoctors
      });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      // TODO: 调用云函数添加成员到数据库
      // AV.Cloud.run('addTeamMember', { doctorId })
    }
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

    // 更新成员数据
    const normalMembers = [...this.data.normalMembers];
    normalMembers[memberIndex].isAdmin = newAdminState;

    const teamMembers = [...this.data.teamMembers];
    if (teamMemberIndex !== -1) {
      teamMembers[teamMemberIndex].isAdmin = newAdminState;
    }

    this.setData({
      normalMembers: normalMembers,
      teamMembers: teamMembers,
      showActionMenu: false,
      currentMemberId: '',
      currentMemberIsAdmin: false
    });

    wx.showToast({
      title: newAdminState ? '已设置为管理员' : '已取消管理员',
      icon: 'success'
    });

    // TODO: 调用云函数更新数据库
    // AV.Cloud.run('setTeamAdmin', { memberId, isAdmin: newAdminState })
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
    const teamMembers = this.data.teamMembers.filter(m => m.id !== memberId);
    const normalMembers = this.data.normalMembers.filter(m => m.id !== memberId);
    const totalPlans = teamMembers.reduce((sum, member) => sum + member.planCount, 0);

    this.setData({
      teamMembers: teamMembers,
      normalMembers: normalMembers,
      totalPlans: totalPlans
    });

    wx.showToast({
      title: '移除成功',
      icon: 'success'
    });

    // TODO: 调用云函数从数据库移除成员
    // AV.Cloud.run('removeTeamMember', { memberId })
  },

  // 移除成员（保留兼容性）
  removeMember(e) {
    const memberId = e.currentTarget.dataset.id;
    this.confirmRemoveMember({ currentTarget: { dataset: { id: memberId } } });
  }
})