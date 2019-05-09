import Vue from 'vue/dist/vue.esm.browser'
import DownloadLink from './components/DownloadLink'
import AudioPlayer from './components/AudioPlayer'

const app = new Vue({
  components: {
    DownloadLink,
    AudioPlayer
  }
})

app.$mount('#app')
