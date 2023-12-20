import { ThemedComponentWithComputed } from '../../base/JcqPage'

const app = getApp<IAppOption>()

ThemedComponentWithComputed({
  data: {
    topIndices: [] as string[],
    indices: [] as string[],
    courses: {} as Record<string, Course[]>,

    showSkeleton: true
  },

  watch: {
    'topIndices, courses': function (topIndices: string[], courses: Record<string, Course[]>) {
      if (!topIndices || !courses) return
      const indices = []
      for (const idx in courses) {
        if (topIndices.indexOf(idx) === -1) {
          indices.push(idx)
        }
      }
      this.setData({ indices })
    }
  },

  lifetimes: {
    attached() {
      this.loadTopCourseNumbers()
      this.fetchAndProcessCourses()

      // 预加载搭子圈数据
      app.getUserBatches()
    },
  },

  methods: {
    async onPullDownRefresh() {
      await this.fetchAndProcessCourses()
      wx.stopPullDownRefresh()
    },

    loadTopCourseNumbers() {
      const topCourseNumbers = wx.getStorageSync('top_courses')
      this.setData({ topIndices: topCourseNumbers || [] })
    },

    async fetchAndProcessCourses() {
      const courses = await app.getUserCourses(true)
      if (!courses) return

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
          map[course.number] = []
        }
        map[course.number].push(course)
      })
      this.setData({ courses: map, showSkeleton: false })
    },

    selectTeacher(e: WechatMiniprogram.TouchEvent) {
      const number: string | undefined = e.mark?.courseNumber
      if (!number || !number.length) return

      wx.showActionSheet({
        alertText: '请选择授课教师',
        itemList: this.data.courses[number].map((course: Course) => course.teacher.name),
        success: (res) => {
          wx.navigateTo({
            url: '/pages/checkin/checkin?id=' + this.data.courses[number][res.tapIndex].id
          })
        }
      })
    },

    topOrCancelToppingCourse(e: WechatMiniprogram.TouchEvent) {
      const number: string | undefined = e.mark?.courseNumber
      if (!number || !number.length) return

      const topIndices = [...this.data.topIndices]  // 拷贝一份，否则 setData 不会触发 watch
      const index = topIndices.indexOf(number)
      if (index !== -1) {
        topIndices.splice(index, 1)
      } else {
        topIndices.push(number)
        wx.showToast({ title: '已将课程置顶', icon: 'success', duration: 1000 })
      }

      this.setData({ topIndices })
      wx.setStorage({ key: 'top_courses', data: topIndices })
    }
  }
})
