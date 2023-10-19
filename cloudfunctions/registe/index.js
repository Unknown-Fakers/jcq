// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const request = require('request-promise')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })  // 使用当前云环境

const db = cloud.database()

/**
 * i重科固定请求头。
 */
function getIcqReuqestHeaders() {
  return {
    'Content-Type': 'application/json',
    'Referer': 'https://servicewechat.com/wx96a1da8a627aa011/243/page-frame.html',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.34(0x18002230) NetType/WIFI Language/zh_CN',
    'Accept': '*/*'
  }
}

/**
 * 获取学生的课程表。
 * @param {string} studentNumber 学号
 */
async function fetchCoursesOfStudent(studentNumber) {
  return await new Promise((resolve) => {
    request({
      url: 'https://icq.cqust.edu.cn/interface/stuclassinfor.action?person_uname=' + studentNumber,
      method: 'GET',
      json: true,
      headers: getIcqReuqestHeaders()
    })
      .then((res) => resolve(res))
      .catch(() => resolve([]))
  })
}

/**
 * 获取课程的签到信息。
 * @param {string} courseNumber 课程编号
 */
async function fetchCourseMentionDetail(courseNumber) {
  return await new Promise((resolve) => {
    request({
      url: `https://icq.cqust.edu.cn/interface/minfor.action?cnum=${courseNumber}&nid=1`,
      method: 'GET',
      json: true,
      headers: getIcqReuqestHeaders()
    })
      .then((res) => resolve(res))
      .catch(() => resolve([]))
  })
}

exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  app.router('bind', async (ctx) => {
    const { name, number } = event

    console.log(event)

    const courses = await fetchCoursesOfStudent(number)
    if (courses.length === 0) {
      ctx.body = { code: 1 }  // 无法确认账号信息
      return
    }

    const wxContext = cloud.getWXContext()

    const existed = await db.collection('users').where({ student_number: number }).get()
    if (existed.data.length !== 0) {
      if (existed.data[0]._openid === wxContext.OPENID) {
        ctx.body = { code: 0, data: wxContext.OPENID }  // 学号已被自己绑定，重复绑定算成功
        return
      }

      ctx.body = { code: 2 }  // 学号被其它微信绑定
      return
    }

    for (const course of courses) {
      const students = await fetchCourseMentionDetail(course.class_num)
      if (students.length === 0) continue
      if (students.find((stu) => stu.infor_stuname === name && stu.infor_stunum === number)) {
        await db.collection('users').where({ _openid: wxContext.OPENID }).update({
          data: {
            student_number: number
          }
        })
        ctx.body = { code: 0, data: wxContext.OPENID }  // 绑定成功
        return
      }
    }

    ctx.body = { code: 3 }  // 学号与姓名不匹配
  })

  app.router('unbind', async (ctx) => {
    const wxContext = cloud.getWXContext()
    
    // 解散创建的搭子圈
    try {
      const ownedBatches = await db.collection('batches').where({ _openid: wxContext.OPENID }).get()

      // 删除搭子圈中的所有成员
      await Promise.all(ownedBatches.data.map(batch => new Promise((resolve, reject) => {
        db.collection('batch_members').where({ batch_id: batch._id }).remove()
          .then(() => resolve())
          .catch(err => reject(err))
      })))

      // 删除创建的搭子圈
      await db.collection('batches').where({ _openid: wxContext.OPENID }).remove()
    } catch (err) {
      console.error(err)
    }

    // 退出加入的搭子圈
    try {
      await db.collection('batch_members').where({ _openid: wxContext.OPENID }).remove()
    } catch (err) {
      console.error(err)
    }

    // 删除用户信息
    try {
      await db.collection('users').where({ _openid: wxContext.OPENID }).remove()
    } catch (err) {
      console.error(err)
    }

    ctx.body = { code: 0 }
  })

  app.router('get-id', async (ctx) => {
    const wxContext = cloud.getWXContext()
    ctx.body = { code: 0, data: wxContext.OPENID }
  })

  return app.serve()
}