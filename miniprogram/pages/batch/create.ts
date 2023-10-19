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
    batch: {
      name: '',
      courses: [] as number[]
    },

    courses: [] as Course[],
    isLoadingCourses: true,

    formRules: [
      {
        name: 'name', rules: [
          { required: true, message: '请输入搭子圈名称' },
          { minlength: 3, message: '搭子圈名称至少 3 位字符' },
          { maxlength: 10, message: '搭子圈名称最多 10 位字符' }
        ]
      },
      {
        name: 'courses', rules: [
          { required: true, message: '请选择关联课程' },
          {
            validator(_rule: { name: string, message: string }, value: number[]) {
              if (!value.length) return '搭子圈需至少关联 1 门课程'
              return null
            }
          }
        ]
      }
    ],
    error: ''
  },

  onLoad() {
    this.fetchUserCourses()
  },

  onBatchNameInput(e: WechatMiniprogram.Input) {
    this.setData({ 'batch.name': e.detail.value })
  },

  onAttachedCoursesChanged(e: WechatMiniprogram.CheckboxGroupChange) {
    const courses = this.data.courses
    for (const course of courses) {
      course.selected = e.detail.value.includes(course.number)
    }
    this.setData({ 'batch.courses': e.detail.value, courses })
  },

  async createBatch() {
    this.selectComponent('#form').validate(async (valid: boolean, errors: Record<string, any>) => {
      if (valid) {
        wx.showLoading({
          title: '尝试创建中',
          mask: true
        })

        let batch
        try {
          batch = await db.collection('batches').add({ data: this.data.batch })
        } catch (err) {
          console.error(err)
          wx.hideLoading()
          this.parseCreateBatchError(err.errCode)
        }
        if (!batch) return

        let batchMember
        try {
          batchMember = await db.collection('batch_members').add({ data: { batch_id: batch._id, joined_at: new Date() } })
        } catch (err) {
          wx.hideLoading()
          this.setData({ error: '无法将您添加到新创建的圈子' })
        }
        if (!batchMember) return

        await app.getUserBatches(true)
        wx.navigateBack()
      } else {
        const firstError = Object.keys(errors)
        if (firstError.length) {
          this.setData({ error: errors[firstError[0]].message })
        }
      }
    })
  },

  parseCreateBatchError(errorCode: number) {
    switch (errorCode) {
      case 1:
      case -502001:
        this.setData({ error: '已存在同名圈子' })
        break
      default:
        this.setData({ error: '未知错误' })
        break
    }
  },

  async fetchUserCourses() {
    const existed: Record<string, boolean> = {}
    const courses = (await app.getUserCourses())
      // 课程编号一样即视为同一门课
      .filter((course) => {
        if (existed[course.number]) return false
        existed[course.number] = true
        return true
      })
    if (!courses.length) {
      wx.showModal({
        title: '您暂不能创建搭子圈',
        content: '您目前没有任何课程，创建圈子必须绑定至少一门课程，因此您暂无创建圈子的权限。',
        showCancel: false,
        success() {
          wx.navigateBack()
        }
      })
    } else {
      this.setData({ courses, isLoadingCourses: false })
    }
  }
})
