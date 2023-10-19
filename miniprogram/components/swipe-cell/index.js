Component({
  options: {
    multipleSlots: true,
    pureDataPattern: /^_/
  },

  properties: {
    showDefaultDelete: {
      type: Boolean,
      value: true
    }
  },

  data: {
    _correctOffsetLeft: 0,
    _correctOffsetRight: 0,

    _startX: 0,
    _currentX: 0,
    _offsetX: 0,

    animation: {}
  },

  lifetimes: {
    attached() {
      this.initialize()
    }
  },

  methods: {
    initialize() {
      const query = this.createSelectorQuery()
      query.select('.swipe-actions-menu__right-content').boundingClientRect((rect) => {
        if (rect) {
          this.setData({ _correctOffsetRight: rect.width })
        }
      }).exec()
      query.select('.swipe-actions-menu__left-content').boundingClientRect((rect) => {
        if (rect) {
          this.setData({ _correctOffsetLeft: rect.width })
        }
      }).exec()
    },
    onTouchStart(e) {
      if (e.touches.length === 1) {
        this.setData({
          _startX: e.touches[0].clientX,
          _currentX: e.touches[0].clientX
        })
      }
    },
    onTouchMove(e) {
      if (e.touches.length !== 1) return

      // 手指起始位置与移动期间的差值
      const moveX = this.data._currentX - e.touches[0].clientX

      let offsetX = this.data._offsetX
      if (moveX > 0) {  // 左滑
        if (this.data._offsetX - moveX < -this.data._correctOffsetRight) {
          offsetX = -this.data._correctOffsetRight
        } else {
          offsetX = this.data._offsetX - moveX
        }
      } else if (moveX < 0) {  // 右滑
        if (this.data._offsetX - moveX > this.data._correctOffsetLeft) {
          offsetX = this.data._correctOffsetLeft
        } else {
          offsetX = this.data._offsetX - moveX
        }
      }

      this.setData({ _currentX: e.touches[0].clientX, _offsetX: offsetX })
      this.translateSwipeContentX(offsetX, 0)
    },
    onTouchEnd(e) {
      if (e.changedTouches.length !== 1) return

      const offsetX = this.data._startX - e.changedTouches[0].clientX
      if (offsetX >= this.data._correctOffsetRight / 2) {  // 左滑一半及以上
        this.setData({ _offsetX: -this.data._correctOffsetRight })
      } else if (offsetX <= -this.data._correctOffsetLeft / 2) {  // 右滑一半及以上
        this.setData({ _offsetX: this.data._correctOffsetLeft })
      } else {
        this.setData({ _offsetX: 0 })
      }

      this.translateSwipeContentX(this.data._offsetX, 200)
    },

    /**
     * 水平方向平移 .swipe-content。
     * @param {number} x 平移距离
     * @param {number} duration 动画时长
     */
    translateSwipeContentX(x, duration) {
      const animation = wx.createAnimation({ duration })
      animation.translateX(x).step()
      this.setData({ animation: animation.export() })
    },

    delete() {
      this.triggerEvent('delete')
    }
  }
})