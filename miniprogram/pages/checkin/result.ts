import JcqPage from '../../base/JcqPage'

JcqPage({
  data: {
    failed: []
  },

  onLoad(options: Record<string, string | undefined>) {
    if (!options.succeed || !options.failed) {
      wx.navigateBack()
      return
    }

    const succeed = parseInt(options.succeed, 10)
    const failed = JSON.parse(options.failed)
    this.setData({ succeed, failed })
  },

  back() {
    wx.navigateBack()
  }
})
