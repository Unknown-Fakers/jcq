import dayjs, { Dayjs } from 'dayjs'
import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud
const db = cloud.database()
const _ = db.command

JcqPage({
  data: {
    id: '',
    name: '',
    courses: [],
    own: false,
    selectByDefault: true,
    membersCount: 0,
    pauseCheckinForMe: { loading: true, until: '' },

    datetimePickerRange: [],
    datetimePickerValue: []
  },

  onLoad(options: Record<string, string | undefined>) {
    if (!options.id) return
    this.fetchBatchDetail(options.id)
    this.initPauseCheckinPicker()
  },

  onShareAppMessage() {
    return {
      title: `点击加入 Jcq 搭子圈【${this.data.name}】`,
      path: `/pages/batch/join?id=${this.data.id}`
    }
  },

  fetchBatchDetail(id: string) {
    // 获取本地信息
    (async () => {
      const [courses, batches] = await Promise.all([app.getUserCourses(), app.getUserBatches()])
      const batch = batches.find(batch => batch._id === id)
      if (!batch) return

      const courseNames = batch.courses.map(course => courses.find(it => it.number === course)?.name)

      const pauseCheckinForMe = { loading: false, until: '' }
      if (batch.pause_checkin_for_me_until && batch.pause_checkin_for_me_until >= new Date()) {
        pauseCheckinForMe.until = dayjs(batch.pause_checkin_for_me_until).format('YYYY-MM-DD HH:mm')
      }

      this.setData({
        id: batch._id,
        name: batch.name,
        courses: courseNames,
        own: batch._openid === app.globalData.openid,
        selectByDefault: !batch.no_default_select,
        pauseCheckinForMe
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
    wx.showNavigationBarLoading()
    db.collection('batch_members').doc(this.batch.member_id).update({
      data: { no_default_select: !e.detail.value },
      success: () => {
        this.batch.no_default_select = !e.detail.value
        this.setData({ selectByDefault: e.detail.value })
      },
      fail: (err) => {
        console.error(err)
      },
      complete: () => {
        wx.hideNavigationBarLoading()
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
  },

  initPauseCheckinPicker() {
    const now = dayjs()
    const deadline = dayjs().add(1, 'year')

    const years = Array.from({ length: deadline.year() - now.year() + 1 }, (_, i) => `${now.year() + i}年`)
    const months = Array.from({ length: 12 - now.month() }, (_, i) => `${now.month() + i + 1}月`)
    const daysOfThisMonth = Array.from({ length: now.daysInMonth() - now.date() + 1 }, (_, i) => `${now.date() + i}日`)
    const hours = Array.from({ length: 24 - now.hour() }, (_, i) => `${now.hour() + i}时`)
    const minutes = Array.from({ length: 60 - now.minute() }, (_, i) => `${now.minute() + i}分`)

    this.now = now
    this.deadline = deadline
    this.setData({
      datetimePickerRange: [years, months, daysOfThisMonth, hours, minutes],
      datetimePickerValue: [0, 0, 0, 0, 0]
    })
  },

  /**
   * 更新暂停签到时间选择器。
   */
  updatePauseCheckinPicker(e: WechatMiniprogram.PickerColumnChange) {
    const now: Dayjs = this.now
    const deadline: Dayjs = this.deadline
    const { column, value } = e.detail
    const { datetimePickerRange, datetimePickerValue } = this.data

    datetimePickerValue[column] = value
    // console.log(now, deadline, column, value, datetimePickerRange, datetimePickerValue)

    // 更新月份
    if (column === 0) {
      if (value === 0) {
        // 年份是今年，月份从当前月份开始
        datetimePickerRange[1] = Array.from({ length: 12 - now.month() }, (_, i) => `${now.month() + i + 1}月`)
      } else if (value === datetimePickerRange[0].length - 1) {
        // 年份是 deadline 年份，月份从 1 月开始，到 deadline 月份结束
        datetimePickerRange[1] = Array.from({ length: deadline.month() + 1 }, (_, i) => `${i + 1}月`)
      } else {
        // 其他情况，月份从 1 月开始，到 12 月结束
        datetimePickerRange[1] = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
      }
      if (datetimePickerValue[1] >= datetimePickerRange[1].length) {
        datetimePickerValue[1] = datetimePickerRange[1].length - 1
      }
    }

    // 更新日期
    const month = parseInt(datetimePickerRange[1][datetimePickerValue[1]].slice(0, -1), 10)
    if (column <= 1) {
      if (datetimePickerValue[0] === 0 && month === now.month() + 1) {
        // 月份是当前月份，日期从当前日期开始
        datetimePickerRange[2] = Array.from({ length: now.daysInMonth() - now.date() + 1 }, (_, i) => `${now.date() + i}日`)
      } else if (datetimePickerValue[0] === datetimePickerRange[0].length - 1 && month === deadline.month() + 1) {
        // 月份是 deadline 月份，日期从 1 日开始，到 deadline 日期结束
        datetimePickerRange[2] = Array.from({ length: deadline.date() }, (_, i) => `${i + 1}日`)
      } else {
        // 其他情况，日期从 1 日开始，到该月份的最后一天结束
        datetimePickerRange[2] = Array.from({ length: dayjs((datetimePickerRange[1][value] as string).slice(0, -1), 'M').daysInMonth() }, (_, i) => `${i + 1}日`)
      }
      if (datetimePickerValue[2] >= datetimePickerRange[2].length) {
        datetimePickerValue[2] = datetimePickerRange[2].length - 1
      }
    }

    // 更新小时
    const date = parseInt(datetimePickerRange[2][datetimePickerValue[2]].slice(0, -1), 10)
    if (column <= 2) {
      if (datetimePickerValue[0] === 0 && datetimePickerValue[1] === 0 && date === now.date()) {
        // 日期是当前日期，小时从当前小时开始
        datetimePickerRange[3] = Array.from({ length: 24 - now.hour() }, (_, i) => `${now.hour() + i}时`)
      } else if (datetimePickerValue[0] === datetimePickerRange[0].length - 1 && month === deadline.month() + 1 && date === deadline.date()) {
        // 日期是 deadline 日期，小时从 0 时开始，到 deadline 小时结束
        datetimePickerRange[3] = Array.from({ length: deadline.hour() + 1 }, (_, i) => `${i}时`)
      } else {
        // 其他情况，小时从 0 时开始，到 23 时结束
        datetimePickerRange[3] = Array.from({ length: 24 }, (_, i) => `${i}时`)
      }
      if (datetimePickerValue[3] >= datetimePickerRange[3].length) {
        datetimePickerValue[3] = datetimePickerRange[3].length - 1
      }
    }

    // 更新分钟
    const hour = parseInt(datetimePickerRange[3][datetimePickerValue[3]].slice(0, -1), 10)
    if (column <= 3) {
      if (datetimePickerValue[0] === 0 && datetimePickerValue[1] === 0 && datetimePickerValue[2] === 0 && hour === now.hour()) {
        // 小时是当前小时，分钟从当前分钟开始
        datetimePickerRange[4] = Array.from({ length: 60 - now.minute() }, (_, i) => `${now.minute() + i}分`)
      } else if (datetimePickerValue[0] === datetimePickerRange[0].length - 1 && month === deadline.month() + 1 && date === deadline.date() && hour === deadline.hour()) {
        // 小时是 deadline 小时，分钟从 0 分开始，到 deadline 分钟结束
        datetimePickerRange[4] = Array.from({ length: deadline.minute() + 1 }, (_, i) => `${i}分`)
      } else {
        // 其他情况，分钟从 0 分开始，到 59 分结束
        datetimePickerRange[4] = Array.from({ length: 60 }, (_, i) => `${i}分`)
      }
      if (datetimePickerValue[4] >= datetimePickerRange[4].length) {
        datetimePickerValue[4] = datetimePickerRange[4].length - 1
      }
    }

    this.setData({ datetimePickerRange, datetimePickerValue })
  },

  onPauseCheckinPickerChanged(e: WechatMiniprogram.PickerChange) {
    const year = parseInt(this.data.datetimePickerRange[0][e.detail.value[0]].slice(0, -1), 10)
    const month = parseInt(this.data.datetimePickerRange[1][e.detail.value[1]].slice(0, -1), 10)
    const date = parseInt(this.data.datetimePickerRange[2][e.detail.value[2]].slice(0, -1), 10)
    const hour = parseInt(this.data.datetimePickerRange[3][e.detail.value[3]].slice(0, -1), 10)
    const minute = parseInt(this.data.datetimePickerRange[4][e.detail.value[4]].slice(0, -1), 10)
    const untilDayjs = dayjs(`${year}-${month}-${date} ${hour}:${minute}:00`, 'YYYY-M-D H:m:s')
    const until = untilDayjs.toDate()

    wx.showNavigationBarLoading()
    db.collection('batch_members').doc(this.batch.member_id).update({
      data: { pause_checkin_until: until },
      success: () => {
        this.batch.pause_checkin_for_me_until = until
        this.setData({ pauseCheckinForMe: { loading: false, until: untilDayjs.format('YYYY-MM-DD HH:mm') } })
      },
      fail: (err) => {
        console.error(err)
      },
      complete: () => {
        wx.hideNavigationBarLoading()
      }
    })
  },

  removeCheckinPause() {
    wx.showActionSheet({
      alertText: '解除暂停后，圈子成员将可以为您签到。',
      itemList: ['解除暂停'],
      itemColor: '#576b95',
      success: () => {
        wx.showNavigationBarLoading()
        db.collection('batch_members').doc(this.batch.member_id).update({
          data: { pause_checkin_until: _.remove() },
          success: () => {
            this.batch.pause_checkin_for_me_until = undefined
            this.setData({ pauseCheckinForMe: { loading: false, until: '' } })
          },
          fail: (err) => {
            console.error(err)
          },
          complete: () => {
            wx.hideNavigationBarLoading()
          }
        })
      }
    })
  }
})
