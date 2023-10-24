import JcqPage from '../../base/JcqPage'

const app = getApp<IAppOption>()
const cloud = app.cloud!() as WxCloud
const db = cloud.database()

JcqPage({
  data: {
    student: {
      name: '',
      number: ''
    },
    agreed: false,
    isFocusToStudentNumber: false,
    formRules: [
      { name: 'name', rules: [{ required: true, message: '请输入姓名' }, { minlength: 2, message: '姓名至少 2 位字符' }] },
      { name: 'number', rules: [{ required: true, message: '请输入学号' }, { rangelength: [10, 10], message: '学号长度为 10 位' }] }
    ],
    error: ''
  },

  // onAgreementsChanged(e) {
  //   this.setData({ agreed: e.detail.value.length !== 0 })
  // },

  focusToStudentNumber() {
    this.setData({ isFocusToStudentNumber: true })
  },

  onFormInput(e: WechatMiniprogram.Input) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`student.${field}`]: e.detail.value })
  },

  submit() {
    this.selectComponent('#form').validate((valid: boolean, errors: Record<string, any>) => {
      if (valid) {
        wx.showLoading({
          title: '尝试绑定中',
          mask: true
        })
        cloud.callFunction({
          name: 'registe',
          data: {
            $url: 'bind',
            ...this.data.student
          }
        })
          .then((res) => {
            switch ((res.result as any).code) {
              case 0:
                this.fetchUserDetailAndGotoIndex((res.result as any).data)
                break
              case 2:
                wx.showModal({
                  title: '绑定失败',
                  content: '您输入的学生信息已被他人绑定，如需帮助请联系管理员。',
                  showCancel: false
                })
                break
              default:
                wx.showModal({
                  title: '绑定失败',
                  content: '请确保输入的学生信息准确无误且本学期完成了签到操作。',
                  showCancel: false
                })
            }
          })
          .catch((err) => console.error(err))
          .finally(() => wx.hideLoading())
        return
      }

      const firstError = Object.keys(errors)
      if (firstError.length) {
        this.setData({ error: errors[firstError[0]].message })
      }
    })
  },

  fetchUserDetailAndGotoIndex(openid : string) {
    db.collection('users').where({ _openid: openid }).get()
      .then((res) => {
        if (res.data.length !== 0) {
          app.globalData.openid = openid
          app.globalData.user = res.data[0]
          wx.switchTab({
            url: '/pages/index/index'
          })
        } else {
          console.error(`无 OPENID 为 ${openid} 的用户存在于数据库中`)
        }
      })
      .catch((err) => console.error(err))
  }
})
