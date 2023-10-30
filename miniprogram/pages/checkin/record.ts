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
    wx.setNavigationBarTitle({ title: course.name })
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
      wx.showToast({ icon: 'error', title: '获取失败' })
      return
    } finally {
      wx.hideLoading();
    }
    const recordsData: any[] = (result?.data as unknown as any[])?.reverse()
    if (result?.code !== 0) {
      wx.showToast({ icon: 'error', title: '服务器未响应' })
      return
    } else if (result?.code === 0 && !recordsData?.length) {
      wx.showToast({ icon: 'error', title: '暂无签到记录' })
    } else {
      for (let i = 0; i < recordsData.length; i++) {
        switch (recordsData[i].operation_type) {
          case 0:
            recordsData[i].operation_type = '未操作'
            break
          case 1:
            recordsData[i].operation_type = '教师操作'
            if(recordsData[i].status === -1){
               recordsData[i].status = 110
               recordsData[i].operation_type = '无效签到（签了被强行改）'
            }
            if(recordsData[i].status === 0){
              recordsData[i].status = 555
              recordsData[i].operation_type = '旷课未遂'
           }

            break
          case 2:
            recordsData[i].operation_type = '自主操作'
            break
          default:
            recordsData[i].operation_type = '未知操作'
        }
      }
      this.setData({ records: result.data, courseName: result.code })
      console.log(this.data.records)
    }
  },
  navigateToLocation(e: WechatMiniprogram.TouchEvent) {
    console.log(this.data.records)
    const index: Number | undefined = this.data.records.length - e.target.dataset.index  //将倒序后的索引变为正确索引
    wx.navigateTo({
      url: `/pages/checkin/location?index=${index}&course=${this.data.Course.number}`
    })
    console.log(index)
    console.log(this.data.Course.number)
  },
  navigateToDetail(e: WechatMiniprogram.TouchEvent) {
    const index: Number | undefined = this.data.records.length - e.target.dataset.index  //将倒序后的索引变为正确索引
    wx.navigateTo({
      url: `/pages/checkin/detail?index=${index}&course=${this.data.Course.number}`
    })
    console.log(index)
    console.log(this.data.Course.number)
  }
})
