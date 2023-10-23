import JcqPage from '../../base/JcqPage'

JcqPage({
  data: {
    items: [],
    selected: 0,
    description: ''
  },

  onLoad(options: Record<string, string | undefined>) {
    if (options.title) {
      wx.setNavigationBarTitle({ title: options.title })
    }

    let items = new Array<string>()
    if (options.items) {
      try {
        items = JSON.parse(options.items)
      } catch { /* ignore */ }
    }

    let index = 0
    if (options.selected) {
      try {
        index = parseInt(options.selected)
      } catch { /* ignore */ }
    }

    this.setData({ items, selected: index, description: options.description })

    const eventChannel: WechatMiniprogram.EventChannel | undefined = this.getOpenerEventChannel()
    eventChannel?.on('changeItems', items => this.setData({ items }))
    eventChannel?.on('changeSelected', index => this.setData({ selected: index }))
    eventChannel?.on('changeDescription', description => this.setData({ description }))
  },

  onItemSelected(e: WechatMiniprogram.RadioGroupChange) {
    const index = parseInt(e.detail.value, 10)
    const eventChannel: WechatMiniprogram.EventChannel | undefined = this.getOpenerEventChannel()
    eventChannel?.emit('select', index)
  }
})
