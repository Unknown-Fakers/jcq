import { ThemedComponentWithComputed } from '../../base/JcqPage'
import { wgs84ToGcj02 } from '../../utils/geo'

ThemedComponentWithComputed({
  data: {
    centerLocation: {
      lat: 0,
      lng: 0,
    },
    markers: [],
    latitudes: [],
    longitudes: [],
    index: undefined as number | undefined,
    course: '',
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
      let result: ApiResponse<CheckinResult> | undefined
      try {
        result = (await wx.cloud.callFunction({
          name: 'icq',
          data: {
            $url: 'locations',
            course: this.data.course,
            index: this.data.index
          }
        })).result as ApiResponse<CheckinResult>
      } catch (err) {
        wx.showToast({ icon: 'error', title: '获取失败' })
        return
      }
      if (result?.code !== 0) {
        wx.showToast({ icon: 'error', title: '服务器未响应' })
        return
      } else if (result?.code === 0 && !result?.data) {
        wx.showToast({ icon: 'error', title: '无任何位置信息' })
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
    }
  }
})
