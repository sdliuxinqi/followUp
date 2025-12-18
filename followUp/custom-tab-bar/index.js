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
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})

