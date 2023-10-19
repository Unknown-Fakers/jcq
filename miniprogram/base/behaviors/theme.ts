export default Behavior({
  data: {
    theme: 'light' as Theme
  },
  methods: {
    onThemeChanged(theme: Theme) {
      this.setData({ theme })
    }
  }
})
