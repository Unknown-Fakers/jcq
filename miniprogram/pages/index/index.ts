import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()

JcqPage({
  data: {
    indices: [],
    courses: {}
  },

  async onLoad(_options: Record<string, string | undefined>) {
    // this.tryGetLocation()
    wx.startPullDownRefresh()
  },

  async onPullDownRefresh() {
    await this.fetchAndProcessCourses()
    wx.stopPullDownRefresh()
  },

  async fetchAndProcessCourses() {
    const courses = await app.getUserCourses(true)
    if (!courses) return

    const indices: string[] = []
    const map: Record<string, Course[]> = {}
    courses.map((course) => {
      for (let i = course.detail.length - 1; i >= 0; i--) {
        if (course.detail[i].trim() === '未安排') {
          // 删除“未安排”
          course.detail.splice(i, 1)
        } else {
          // 简化日程安排文本
          course.detail[i] = course.detail[i].replace('[第', '[').replace('周-第', '-').replace(']星期', ']周')
        }
      }
      return course
    }).forEach((course) => {
      if (!map[course.number]) {
        indices.push(course.number)
        map[course.number] = []
      }
      map[course.number].push(course)
    })
    this.setData({ indices, courses: map })
  },

  selectTeacher(e: WechatMiniprogram.TouchEvent) {
    const number: string | undefined = e.target.dataset.courseNumber
    const url: string | undefined = e.target.dataset.url
    if (!number || !number.length) return

    wx.showActionSheet({
      alertText: '请选择授课教师',
      itemList: this.data.courses[number].map((course: Course) => course.teacher.name),
      success: (res) => {
        wx.navigateTo({
          url: '/pages/checkin/'+ url+'?id=' + this.data.courses[number][res.tapIndex].id
        })
      }
    })
  },
})
