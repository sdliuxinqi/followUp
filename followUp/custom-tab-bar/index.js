// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    mode: 'doctor'
  },

  attached() {
    // 延迟到下一轮事件循环，确保页面栈已就绪
    setTimeout(() => {
      const pages = getCurrentPages()

      if (!pages || pages.length === 0) {
        return
      }

      const route = pages[pages.length - 1].route || ''
      
      // 验证路由不为空
      if (!route || route.trim() === '') {
        console.warn('当前页面路由为空，使用默认模式')
        return
      }

      if (route.startsWith('pages/patient')) {
        this.setData({ mode: 'patient' })
      } else {
        this.setData({ mode: 'doctor' })
      }
    }, 0)
  },

  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      // 验证 path 是否存在且不为空
      if (!path || path.trim() === '') {
        console.error('页面路径为空:', e.currentTarget.dataset)
        wx.showToast({
          title: '页面路径错误',
          icon: 'none'
        })
        return
      }
      this.setData({ selected: index })
      wx.switchTab({ 
        url: path,
        fail: (err) => {
          console.error('切换页面失败:', err)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          })
        }
      })
    }
  }
})

