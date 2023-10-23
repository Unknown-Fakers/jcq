const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const fetch = require('make-fetch-happen')

require('events').EventEmitter.defaultMaxListeners = 100

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

/**
 * 创建课程具体的上课时间。
 * @param {Date} timetableTime 时间表时间，仅包含上课的时、分
 * @param {Date} dateTime 日期时间，用于确定具体上课的年、月、日
 */
function createCourseTime(timetableTime, dateTime) {
  return new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate(), timetableTime.getHours(), timetableTime.getMinutes())
}

function addRandomOffsetApproximately({ lat, lng }, rangeInMeters) {
  // 每经度和纬度的大约距离（米）
  const metersPerDegree = 111000

  // 计算随机偏移量，转换为经纬度
  const latOffset = (Math.random() * 2 - 1) * rangeInMeters / metersPerDegree
  const lngOffset = ((Math.random() * 2 - 1) * rangeInMeters / metersPerDegree) / Math.cos(Math.PI / 180.0 * lat)

  // 添加随机偏移量
  const lat2 = lat + latOffset
  const lng2 = lng + lngOffset

  return { lat: lat2, lng: lng2 }
}

exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  // 获取用户信息，该云函数的每个功能都要用到用户信息
  app.use(async (ctx, next) => {
    ctx.wxContext = cloud.getWXContext()
    const userRecords = await db.collection('users').where({ _openid: ctx.wxContext.OPENID }).get()

    // 查不到用户信息
    if (userRecords.data.length <= 0) {
      ctx.body = { code: 403 }  // 未授权访问
      return
    }

    ctx.user = userRecords.data[0]
    await next()
  })

  // 检查是否完善了学号信息
  app.router(['courses/mine', 'checkin', 'records'], async (ctx, next) => {
    const studentNumber = ctx.user.student_number
    if (studentNumber && studentNumber.length) {
      await next()
    } else {
      ctx.body = { code: 1 }  // 用户信息不完善
    }
  })

  // 时间相关
  app.router(['courses/mine'], async (ctx, next) => {
    const term = await db.collection('school_terms').where({ current: true }).get()

    if (!term.data || term.data.length !== 1) {
      ctx.body = { code: 2 }  // 无法确定当前学期信息
      return
    }

    ctx.term = term.data[0]
    ctx.now = new Date()

    // 计算当前是星期几
    const todayDayOfWeek = ctx.now.getDay()
    ctx.todayDayOfWeek = todayDayOfWeek === 0 ? 7 : todayDayOfWeek

    // 计算当前是开学第几周
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const diff = ctx.now - ctx.term.starting_date
    ctx.currentWeek = Math.floor(diff / oneWeek) + 1

    ctx.coursesTimetable = [
      { from: new Date(0, 0, 0, 8, 30), to: new Date(0, 0, 0, 9, 15) },
      { from: new Date(0, 0, 0, 9, 25), to: new Date(0, 0, 0, 10, 10) },
      { from: new Date(0, 0, 0, 10, 30), to: new Date(0, 0, 0, 11, 15) },
      { from: new Date(0, 0, 0, 11, 25), to: new Date(0, 0, 0, 12, 10) },
      { from: new Date(0, 0, 0, 14, 0), to: new Date(0, 0, 0, 14, 45) },
      { from: new Date(0, 0, 0, 14, 55), to: new Date(0, 0, 0, 15, 40) },
      { from: new Date(0, 0, 0, 16, 0), to: new Date(0, 0, 0, 16, 45) },
      { from: new Date(0, 0, 0, 16, 55), to: new Date(0, 0, 0, 17, 40) },
      { from: new Date(0, 0, 0, 18, 0), to: new Date(0, 0, 0, 18, 45) },
      { from: new Date(0, 0, 0, 18, 55), to: new Date(0, 0, 0, 19, 40) },
      { from: new Date(0, 0, 0, 20, 0), to: new Date(0, 0, 0, 20, 45) },
      { from: new Date(0, 0, 0, 20, 55), to: new Date(0, 0, 0, 21, 40) }
    ]

    await next()
  })

  app.router('courses/mine', async (ctx, next) => {
    const response = await fetch('https://icq.cqust.edu.cn/interface/stuclassinfor.action?person_uname=' + ctx.user.student_number)
    try {
      ctx.courses = await response.json()
    } catch (err) {
      console.error(err)
      ctx.body = { code: -1 }  // 解析服务器响应失败
    }
    if (ctx.courses) {
      await next()
    } else {
      ctx.body = { code: 999 }  // 未知错误
    }
  }, async (ctx) => {
    for (const course of ctx.courses) {
      if (course.class_zc === '未安排') continue

      // 将课程组成解析为 string[] 类型
      course.compositions = []
      course.inThisWeek = []
      for (const composition of course.class_zc.split(',')) {
        course.compositions.push(composition)

        // 标记本周课程
        course.inThisWeek.push(composition[ctx.currentWeek - 1] === '1')
      }

      // 将课程在一周中的星期几有上课安排解析为 number[] 类型
      course.daysOfWeek = []
      course.today = []
      for (const dayOfWeek of course.class_xqj.split(',')) {
        const n = parseInt(dayOfWeek, 10)
        course.daysOfWeek.push(n)

        // 标记当天课程
        course.today.push(course.inThisWeek[course.daysOfWeek.length - 1] && ctx.todayDayOfWeek === n)
      }
    }

    // 为当天的课程计算参考时间差
    ctx.courses.filter((course) => course.today && course.today.includes(true))
      .forEach((course) => {
        const info = course.class_info.split('|')
        if (info.length !== course.today.length) return  // 课程信息数量和其它信息不对等

        let timeDiffs = []
        for (let i = 0; i < info.length; i++) {
          if (!course.today[i]) continue
          const timerange = /:(.+?)节:/.exec(info[i])[1].split('-')

          // 仅能处理“4节”或“3-4节”这样的情况，对应到 timerange 就是 1 个时间和 2 个时间
          if (timerange.length !== 1 && timerange.length !== 2) continue

          const startTime = createCourseTime(ctx.coursesTimetable[timerange[0] - 1].from, ctx.now)
          const endTime = createCourseTime(ctx.coursesTimetable[timerange[timerange.length - 1] - 1].to, ctx.now)
          timeDiffs.push(Math.abs(ctx.now - startTime), Math.abs(ctx.now - endTime))
        }

        // 取最短时间差作为参考时间差
        if (timeDiffs.length) {
          course.referenceTimeDiff = Math.min(...timeDiffs)
        }
      })

    // 为课程排序
    ctx.courses.sort((a, b) => {
      // 当天的课程排最前面
      const isAToday = a.today && a.today.includes(true), isBToday = b.today && b.today.includes(true)
      if (isAToday && !isBToday) return -1  // A 是今天的课，B 不是，A 排前面
      if (!isAToday && isBToday) return 1  // B 是今天的课，A 不是，B 排前面
      if (isAToday && isBToday) return a.referenceTimeDiff - b.referenceTimeDiff  // 两者都是今天的课，按照参考时间差排序

      // 本周的课程其次
      const isAInThisWeek = a.inThisWeek && a.inThisWeek.includes(true), isBInThisWeek = b.inThisWeek && b.inThisWeek.includes(true)
      if (isAInThisWeek && !isBInThisWeek) return -1  // A 是本周的课，B 不是，A 排前面
      if (!isAInThisWeek && isBInThisWeek) return 1  // B 是本周的课，A 不是，B 排前面

      // 有安排的课排在没有安排的课前面
      if (a.compositions && !b.compositions) return -1  // A 是有安排课程，B 不是，A 排前面
      if (!a.compositions && b.compositions) return 1  // B 是有安排课程，A 不是，B 排前面

      return 0  // 其他情况，顺序不变
    })

    ctx.body = {
      code: 0,
      data: ctx.courses.map((course) => {
        return {
          id: course.class_id,
          number: course.class_num,
          name: course.class_name,
          teacher: {
            number: course.class_teacherid,
            name: course.class_teacher
          },
          compositions: course.compositions,
          days_of_week: course.daysOfWeek,
          in_this_week: course.inThisWeek,
          today: course.today,
          detail: course.class_info.split('|')
        }
      })
    }
  })

  app.router('checkin', async (ctx) => {
    const { course, teacher, code, batches, geo } = event

    // 先尝试为本人签到
    let response = await fetch(`https://icq.cqust.edu.cn/interface/fdqmentionbyxh.action?cnum=${course}-${teacher}-${code}&xh=${ctx.user.student_number}&location=暂无地理位置`)
    let result
    try {
      result = await response.text()
    } catch (err) {
      console.error(err)
      ctx.body = { code: -1 }  // 解析服务器响应失败
    }
    if (result === undefined) return

    // 签到失败，-1 和 0 是随机数无效，-2 是设备中有多个登录信息
    if (result === '-2' || result === '-1' || result === '0') {
      ctx.body = { code: 2, data: result }
      return
    }

    // 没有搭子圈信息，直接补充上传用户本人的签到位置，然后结束签到
    if (!batches || !batches.length) {
      if (geo && geo.lat && geo.lng) {
        // 对于位置信息的返回结果，不做检查
        try {
          await fetch(`https://icq.cqust.edu.cn/interface/updatelocationbyxh.action?cnum=${course}&xh=${ctx.user.student_number}&location=纬度:${geo.lat}经度:${geo.lng}`, {
            headers: { 'Content-Type': 'application/json' }
          })
        } catch { /* ignore */ }
      }
      ctx.body = { code: 0, data: { succeed: 1, failed: [] } }
      return
    }

    // 查询所有需要签到的学生
    const students = (await db.collection('batch_members').aggregate()
      .project({ _id: 0, batch_id: 1, _openid: 1 })
      .match({ batch_id: _.in(batches) })
      .group({ _id: '$_openid' })
      .lookup({
        from: 'users',
        localField: '_id',
        foreignField: '_openid',
        as: 'user'
      })
      .replaceRoot({ newRoot: $.arrayElemAt(['$user', 0]) })
      .end())
      .list
      // 没有绑定学号的不签，提交本次请求的用户已经签好了，都筛掉
      .filter(stu => stu.student_number && stu.student_number.length && stu.student_number !== ctx.user.student_number)

    // 等待所有签到请求完成
    const allResults = await Promise.all(students.map(student => new Promise((resolve, reject) => {
      fetch(`https://icq.cqust.edu.cn/interface/fdqmentionbyxh.action?cnum=${course}-${teacher}-${code}&xh=${student.student_number}&location=暂无地理位置`)
        .then(res => res.text())
        .catch(err => reject(err))
        .then(code => resolve(code))
        .catch(err => reject(err))
    })))

    const failed = []
    if (geo && geo.lat && geo.lng) {
      // 有位置信息，为所有同学补充上传位置，并且统计失败信息
      const locationUpdates = [new Promise(resolve => {
        fetch(`https://icq.cqust.edu.cn/interface/updatelocationbyxh.action?cnum=${course}&xh=${ctx.user.student_number}&location=纬度:${geo.lat}经度:${geo.lng}`, {
          headers: { 'Content-Type': 'application/json' }
        }).then(() => resolve()).catch(() => { /* ignore */ })
      })]
      for (let i = 0; i < allResults.length; i++) {
        if (allResults[i] === '-2' || allResults[i] === '-1' || allResults[i] === '0') {
          failed.push({ student_number: students[i].student_number, code: allResults[i] })
        } else {
          const g = addRandomOffsetApproximately(geo, 5)
          locationUpdates.push(new Promise(resolve => {
            fetch(`https://icq.cqust.edu.cn/interface/updatelocationbyxh.action?cnum=${course}&xh=${students[i].student_number}&location=纬度:${g.lat}经度:${g.lng}`, {
              headers: { 'Content-Type': 'application/json' }
            }).then(() => resolve()).catch(() => { /* ignore */ })
          }))
        }
      }
      await Promise.all(locationUpdates)  // 等待请求全部完成，因为是云开发的服务器，返回 body 之后其它任务可能会被直接掐掉
    } else {
      // 没有位置信息，只统计失败信息
      for (let i = 0; i < allResults.length; i++) {
        if (allResults[i] === '-2' || allResults[i] === '-1' || allResults[i] === '0') {
          failed.push({ student_number: students[i].student_number, code: allResults[i] })
        }
      }
    }

    ctx.body = { code: 0, data: { succeed: students.length - failed.length + 1, failed } }
  })

  app.router('records', async (ctx) => {
    const { course } = event
    const [checkinResponse, attendanceInfoResponse] = await Promise.all([
      fetch(`http://icq.cqust.edu.cn/interface/stumentioninfor.action?cnum=${course}&person_uname=${ctx.user.student_number}`),
      fetch(`http://icq.cqust.edu.cn/interface/mentioncountinfor.action?cnum=${course}`)
    ])
    try {
      ctx.records = await checkinResponse.json()
      ctx.attendanceInfo = await attendanceInfoResponse.json()
    } catch (err) {
      console.error(err)
      ctx.body = { code: -1 }  // 解析服务器响应失败
    }

    if (ctx.records && ctx.attendanceInfo) {
      const { records, attendanceInfo } = ctx
      // console.log(records)
      // console.log(attendanceInfo)
      for (let i = 0; i < records.length; i++) {
        if (records.length !== attendanceInfo.length) {
          ctx.body = { code: 999 }  // 未知错误
        }

        // 为每条记录添加出勤信息
        records[i].attendanceInfo = {}
        const attendanceMatch = attendanceInfo[i].mentionInfo.match(/出勤(\d+)人\/迟到(\d+)人\/请假(\d+)人\/缺勤(\d+)人/);
        records[i].attendanceInfo.total = Number(attendanceMatch[1]) + Number(attendanceMatch[2]) + Number(attendanceMatch[3]) + Number(attendanceMatch[4])
        records[i].attendanceInfo.attended = Number(attendanceMatch[1])
        records[i].attendanceInfo.late = Number(attendanceMatch[2])
        records[i].attendanceInfo.leave = Number(attendanceMatch[3])
        records[i].attendanceInfo.absent = Number(attendanceMatch[4])

        records[i].operation_type = 0  // 0 未操作，1 教师操作，2 自主操作
        if (records[i].infor_location === '教师操作') {
          records[i].operation_type = 1
        }
        else if (records[i].infor_type == '0') {
          records[i].operation_type = 2
        }

        // 为每条记录添加地理位置信息
        records[i].location = {}
        if (records[i].infor_location.includes('纬度')) {
        records[i].location.area = records[i].infor_key.replace(/\[|\]/g, '')
        const locationStr = records[i].infor_location
        const latMatch = locationStr.match(/纬度:(\d+\.\d+)/)
        const lngMatch = locationStr.match(/经度:(\d+\.\d+)/)
        records[i].location.lat = Number(latMatch[1])
        records[i].location.lng = Number(lngMatch[1])
        }
        else {
          records[i].location.area = "未上传地理位置"
          records[i].location.lat = 0
          records[i].location.lng = 0
        }
      }

      ctx.body = {
        code: 0,
        data: records.map((record) => {
          return {
            // location: record.infor_key.replace(/\[|\]/g, ''),
            time: record.infor_time,
            status: Number(record.infor_type),
            operation_type: record.operation_type,
            location: {
              ...record.location
            },
            attendance_info: {
              ...record.attendanceInfo
            }
          }
        })
      }
    } else {
      ctx.body = { code: 999 }  // 未知错误
    }
  })

  return app.serve()
}
