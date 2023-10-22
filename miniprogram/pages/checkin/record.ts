import JcqPage from '../../base/JcqPage'
const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud


JcqPage({
  data: {
    Course: undefined as Course | undefined,
    courseName: '',
    teacher: '',
    records: {}
  },
  async onLoad(options: Record<string, string | undefined>) {
    // 立即解析课程信息
    if (!options.id) {
      wx.showToast({ icon: 'error', title: '获取课程失败' })
      return
    }
    const id = parseInt(options.id, 10)
    const courses = await app.getUserCourses()
    const course = courses.find((course) => course.id === id)
    if (!course) {
      wx.showToast({ icon: 'error', title: '获取课程失败' })
      return
    }
    this.setData({ 'Course': course })
    this.getrecordInfo()
    console.log(this.data.Course)
    console.log(this.data.Course.number)
  },
  async getrecordInfo() {
    wx.showLoading({ title: '加载中...', });
    let result: ApiResponse<CheckinResult> | undefined
    try {
      result = (await cloud.callFunction({
        name: 'icq',
        data: {
          $url: 'records',
          course: this.data.Course.number,
        }
      })).result as ApiResponse<CheckinResult>
    } catch (err) {
      wx.showToast({ icon: 'error', title: '获取失败'})
      return
    } finally {
      wx.hideLoading();
    }
    const recordsData = result?.data
    if (result?.code !== 0) {
      wx.showToast({ icon: 'error', title: '服务器未响应' })
      return
    } else if (result?.code === 0 && !recordsData?.length) {
      wx.showToast({ icon: 'error', title: '暂无签到记录'})
      return
    } else {
      this.setData({ records: result.data, courseName: result.code })
      console.log(this.data.records)
    }
  },
})
