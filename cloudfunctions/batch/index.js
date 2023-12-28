const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  app.router('members/count', async (ctx) => {
    if (!event.id || typeof event.id !== 'string') {
      ctx.body = { code: -1 }  // 请求参数不合法
      return
    }

    try {
      const membersCount = await db.collection('batch_members').where({ batch_id: event.id }).count()

      // 查询所有需要签到的学生
      const activeMembersCount = (await db.collection('batch_members').aggregate()
        .project({ _id: 0, batch_id: 1, _openid: 1, pause_checkin_until: 1 })
        .match({ batch_id: event.id, pause_checkin_until: _.exists(false).or(_.lt(new Date())) })
        .group({ _id: '$_openid' })
        .lookup({
          from: 'users',
          localField: '_id',
          foreignField: '_openid',
          as: 'user'
        })
        .replaceRoot({ newRoot: $.arrayElemAt(['$user', 0]) })
        .match({ student_number: _.exists(true), icq_password: _.exists(true) })
        .count('total')
        .end())
        .list

      ctx.body = { code: 0, data: { total: membersCount.total, activated: activeMembersCount[0].total } }
    } catch (err) {
      console.error(err)
      ctx.body = { code: 1 }
    }
  })

  app.router('delete', async (ctx) => {
    if (!event.id || typeof event.id !== 'string') {
      ctx.body = { code: -1 }  // 请求参数不合法
      return
    }

    let batch
    try {
      batch = await db.collection('batches').doc(event.id).get()
    } catch (err) {
      console.error(err)
    }
    if (!batch || !batch.data) {
      ctx.body = { code: 1 }  // 搭子圈不存在
      return
    }

    const wxContext = cloud.getWXContext()
    if (batch.data._openid !== wxContext.OPENID) {
      ctx.body = { code: 403 }  // 无权删除不是自己创建的搭子圈
      return
    }

    // 移出搭子圈中的成员
    try {
      await db.collection('batch_members').where({ batch_id: event.id }).remove()
    } catch (err) {
      console.error(err)
      ctx.body = { code: 2 }  // 移出成员时遇到问题
    }
    if (ctx.body) return

    // 删除搭子圈
    try {
      await db.collection('batches').doc(event.id).remove()
    } catch (err) {
      console.error(err)
      ctx.body = { code: 1 }  // 搭子圈不存在
    }

    if (!ctx.body) {
      ctx.body = { code: 0 }
    }
  })

  return app.serve()
}
