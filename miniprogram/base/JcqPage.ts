import themeMixin from './behaviors/theme'

export default function JcqPage(options: any) {
  return Page(
    Object.assign({}, options, {
      behaviors: [themeMixin].concat(options.behaviors ?? []),
      onLoad(query: Record<string, string | undefined>) {
        const app = getApp<IAppOption>()
        // @ts-ignore
        this.onThemeChanged(app.globalData.theme)
        if (app.watchThemeChange) {
          // @ts-ignore
          app.watchThemeChange(this.onThemeChanged)
        }
        if (options.onLoad) {
          options.onLoad.call(this, query)
        }
      },
      onUnload() {
        const app = getApp<IAppOption>()
        if (app.unWatchThemeChange) {
          // @ts-ignore
          app.unWatchThemeChange(this.onThemeChanged)
        }
        if (options.onUnload) {
          options.onUnload.call(this)
        }
      }
    })
  )
}
