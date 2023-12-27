// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const fetch = require('make-fetch-happen')

const aes = require('./aes.js')
const key = aes.enc.Utf8.parse('3812627904101511')
const iv = aes.enc.Utf8.parse('1111111111111111')

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

function encrypt(plaintext) {
  const bytes = aes.enc.Utf8.parse(plaintext)
  return aes.AES.encrypt(bytes, key, {
    iv,
    mode: aes.mode.CBC,
    padding: aes.pad.Pkcs7
  }).ciphertext.toString().toUpperCase()
}

/**
 * 获取学生的课程表。
 * @param {string} studentNumber 学号
 */
async function fetchCoursesOfStudent(studentNumber, password) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1
  const day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()

  const tag = encrypt(`${studentNumber}_${password}_${year}-${month}-${day}`)
  return await fetch(
    `https://icq.cqust.edu.cn/interface/stuclassinfor.action?tag=${tag}&person_uname=${studentNumber}`,
    {
      method: 'GET',
      json: true,
      headers: getIcqReuqestHeaders()
    }
  )
}

exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  app.router('bind', async (ctx) => {
    const { number, password } = event

    const courses = await fetchCoursesOfStudent(number, password)
    const response = await courses.text()
    if (response.length === 0) {
      ctx.body = { code: 1 }  // 账号密码不匹配
      return
    }

    const wxContext = cloud.getWXContext()

    const existed = await db.collection('users').where({ student_number: number }).get()
    if (existed.data.length !== 0) {
      if (existed.data[0]._openid === wxContext.OPENID) {
        ctx.body = { code: 0, data: wxContext.OPENID }  // 学号已被自己绑定，重复绑定算成功
        await db.collection('users').where({ _openid: wxContext.OPENID }).update({
          data: {
            student_number: number,
            icq_password: password
          }
        })
        return
      }

      ctx.body = { code: 2 }  // 学号被其它微信绑定
      return
    }

    await db.collection('users').where({ _openid: wxContext.OPENID }).update({
      data: {
        student_number: number,
        icq_password: password
      }
    })
    ctx.body = { code: 0, data: wxContext.OPENID }  // 绑定成功
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
