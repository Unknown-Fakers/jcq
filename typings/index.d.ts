/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    theme: Theme
    isNetworkConnected: boolean
    user?: User
    openid?: string
    system?: WechatMiniprogram.SystemInfo
    batches: Batch[]
  }
  cloudData: {
    isCloudInitialized: boolean
    _cloud: WxCloud | null
  }
  getUserBatches(refresh?: boolean): Promise<Batch[]>
  getUserCourses(refresh?: boolean): Promise<Course[]>
  cloud?: () => MaybePromise<WxCloud>
  watchThemeChange?: (listener: Listener<Theme>) => void
  unWatchThemeChange?: (listener: Listener<Theme>) => void
}
