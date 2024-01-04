import JcqPage from "../../base/JcqPage";

JcqPage({
  data: {
    index: null,
    course: '',
    attended: [],
    absent: [],
    late: [],
    leave: []
  },

  async onLoad(options: Record<string, string | undefined>) {
    if (!options.index) {
      wx.showToast({ icon: 'error', title: '获取位置失败' })
      return
    }
    this.setData({ index: parseInt(options.index, 10), course: options.course })
    this.getCheckinInfo()
  },

  async getCheckinInfo() {
    wx.showLoading({ title: '加载中...', });
    let result: ApiResponse<CheckinResult> | undefined
    try {
      result = (await wx.cloud.callFunction({
        name: 'icq',
        data: {
          $url: 'checkins',
          course: this.data.course,
          index: this.data.index
        }
      })).result as ApiResponse<CheckinResult>
    } catch (err) {
      wx.showToast({ icon: 'error', title: '获取失败' })
      return
    } finally {
      wx.hideLoading()
    }
    if (result?.code !== 0) {
      wx.showToast({ icon: 'error', title: '服务器未响应' })
      return
    } else if (result?.code === 0 && !result?.data) {
      wx.showToast({ icon: 'error', title: '无任何位置信息' })
    } else {
      this.setData({ ...result.data })
    }
    console.log(this.data)
  }
})
