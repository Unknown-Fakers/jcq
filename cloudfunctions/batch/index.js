const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 检查 obj 是否是 types 类型中的其中一个。
 * @param {any} obj
 * @param {string | string[]} types
 */
function isType(obj, types) {
  if (typeof types === 'string') {
    return typeof obj === types
  } else if (typeof types === 'object' && types.length) {
    return types.indexOf(typeof obj) !== -1
  }
  return false
}

exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  app.router(['new', 'create'], async (ctx) => {
    if (!event.name || typeof event.name !== 'string' || event.name.length < 3 || event.name.length > 10) {
      ctx.body = { code: -1 }  // 请求参数不合法
      return
    }

    try {
      const newBatch = await db.collection('batches').add({
        data: {
          name: event.name
        }
      })
      ctx.body = { code: 0, data: newBatch._id }  // 创建成功
    } catch (err) {
      ctx.body = { code: 1 }  // 可能因为存在同名
    }
  })

  return app.serve()
}