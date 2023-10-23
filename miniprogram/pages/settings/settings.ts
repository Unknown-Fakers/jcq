import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()

JcqPage({
  data: {
    autoLocateWhenCheckin: true
  },

  onLoad() {
    this.setData({
      autoLocateWhenCheckin: app.settings.autoLocateWhenCheckin
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
  }
})
