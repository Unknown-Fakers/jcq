const A = 6378245.0  // 椭球体长半轴（赤道半径）
const EE = 0.006693421622965943  // 椭球体第一偏心率的平方

function isWgs84OutOfChina(geo: Geo) {
  return geo.lng < 72.004 || geo.lng > 137.8347 || geo.lat < 0.8293 || geo.lat > 55.8271
}

function transformLatitude(x: number, y: number) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLongitude(x: number, y: number) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0
  return ret
}

export interface Geo {
  lat: number
  lng: number
}

/**
 * 坐标系 WGS84 转 GCJ02。
 */
export function wgs84ToGcj02(geo: Geo): Geo {
  const { lat, lng } = geo
  if (isWgs84OutOfChina({ lat, lng })) return { lat, lng }

  const dLat = transformLatitude(lng - 105, lat - 35)
  const dLng = transformLongitude(lng - 105, lat - 35)
  const radLat = lat / 180 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  return {
    lat: lat + (dLat * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * Math.PI),
    lng: lng + (dLng * 180) / (A / sqrtMagic * Math.cos(radLat) * Math.PI)
  }
}
