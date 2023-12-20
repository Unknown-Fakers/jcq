import { ComponentWithComputed } from 'miniprogram-computed'
import themeBehavior from './behaviors/theme'

interface BehaviorData {
  [k: string]: any
}

interface BehaviorExtend {
  // original
  data: BehaviorData
  setData(d: Record<string, any>): void
  _changeTheme(theme: string): void
  onThemeChanged?(theme: string): void
}

const newThemeBehavior = Behavior({
  lifetimes: {
    attached(this: BehaviorExtend) {
      const app = getApp<IAppOption>()
      this._changeTheme(app.globalData.theme)
      if (app.watchThemeChange) {
        app.watchThemeChange(this._changeTheme)
      }
    },
    detached(this: BehaviorExtend) {
      const app = getApp<IAppOption>()
      if (app.unWatchThemeChange) {
        app.unWatchThemeChange(this._changeTheme)
      }
    }
  },
  properties: {
    theme: {
      type: String,
      value: 'light'
    }
  },
  methods: {
    _changeTheme(this: BehaviorExtend, theme: string) {
      this.setData({ theme })
      this.onThemeChanged?.(theme)
    }
  }
})

type ThemedComputedInstance<
  TData extends WechatMiniprogram.Component.DataOption,
  TProperty extends WechatMiniprogram.Component.PropertyOption,
  TMethod extends WechatMiniprogram.Component.MethodOption,
  TComputed extends Record<string, (data: TData & { [K in keyof TProperty]: any }) => any>,
  TCustomInstanceProperty extends WechatMiniprogram.IAnyObject = Record<string, never>,
  TIsPage extends boolean = true
> = WechatMiniprogram.Component.Instance<TData, TProperty, TMethod, TCustomInstanceProperty, TIsPage> & {
  data: { [K in keyof TComputed]: ReturnType<TComputed[K]> } & { [K in keyof TProperty]: any }
}

type ThemedComputedOptions<
  TData extends WechatMiniprogram.Component.DataOption,
  TProperty extends WechatMiniprogram.Component.PropertyOption,
  TMethod extends WechatMiniprogram.Component.MethodOption,
  TWatch extends Record<string, (...args: any[]) => void>,
  TComputed extends Record<
    string,
    (data: TData & WechatMiniprogram.Component.PropertyOptionToData<TProperty>) => any
  >,
  TCustomInstanceProperty extends WechatMiniprogram.IAnyObject = {}
> = (Partial<WechatMiniprogram.Component.Data<TData>> &
  Partial<WechatMiniprogram.Component.Property<TProperty>> &
  Partial<WechatMiniprogram.Component.Method<TMethod & { onThemeChanged?(theme: string): void }>> &
  Partial<WechatMiniprogram.Component.OtherOption> &
  Partial<WechatMiniprogram.Component.Lifetimes> & {
    watch?: TWatch
    computed?: TComputed
    template?: string
  }) &
  ThisType<
    ThemedComputedInstance<
      TData,
      TProperty,
      TMethod,
      TComputed,
      TCustomInstanceProperty
    >
  >

export function ThemedComponentWithComputed<
  TData extends WechatMiniprogram.Component.DataOption,
  TProperty extends WechatMiniprogram.Component.PropertyOption,
  TMethod extends WechatMiniprogram.Component.MethodOption,
  TWatch extends Record<string, (...args: any[]) => void>,
  TComputed extends Record<string, (data: TData & WechatMiniprogram.Component.PropertyOptionToData<TProperty>) => any>,
  TCustomInstanceProperty extends WechatMiniprogram.IAnyObject = {}
>(options: ThemedComputedOptions<TData, TProperty, TMethod, TWatch, TComputed, TCustomInstanceProperty>): string {
  if (!Array.isArray(options.behaviors)) {
    options.behaviors = []
  }
  options.behaviors.unshift(newThemeBehavior)
  return ComponentWithComputed(options)
}

export default function JcqPage(options: any) {
  return Page(
    Object.assign({}, options, {
      behaviors: [themeBehavior].concat(options.behaviors ?? []),
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
