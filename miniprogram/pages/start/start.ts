const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud
const db = cloud.database()

Page({
  async onLoad() {
    app.onThemeChange({ theme: wx.getAppBaseInfo().theme ?? 'light' })

    const isStudentNumberBound = await this.fetchUserDetail()
    if (isStudentNumberBound) {
      wx.switchTab({ url: '/pages/index/index' })
    } else {
      wx.redirectTo({ url: '/pages/register/register' })
    }
  },

  /**
   * 获取用户信息（静默登录）。
   * @returns 用户是否绑定了校园信息
   */
  async fetchUserDetail() {
    if (!app.globalData.openid || !app.globalData.user) {
      const response = await cloud.callFunction({
        name: 'registe',
        data: {
          $url: 'get-id'
        }
      }) as unknown as ICloud.CallFunctionResult
      const result = response.result as AnyObject
      if (result.code !== 0) return
      const openid = app.globalData.openid = result.data
      const res = await db.collection('users').where({ _openid: openid }).get()

      // 已注册用户
      if (res.data.length !== 0) {
        app.globalData.user = res.data[0]
        return !!app.globalData.user!.student_number
      }

      // 用户没有注册，为了防止数据库权限导致的自己无法读取个人信息的问题，必须由自己创建记录
      await db.collection('users').add({ data: {} })
      return false
    }
    return true
  }
})
