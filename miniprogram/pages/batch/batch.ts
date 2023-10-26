import JcqPage from '../../base/JcqPage'

// @ts-ignore
const app = getApp<IAppOption>()
// @ts-ignore
const cloud = app.cloud!() as WxCloud
// @ts-ignore
const db = cloud.database()
const _ = db.command

JcqPage({
  data: {
    ownedBatches: [],
    joinedBatches: [],
    isFirstLoad: true
  },

  async onLoad(_options: Record<string, string | undefined>) {
    wx.showLoading({ title: '加载中' })
    await this.getAndProcessBatches()
    wx.hideLoading()
  },

  onShow() {
    if (this.data.isFirstLoad) {
      // 首次加载使用 onLoad 中的加载逻辑
      this.setData({ isFirstLoad: false })
    } else {
      // 后续重新回到本页面采用静默更新
      this.getAndProcessBatches()
    }
  },

  async onPullDownRefresh() {
    await this.getAndProcessBatches(true)
    wx.stopPullDownRefresh()
  },

  async getAndProcessBatches(refresh = false) {
    const batches = await app.getUserBatches(refresh)
    if (!batches || !batches.length) return

    const ownedBatches = []
    const joinedBatches = []
    for (const batch of batches) {
      if (batch._openid === app.globalData.openid) {
        ownedBatches.push(batch)
      } else {
        joinedBatches.push(batch)
      }
    }
    this.setData({ ownedBatches, joinedBatches, showSkeleton: false })
  }
})
