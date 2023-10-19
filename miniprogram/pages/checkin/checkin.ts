import JcqPage from '../../base/JcqPage'
import { Geo, wgs84ToGcj02 } from '../../utils/geo'

const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud

JcqPage({
  data: {
    course: undefined as Course | undefined,
    batches: [] as Batch[],

    checkin: {
      course: '',
      teacher: '',
      code: '',
      batches: [] as string[],
      geo: undefined as Geo | undefined
    },

    lat: null as number | null,
    lng: null as number | null,
    isGettingLocation: false,
    teachingAreas: [
      {
        points: [
          { longitude: 106.322100618, latitude: 29.5918780728 },
          { longitude: 106.320834618, latitude: 29.5915720728 },
          { longitude: 106.320879618, latitude: 29.5899860728 },
          { longitude: 106.322702618, latitude: 29.5900330728 },
          { longitude: 106.322765618, latitude: 29.5904730728 },
          { longitude: 106.324670618, latitude: 29.5904490728 },
          { longitude: 106.325469618, latitude: 29.5910540728 },
          { longitude: 106.324714618, latitude: 29.5925300728 },
          { longitude: 106.323358618, latitude: 29.5923020728 },
          { longitude: 106.322702618, latitude: 29.5918940728 },
          { longitude: 106.322100618, latitude: 29.5918780728 },
        ],
        color: '#FF0000DD',
        width: 2,
        dottedLine: true
      },
      {
        points: [
          { longitude: 106.321189618, latitude: 29.5894860728 },
          { longitude: 106.319212618, latitude: 29.5895010728 },
          { longitude: 106.3192321796, latitude: 29.5875465807 },
          { longitude: 106.3211911796, latitude: 29.5875545807 },
          { longitude: 106.321180618, latitude: 29.5894620728 },
          { longitude: 106.321189618, latitude: 29.5894860728 },
          { longitude: 106.321189618, latitude: 29.5894860728 },
        ],
        color: "#FF0000DD",
        width: 2,
        dottedLine: !0
      },
      {
        points: [
          { longitude: 106.321269618, latitude: 29.5892660728 },
          { longitude: 106.3212711796, latitude: 29.5874685807 },
          { longitude: 106.3234091796, latitude: 29.5874605807 },
          { longitude: 106.323416618, latitude: 29.5892190728 },
          { longitude: 106.321278618, latitude: 29.5892660728 },
          { longitude: 106.321269618, latitude: 29.5892660728 },
        ],
        color: "#FF0000DD",
        width: 2,
        dottedLine: !0
      },
      {
        points: [
          { longitude: 106.323506618, latitude: 29.5891240728 },
          { longitude: 106.3235081796, latitude: 29.5874285807 },
          { longitude: 106.3262121796, latitude: 29.5874365807 },
          { longitude: 106.325725618, latitude: 29.5891790728 },
          { longitude: 106.323515618, latitude: 29.5891240728 },
        ],
        color: "#FF0000DD",
        width: 2,
        dottedLine: !0
      },
      {
        points: [
          { longitude: 106.3287340853, latitude: 29.5887817454 },
          { longitude: 106.326345618, latitude: 29.5887000728 },
          { longitude: 106.3263561796, latitude: 29.5874285807 },
          { longitude: 106.3287626608, latitude: 29.5875025241 },
          { longitude: 106.3287340853, latitude: 29.5887817454 },
        ],
        color: "#FF0000DD",
        width: 2,
        dottedLine: !0
      },
      {
        points: [
          { longitude: 106.326498618, latitude: 29.5887240728 },
          { longitude: 106.3287806608, latitude: 29.5887595241 },
          { longitude: 106.3288510853, latitude: 29.5900857454 },
          { longitude: 106.326525618, latitude: 29.5899800728 },
          { longitude: 106.326525618, latitude: 29.5899800728 },
          { longitude: 106.326498618, latitude: 29.5887240728 },
        ],
        color: "#FF0000DD",
        width: 2,
        dottedLine: !0
      },
    ],

    error: ''
  },

  async onLoad(options: Record<string, string | undefined>) {
    // 立即解析课程信息
    if (!options.id) {
      this.showDataMissingTipAndNavigateBack()
      return
    }
    const id = parseInt(options.id, 10)
    const courses = await app.getUserCourses()  // 从逻辑上讲，能进入到该页面，一定已经获取过课程信息了，因此这里不会造成阻塞
    const course = courses.find((course) => course.id === id)
    if (!course) {
      this.showDataMissingTipAndNavigateBack()
      return
    }
    this.setData({ course, 'checkin.course': course.number, 'checkin.teacher': course.teacher.number })

    // 异步获取其余信息
    this.getRelativeBatches()
    this.tryGetLocation()
  },

  tryGetLocation() {
    if (this.data.isGettingLocation) return
    this.setData({ isGettingLocation: true })

    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const geo: Geo = { lat: res.latitude, lng: res.longitude }
        this.setData({ 'checkin.geo': geo, ...wgs84ToGcj02(geo), isGettingLocation: false })
      },
      fail: (err) => {
        console.error(err)
        this.setData({ isGettingLocation: false })
      }
    })
  },

  async checkin() {
    if (this.data.checkin.code.length !== 6) {
      this.setData({ error: '签到码为 6 位数字' })
      return
    }

    wx.showLoading({ title: '签到中', mask: true })
    let result: ApiResponse<CheckinResult> | undefined
    try {
      result = (await cloud.callFunction({
        name: 'icq',
        data: {
          $url: 'checkin',
          ...this.data.checkin
        }
      })).result as ApiResponse<CheckinResult>
    } catch (err) {
      console.error(err)
    }
    wx.hideLoading()
    if (!result) {
      this.setData({ error: '网络异常' })
      return
    }

    if (result.code !== 0) {
      this.setData({ error: this.parseApiErrorCode(result.code) })
    } else if (result.data) {
      wx.redirectTo({ url: 'result?succeed=' + result.data.succeed + '&failed=' + JSON.stringify(result.data.failed) })
    } else {
      wx.showToast({ title: '签到成功', icon: 'success' })
    }
  },

  async getRelativeBatches() {
    const matchedBatches = (await app.getUserBatches())
      .filter((batch) => batch.courses.includes(this.data.course.number))
      .map((batch) => {
        batch.selected = !batch.no_default_select
        return batch
      })
    this.setData({
      batches: matchedBatches,
      'checkin.batches': matchedBatches.filter(batch => batch.selected).map(batch => batch._id)
    })
  },

  onCheckinCodeInput(e: WechatMiniprogram.Input) {
    this.setData({ 'checkin.code': e.detail.value })
  },

  onBatchesChanged(e: WechatMiniprogram.CheckboxGroupChange) {
    const batches: Batch[] = this.data.batches
    for (const batch of batches) {
      batch.selected = e.detail.value.includes(batch._id!.toString())
    }
    this.setData({ 'checkin.batches': e.detail.value, batches })
  },

  showDataMissingTipAndNavigateBack() {
    wx.showModal({
      title: '缺失必要数据',
      content: '无法完成签到，或可引发异常。',
      confirmText: '关闭签到页',
      showCancel: false,
      complete() {
        wx.navigateBack()
      }
    })
  },

  parseApiErrorCode(code: number) {
    switch (code) {
      case -1:
        return '解析 iCQ 服务器响应失败'
      case 1:
        return '未绑定学号信息'
      case 2:
        return '签到码无效'
      default:
        return '未知 API 错误'
    }
  }
})
