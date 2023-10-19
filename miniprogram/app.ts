const themeChangeListeners: Listener<Theme>[] = []

App({
  globalData: {
    theme: 'light' as Theme,
    isNetworkConnected: true,
    user: {} as User,
    openid: '',
    batches: undefined as Batch[] | undefined,
    courses: undefined as Course[] | undefined
  },

  cloudData: {
    isCloudInitialized: false,
    _cloud: null
  },

  async onLaunch() {
    this._registerAppUpdateEvent()
    this._registerNetworkEvents()
    this._initCloud()
  },

  /**
   * 初始化云开发环境（支持环境共享和正常两种模式）
   */
  async _initCloud() {
    const shareInfo = wx.getExtConfigSync()  // 检查 ext 配置文件
    const normalInfo = require('./envList.js').envList || []  // 读取 envlist 文件
    if (shareInfo.envid != null) {  // 如果 ext 配置文件存在，环境共享模式
      // @ts-ignore
      this.cloudData._cloud = new wx.cloud.Cloud({  // 声明 cloud 实例
        resourceAppid: shareInfo.appid,
        resourceEnv: shareInfo.envid
      })
      // @ts-ignore 装载云函数操作对象返回方法
      this.cloud = async function () {
        if (!this.cloudData.isCloudInitialized) {
          console.log('以环境共享模式初始化云开发')
          // @ts-ignore
          await this.cloudData._cloud!.init()
          this.cloudData.isCloudInitialized = true
        }
        return this.cloudData._cloud!
      }
    } else {  // 如果 ext 配置文件不存在，正常云开发模式
      if (normalInfo.length !== 0 && normalInfo[0].envId != null) {  // 如果文件中 envlist 存在
        console.log('以正常模式初始化云开发')
        wx.cloud.init({  // 初始化云开发环境
          traceUser: true,
          env: normalInfo[0].envId
        })
        // @ts-ignore 装载云函数操作对象返回方法
        this.cloud = () => {
          return wx.cloud  // 直接返回 wx.cloud
        }
      } else {  // 如果文件中 envlist 不存在，提示要配置环境
        console.log('无云开发环境')
        // @ts-ignore
        this.cloud = () => {
          throw '当前小程序没有配置云开发环境，请在 envList.js 中配置你的云开发环境'
        }
      }
    }
  },

  /**
   * 注册小程序更新事件，应用有更新时提示用户。
   */
  _registerAppUpdateEvent() {
    if (!wx.canIUse('getUpdateManager')) {
      return false
    }

    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate((_) => { })
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })
    updateManager.onUpdateFailed(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败',
        showCancel: false
      })
    })

    return true
  },

  /**
   * 检测网络环境。
   */
  _registerNetworkEvents() {
    // 初次判断网络连接情况
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType
        if (networkType === 'none') {
          this.globalData.isNetworkConnected = false
          wx.showToast({
            title: '当前无网络',
            icon: 'loading',
            duration: 2000
          })
        }
      }
    })

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        this.globalData.isNetworkConnected = false
        wx.showToast({
          title: '网络已断开',
          icon: 'loading',
          duration: 2000
        })
      } else {
        if (!this.globalData.isNetworkConnected) {
          this.globalData.isNetworkConnected = true
          wx.hideToast()
          wx.showToast({
            title: '网络已重新连接',
            icon: 'success'
          })
        }
      }
    })
  },

  async _fetchUserBatches() {
    const openid = this.globalData.openid
    if (!openid.length) return

    // @ts-ignore
    const db = this.cloud().database()

    let batchMembers: DB.IQueryResult | undefined
    try {
      // @ts-ignore
      batchMembers = await db.collection('batch_members').where({ _openid: openid }).get()
    } catch (err) {
      console.error(err)
    }
    if (!batchMembers) return

    const batches: Batch[] = []
    for (const member of batchMembers.data) {
      let batch: DB.IQuerySingleResult | undefined
      try {
        batch = await db.collection('batches').doc(member.batch_id).get()
      } catch { }
      if (batch) {
        batches.push(batch.data as Batch)
      }
    }

    this.globalData.batches = batches
  },

  async getUserBatches(refresh = false) {
    if (!this.globalData.batches || refresh) {
      await this._fetchUserBatches()
    }
    return this.globalData.batches!
  },

  async _fetchUserCourses() {
    const studentNumber = this.globalData.user.student_number
    if (!studentNumber || studentNumber.length !== 10) return

    // @ts-ignore
    const cloud = this.cloud() as WxCloud

    const result = (await cloud.callFunction({
      name: 'icq',
      data: { $url: 'courses/mine' }
    })).result as AnyObject | undefined

    if (result?.code === 0) {
      this.globalData.courses = result.data
    }
  },

  async getUserCourses(refresh = false) {
    if (!this.globalData.courses || refresh) {
      await this._fetchUserCourses()
    }
    return this.globalData.courses!
  },

  watchThemeChange(listener: Listener<Theme>) {
    if (themeChangeListeners.indexOf(listener) === -1) {
      themeChangeListeners.push(listener)
    }
  },

  unWatchThemeChange(listener: Listener<Theme>) {
    const index = themeChangeListeners.indexOf(listener)
    if (index > -1) {
      themeChangeListeners.splice(index)
    }
  },

  onThemeChange(result: WechatMiniprogram.OnThemeChangeListenerResult) {
    this.globalData.theme = result.theme
    themeChangeListeners.forEach((listener) => listener(result.theme))
  }
})
