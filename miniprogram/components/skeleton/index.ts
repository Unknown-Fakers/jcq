enum Variant {
  circle = 'circle', rect = 'rect', text = 'text'
}

enum Aniamtion {
  progress = 'progress', pulse = 'pulse', none = 'false'
}

Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    count: {
      type: Number,
      value: 1
    },
    variant: {
      type: String,
      value: Variant.text,
      observer: function (newVal: string) {
        const variants: string[] = Object.values(Variant);
        if (!variants.includes(newVal)) {
          console.warn(`Invalid variant value: ${newVal}. It should be one of ${variants.join(', ')}.`);
        }
      }
    },
    width: String,
    height: String,
    skeletonSpace: String,
    animation: {
      type: String,
      value: Aniamtion.progress,
      observer: function (newVal: string) {
        const animations: string[] = Object.values(Aniamtion);
        if (!animations.includes(newVal)) {
          console.warn(`Invalid animation value: ${newVal}. It should be one of ${animations.join(', ')}.`);
        }
      }
    },
    extClass: {
      type: String,
      value: ''
    }
  },

  data: {
    items: [] as number[],
    style: ''
  },

  observers: {
    'width, height, skeletonSpace': function (width: string, height: string, skeletonSpace: string) {
      const style = []
      if (width) style.push(`width: ${width}`)
      if (height) style.push(`height: ${height}`)
      if (skeletonSpace) style.push(`--skeleton-space: ${skeletonSpace}`)
      this.setData({ style: style.join(';') })
    }
  },

  lifetimes: {
    attached() {
      const items: number[] = []
      items.length = this.properties.count
      items.fill(1)
      this.setData({ items })
    }
  }
})
