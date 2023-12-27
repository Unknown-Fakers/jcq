import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()

JcqPage({
  data: {
    autoLocateWhenCheckin: true,
    studentNumber: ''
  },

  onLoad() {
    this.setData({
      autoLocateWhenCheckin: app.settings.autoLocateWhenCheckin,
      studentNumber: app.globalData.user?.student_number || ''
    })
  },

  onAutoLocateChanged(e: WechatMiniprogram.SwitchChange) {
    wx.setStorage({
      key: 'no_auto_locate_when_checkin',
      data: !e.detail.value,
      success: () => {
        app.settings.autoLocateWhenCheckin = e.detail.value
      }
    })
  },

  clearDataCache() {
    wx.showModal({
      title: '清除数据缓存',
      content: '清除缓存后，小程序将重启。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.restartMiniProgram({ path: '/pages/index/index' })
            }
          })
        }
      }
    })
  }
})
