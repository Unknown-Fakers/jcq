import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud
const db = cloud.database()

JcqPage({
  data: {
    id: '',
    name: '',
    courses: [],
    own: false,
    selectByDefault: true,
    membersCount: 0
  },

  onLoad(options: Record<string, string | undefined>) {
    if (!options.id) return
    this.fetchBatchDetail(options.id)
  },

  fetchBatchDetail(id: string) {
    // 获取本地信息
    (async () => {
      const [courses, batches] = await Promise.all([app.getUserCourses(), app.getUserBatches()])
      const batch = batches.find(batch => batch._id === id)
      if (!batch) return

      const courseNames = batch.courses.map(course => courses.find(it => it.number === course)?.name)
      this.setData({
        id: batch._id,
        name: batch.name,
        courses: courseNames,
        own: batch._openid === app.globalData.openid,
        selectByDefault: !batch.no_default_select
      })
      this.batch = batch
    })();

    // 获取远程数据
    (async () => {
      const membersCount = (await cloud.callFunction({
        name: 'batch',
        data: { $url: 'members/count', id }
      })).result as ApiResponse<number>
      if (membersCount && membersCount.code === 0) {
        this.setData({ membersCount: membersCount.data })
      }
    })()
  },

  onDefaultSelectChanged(e: WechatMiniprogram.SwitchChange) {
    db.collection('batch_members').doc(this.batch.member_id).update({
      data: { no_default_select: !e.detail.value },
      success: () => {
        this.batch.no_default_select = !e.detail.value
        this.setData({ selectByDefault: e.detail.value })
      },
      fail: (err) => {
        console.error(err)
      }
    })
  },

  delete() {
    wx.showActionSheet({
      alertText: '解散搭子圈后，所有成员（包括您）都将被移出圈子。',
      itemList: ['解散'],
      itemColor: '#fa5151',
      success: () => {
        cloud.callFunction({
          name: 'batch',
          data: { $url: 'delete', id: this.data.id },
          success: () => {
            this.removeBatchFromGlobalData().then(() => wx.navigateBack())
          }
        })
      }
    })
  },

  quit() {
    wx.showActionSheet({
      alertText: `即将退出搭子圈“${this.data.name}”`,
      itemList: ['退出'],
      itemColor: '#fa5151',
      success: () => {
        db.collection('batch_members').doc(this.batch.member_id).remove({
          success: () => {
            this.removeBatchFromGlobalData().then(() => wx.navigateBack())
          }
        })
      }
    })
  },

  async removeBatchFromGlobalData() {
    const batches = await app.getUserBatches()
    const index = batches.indexOf(this.batch)
    if (index !== -1) {
      batches.splice(index, 1)
    }
  }
})
