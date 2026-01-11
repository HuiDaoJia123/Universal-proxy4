Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    iconPath: {
      type: String,
      value: ''
    },
    bgClass: {
      type: String,
      value: 'bg-white'
    },
    showArrow: {
      type: Boolean,
      value: true
    },
    data: {
      type: Object,
      value: null
    }
  },
  methods: {
    onCardTap() {
      // 触发一个自定义事件，将点击事件传递给父页面
      this.triggerEvent('cardtap', { data: this.properties.data });
    }
  }
});