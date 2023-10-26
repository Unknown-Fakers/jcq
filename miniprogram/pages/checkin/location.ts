import JcqPage from '../../base/JcqPage'
import { wgs84ToGcj02 } from '../../utils/geo'

JcqPage({
  data: {
    location: {
      lat: 0,
      lng: 0,
    },
    markers: [{
      id: 0,
      latitude: 0,
      longitude: 0,
      iconPath: '/asset/ic_location_mark.png',
      width: 40,
      height: 40,
      callout: {}
    }]
  },
  darkThemeStyle:{
    content: '',
    color: '#FFF',
    fontSize: 14,
    borderRadius: 15,
    borderColor: '#222222',
    bgColor: '#000',
    padding: 10,
    display: 'ALWAYS' 
  },
  lightThemeStyle:{
    content: '',
    color: '#000',
    fontSize: 14,
    borderRadius: 15,
    borderColor: '#f5f5f5',
    bgColor: '#FFF',
    padding: 10,
    display: 'ALWAYS' 
  },
  async onLoad() {
    console.log(this.data.theme)
    console.log(this.data.markers[0].callout)
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('location', (data: any) => {
      if (data.lat === 0) {
        return
      }
      const location = wgs84ToGcj02(data)
      this.lightThemeStyle.content = this.darkThemeStyle.content = data.area
      this.setData({
        location: location,
        'markers[0].latitude': location.lat,
        'markers[0].longitude': location.lng,
        'markers[0].callout.content': data.area
      })
    })
  },
  onThemeChanged(theme: Theme) {
    if(theme === 'light') {
      this.setData({ 
        'markers[0].callout': this.lightThemeStyle,
        theme
      })
    } else {
      this.setData({ 
        'markers[0].callout': this.darkThemeStyle,
        theme
      })
    }
  }
})
