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
  settings: AppLocalSettings & Record<string, any>
  getUserBatches(refresh?: boolean): Promise<Batch[]>
  getUserCourses(refresh?: boolean): Promise<Course[]>
  cloud?: () => MaybePromise<WxCloud>
  watchThemeChange?: (listener: Listener<Theme>) => void
  unWatchThemeChange?: (listener: Listener<Theme>) => void
}

interface AppLocalSettings {
  autoLocateWhenCheckin: boolean
}
