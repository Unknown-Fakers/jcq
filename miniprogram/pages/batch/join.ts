import JcqPage from '../../base/JcqPage'

// @ts-ignore
const app = getApp<IAppOption>()
// @ts-ignore
const cloud = app.cloud!() as WxCloud
// @ts-ignore
const db = cloud.database()
const _ = db.command

interface SearchedBatch {
  text: string
  value: string
  data: Batch
  diff?: string[]
  courseDisplayNames?: string[]
}

JcqPage({
  data: {
    batch: {} as { text: string, value: string, data: Batch },
    courses: [] as Course[],
    error: '',
    autoFocus: true
  },

  async onLoad(query: Record<string, string | undefined>) {
    this.setData({
      search: this.search.bind(this),
      courses: await app.getUserCourses(),
      autoFocus: !query.id
    })

    if (query.id) {
      const batch = await db.collection('batches').doc(query.id).get()
      this.displayBatchDetail({ text: batch.data.name, value: batch.data._id, data: batch.data })
    }
  },

  search(name: string) {
    // 什么都没输入的时候不搜索
    if (name.length === 0) {
      return Promise.resolve([])
    }

    return new Promise(async (resolve, reject) => {
      let batches = []
      try {
        batches = (await db.collection('batches').where({
          name: {
            $regex: '^' + name + '.*',
            $options: 'i'
          }
        }).get()).data
      } catch (err) {
        console.error(err)
        reject(err)
        return
      }

      resolve(
        batches.map(batch => {
          return { text: batch.name, value: batch._id, data: batch }
        })
      )
    })
  },

  onSelectBatch(e: WechatMiniprogram.CustomEvent) {
    const batch = e.detail.item
    this.displayBatchDetail(batch)
  },

  displayBatchDetail(batch: SearchedBatch) {
    this.selectComponent('.searchbar').hideInput()  // 隐藏搜索结果

    // 计算用户课程和圈子课程的差异
    batch.diff = [batch.data.courses, this.data.courses.map((course: Course) => course.number)]
      .reduce((a: string[], b: string[]) => a.filter(c => !b.includes(c)))

    // 展示课程
    if (batch.diff!.length === 0) {
      batch.courseDisplayNames = batch.data.courses
        .map((number: string) => {
          const course = this.data.courses.find((course: Course) => course.number === number)
          if (!course) return ''
          return course.name
        })
    }

    this.setData({ batch })
  },

  async confirmJoinBatch() {
    wx.showLoading({ title: '请稍候', mask: true })
    const batchId = this.data.batch.value
    try {
      await db.collection('batch_members').add({
        data: { batch_id: batchId }
      })

      // 更新本地用户数据
      await app.getUserBatches(true)

      wx.navigateBack()
    } catch (err) {
      this.setData({ error: '你已加入该搭子圈' })
    } finally {
      wx.hideLoading()
    }
  }
})
