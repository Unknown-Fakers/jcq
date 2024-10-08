import { ThemedComponentWithComputed } from '../../base/JcqPage'
import { wgs84ToGcj02 } from '../../utils/geo'

const { shared } = wx.worklet

const { windowHeight, statusBarHeight } = wx.getSystemInfoSync()
const sheetHeight = windowHeight - statusBarHeight - 44

ThemedComponentWithComputed({
  data: {
    noLocationData: false,
    fixFullscreenRoster: true,
    centerLocation: { lat: 0, lng: 0 },
    markers: [] as any[],
    latitudes: [],
    longitudes: [],
    mapScale: 18,
    index: undefined as number | undefined,
    course: '',
    currentMarkerId: null as number | null,
    backToTop: false,
    sheetHeight
  },

  lifetimes: {
    attached() {
      const progress = shared(0)
      // @ts-ignore
      this.applyAnimatedStyle('.indicator', () => {
        'worklet'
        return { height: 16 - progress.value * 12 + 'px', borderRadius: 12 - progress.value * 10 + 'px' }
      })
      // @ts-ignore
      this.applyAnimatedStyle('.bar', () => {
        'worklet'
        const radius = (progress.value * 14) + 'px'
        return { borderTopLeftRadius: radius, borderTopRightRadius: radius }
      })
      // @ts-ignore
      this.applyAnimatedStyle('.arrow', () => {
        'worklet'
        const opacity = 1 - progress.value * 5
        return { opacity: opacity > 0 ? opacity : 0 }
      })
      // @ts-ignore
      this.progress = progress

      // @ts-ignore
      this.mapScale = shared(18)

      const query = this.createSelectorQuery()
      query.select('.roster').node()
      query.exec((res) => {
        if (!res) return
        if (res[0] && res[0].node) {
          // @ts-ignore
          this.roster = res[0].node
        }
      })
    }
  },

  methods: {
    async onLoad(options: Record<string, string | undefined>) {
      if (!options.index) {
        wx.showToast({ icon: 'error', title: '获取位置失败' })
        return
      }
      this.setData({ index: parseInt(options.index, 10), course: options.course })
      this.getLocation()
    },

    async getLocation() {
      wx.showLoading({ title: '加载中', mask: true })
      let result: ApiResponse<any> | undefined
      try {
        result = (await wx.cloud.callFunction({
          name: 'icq',
          data: {
            $url: 'locations',
            course: this.data.course,
            index: this.data.index
          }
        })).result as ApiResponse<any>
      } catch (err) {
        wx.showToast({ icon: 'error', title: '获取失败' })
        return
      } finally {
        wx.hideLoading()
      }
      if (result?.code !== 0) {
        wx.showToast({ icon: 'error', title: '服务器未响应' })
        return
      } else if (result?.code === 0 && (!result?.data || result?.data?.length === 0)) {
        // @ts-ignore
        this.clearAnimatedStyle('.indicator', [])
        // @ts-ignore
        this.clearAnimatedStyle('.arrow', [])
        this.setData({ noLocationData: true, fixFullscreenRoster: true })
      } else {
        const locationData: any = result?.data
        console.log(locationData)
        locationData.markers = []
        const latitudes = [], longitudes = []
        for (let i = 0; i < locationData.length; i++) {
          const locationPoint = wgs84ToGcj02(locationData[i].location)
          latitudes.push(locationPoint.lat)   // 用于计算中心点
          longitudes.push(locationPoint.lng)
          locationData.markers.push({
            id: i,
            latitude: locationPoint.lat,
            longitude: locationPoint.lng,
            iconPath: '/asset/ic_location_mark.png',
            width: 40,
            height: 40,
            title: locationData[i].name
          })
        }

        this.setData({
          markers: locationData.markers,
          centerLocation: {
            lat: latitudes[Math.floor(latitudes.length / 2)],  // 用取中位数法计算中心点
            lng: longitudes[Math.floor(longitudes.length / 2)]
          },
          fixFullscreenRoster: false
        }, () => {
          // @ts-ignore
          this.roster.scrollTo({ size: 0.4 })
        })
        console.log(this.data.markers)

        this.getMapContext()
      }
    },

    onSheetSizeUpdate(e: { pixels: number, size: number }) {
      'worklet'
      const distance = sheetHeight - e.pixels;
      (this as any).progress.value = distance >= 20 ? 1 : distance / 20

      const mapScale = e.size <= 0.3 ? 16 : 18
      // @ts-ignore
      if (this.mapScale.value !== mapScale) {
        wx.worklet.runOnJS(this.setMapScale.bind(this))(mapScale)
      }
    },

    collapseRosterSheet() {
      // @ts-ignore
      if (this.progress.value === 0) {
        this.setData({ backToTop: true })
        // @ts-ignore
        this.roster.scrollTo({ size: 0.2, duration: 500 })
      }
    },

    onMarkerTap(e: WechatMiniprogram.MarkerTap) {
      this.setData({ currentMarkerId: e.detail.markerId, ...this.getShowHideMarkerCalloutData(e.detail.markerId) })
    },

    locateToStudent(e: WechatMiniprogram.TouchEvent) {
      const markerId = e.currentTarget.dataset.markerId
      const marker = this.data.markers[markerId]
      // @ts-ignore
      this.getMapContext().then((map: WechatMiniprogram.MapContext) => {
        map.moveToLocation({ longitude: marker.longitude, latitude: marker.latitude })
      })
      // @ts-ignore
      this.roster.scrollTo({ size: 0.4 })
      this.setData({ currentMarkerId: markerId, backToTop: true, ...this.getShowHideMarkerCalloutData(markerId) })
    },

    getShowHideMarkerCalloutData(markerId: number) {
      const currentMarkerCallout = {
        content: this.data.markers[markerId].title,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#ccc',
        bgColor: '#fff',
        padding: 5,
        display: 'ALWAYS',
      }
      if (this.data.currentMarkerId !== null) {
        return {
          [`markers[${this.data.currentMarkerId}].callout`]: {},
          [`markers[${markerId}].callout`]: currentMarkerCallout
        }
      } else {
        return { [`markers[${markerId}].callout`]: currentMarkerCallout }
      }
    },

    setMapScale(scale: number) {
      // @ts-ignore
      this.mapScale.value = scale
      this.getMapContext().then((map: WechatMiniprogram.MapContext) => {
        map.getScale({
          success: (s) => {
            if ((scale <= 16 && s.scale > 16) || (scale >= 18 && s.scale < 18)) {
              map.getCenterLocation({
                success: (res) => {
                  this.setData({ mapScale: scale, centerLocation: { lat: res.latitude, lng: res.longitude } })
                }
              })
            }
          }
        })
      })
    },

    getMapContext(): Promise<WechatMiniprogram.MapContext> {
      // @ts-ignore
      if (this.map) return Promise.resolve(this.map)

      return new Promise((resolve) => {
        const query = this.createSelectorQuery()
        query.select('#map').context().exec((res) => {
          if (res && res[0] && res[0].context) {
            // @ts-ignore
            this.map = res[0].context
            // @ts-ignore
            resolve(this.map)
          }
        })
      })
    }
  }
})
