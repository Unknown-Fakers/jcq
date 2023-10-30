import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud

JcqPage({
  data: {
    username: '未知用户'
  },

  onLoad() {
    app.getUserDetail()
      .then(user => {
        this.setData({ username: user.student_number ?? '未知用户' })
      })
  },

  unbind() {
    wx.showModal({
      title: '解绑学号',
      content: '您创建的搭子圈将被解散，账号的所有信息都将被清除，您可以重新在任意微信号上绑定该学号。确定要解绑学号吗？',
      confirmColor: '#fa5151',
      success: (res) => {
        if (!res.confirm) return
        cloud.callFunction({
          name: 'registe',
          data: { $url: 'unbind' },
          success: () => {
            wx.removeStorageSync('openid')
            wx.removeStorageSync('user')
            app.globalData.openid = ''
            app.globalData.user = {}
            wx.reLaunch({ url: '/pages/index/index' })
          }
        })
      }
    })
  }
})
