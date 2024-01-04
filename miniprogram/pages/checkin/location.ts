import { ThemedComponentWithComputed } from '../../base/JcqPage'
import { wgs84ToGcj02 } from '../../utils/geo'

const { shared } = wx.worklet

const { windowHeight, statusBarHeight } = wx.getSystemInfoSync()
const sheetHeight = windowHeight - statusBarHeight - 44

ThemedComponentWithComputed({
  data: {
    noLocationData: false,
    centerLocation: {
      lat: 0,
      lng: 0,
    },
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
    async attached() {
      const progress = shared(1)
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
      query.select('#map').context()
      query.exec((res) => {
        console.log(res)
        if (!res) return
        if (res[0] && res[0].node) {
          // @ts-ignore
          this.roster = res[0].node
        }
        if (res[1] && res[1].context) {
          // @ts-ignore
          this.map = res[1].context
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
      }
      if (result?.code !== 0) {
        wx.showToast({ icon: 'error', title: '服务器未响应' })
        return
      } else if (result?.code === 0 && (!result?.data || result?.data?.length === 0)) {
        this.setData({ noLocationData: true })
        // @ts-ignore
        this.roster.scrollTo({ size: 1.0, duration: 500 })
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
            title: locationData[i].name,
            callout: {
              content: locationData[i].name,
              display: 'BYCLICK'
            }
          })
        }

        this.setData({
          markers: locationData.markers,
          centerLocation: {
            lat: latitudes[Math.floor(latitudes.length / 2)],  // 用取中位数法计算中心点
            lng: longitudes[Math.floor(longitudes.length / 2)]
          }
        })
        console.log(this.data.markers)
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
      this.map.moveToLocation({ ...marker })
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
      this.setData({ mapScale: scale })
    }
  }
})
