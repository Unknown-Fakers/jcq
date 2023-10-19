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
    const ownedBatches = []
    const joinedBatches = []
    for (const batch of batches) {
      if (batch._openid === app.globalData.openid) {
        ownedBatches.push(batch)
      } else {
        joinedBatches.push(batch)
      }
    }
    this.setData({ ownedBatches, joinedBatches })
  },

  /**
   * 退出搭子圈。
   */
  async quit(e) {
    const batchId = e.target.dataset.batchId
    const index = e.target.dataset.index

    // 删除搭子圈成员记录
    await db.collection('batch_members').where({
      _openid: app.globalData.openid,
      batch_id: batchId
    }).remove()

    // 删除用户个人信息中的搭子圈 ID
    app.globalData.user.batches.splice(index)
    await db.collection('users').doc(app.globalData.user._id).update({
      data: {
        batches: app.globalData.user.batches
      }
    })

    wx.startPullDownRefresh()
  }
})
