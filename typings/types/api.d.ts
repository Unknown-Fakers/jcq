declare interface Course {
  id: number
  number: string
  name: string
  teacher: { number: string, name: string }
  compositions?: string[]
  days_of_week?: number[]
  in_this_week?: boolean[]
  today?: boolean[]
  detail: string[]

  topped?: boolean
}

declare interface Batch extends DB.IDocumentData {
  name: string
  courses: string[]
}

declare interface User extends DB.IDocumentData {
  student_number?: string
  batches?: Batch[]
}

declare interface ApiResponse<T> {
  code: number
  data?: T
}

declare interface CheckinResult {
  succeed: number
  failed: { student_number: string, code: string }[]
}
