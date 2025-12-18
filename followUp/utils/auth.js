// utils/auth.js.js
export function checkRole(expect) {
  const role = wx.getStorageSync('role')
  if (role !== expect) {
    wx.reLaunch({ url: '/pages/index/index' })
  }
}
