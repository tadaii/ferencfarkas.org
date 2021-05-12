(function () {
  'use strict'

  var header = {
    init() {
      var ham = document.querySelector('.nav--hamburger')
      var nav = document.querySelector('header nav')

      if (!ham) return

      ham.addEventListener('click', function () {
        if (!nav) return
        nav.classList.toggle('open')
        nav.blur()
      })
    }
  }

  var footer = {
    init() {
      var ls = document.querySelector('section:last-of-type')
      var sc

      if (!ls) return
      ls.getAttribute('class').trim().split(' ')
        .forEach(function (c) {
          if (['highlight', 'focus', 'invert', 'black'].includes(c)) {
            sc = c
          }
        })

      if (!sc) return
      document.body.classList.add(sc)
    }
  }

  var download = {
    init() {
      var units = ['KB', 'MB', 'GB']
      var els = document.querySelectorAll('a.download .download--size')

      els.forEach(function (el) {
        var thousands = -1
        var bytes = parseFloat(el.getAttribute('data-bytes'))

        while (bytes > 1000) {
          bytes /= 1024
          thousands++
        }

        el.innerHTML = bytes.toFixed(1) + ' ' + units[thousands]
      })
    }
  }

  var audioPlayer = {
    wavesurfer: null,
    target: null,
    playing: null,
    player: document.querySelector('#player'),
    playerPlay: document.querySelector('#player .play'),
    playerLoading: document.querySelector('#player .player--loading'),
    trackInfo: document.querySelector('#player .player--meta'),
    close: document.querySelector('.player--close'),

    getPlayButtons() {
      return document.querySelectorAll('.play')
    },

    resetPlayButtons() {
      var play = this.getPlayButtons()

      for (var i = 0; i < play.length; i++) {
        play[i].classList.remove('playing')
      }
    },

    setMeta(title, detail) {
      this.trackInfo.querySelector('h5').innerText = title
      this.trackInfo.querySelector('p').innerText = detail
    },

    loading(message) {
      this.playerPlay.disabled = true
      this.target.disabled = true
      this.player.classList.add('loading')
      this.playerLoading.innerText = message
    },

    clearLoading() {
      this.playerPlay.disabled = false
      this.target.disabled = false
      this.playerLoading.innerText = ''
      this.player.classList.remove('loading')
    },

    togglePlay() {
      this.target.classList.toggle('playing')
      this.playerPlay.classList.toggle('playing')
    },

    play({ audio, title, detail }) {
      var metaData = this.audios[audio]

      if (metaData) {
        var url = metaData.url
        var defaultTitle = this.audios[audio].title
        var defaultDetail = this.audios[audio].detail
      } else {
        var url = '/audio/' + audio + '.mp3'
      }

      this.setMeta(title || defaultTitle, detail || defaultDetail)

      if (this.target.classList.contains('playing')) {
        this.wavesurfer.pause()
        this.togglePlay()
      } else if (this.playing === audio) {
        this.wavesurfer.play()
        this.togglePlay()
      } else {
        this.resetPlayButtons()
        this.wavesurfer.stop()
        this.wavesurfer.load(url)
        this.playing = audio
      }
    },

    closePlayer() {
      this.wavesurfer.stop()
      this.player.classList.remove('open')
      this.resetPlayButtons()
      this.playing = null
    },

    init() {
      var libLoaded = window.setInterval((function () {
        if (window.WaveSurfer) {
          window.clearInterval(libLoaded)

          this.wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'rgba(255,255,255, .35)',
            progressColor: '#83cacc',
            cursorColor: '#FAB700',
            responsive: true,
            barWidth: 2,
            height: 40,
            barHeight: 2,
            normalize: true
          })

          this.wavesurfer.on('loading', (function (percent) {
            this.loading(`Loading sound ${percent}% `)

            if (percent === 100) {
              this.loading('Loading waveform...')
            }
          }).bind(this))

          this.wavesurfer.on('ready', (function () {
            this.clearLoading()
            this.togglePlay()
            this.wavesurfer.play()
          }).bind(this))

          this.wavesurfer.on('finish', (function () {
            this.resetPlayButtons()
          }).bind(this))
        }
      }).bind(this), 500)

      window.addEventListener('play', (function (event) {
        this.target = event.detail.target === this.playerPlay
          ? document.querySelector('.play[data-audio="' + this.playing + '"]')
          : event.detail.target

        var audio = event.detail.audio || this.playing
        var title = event.detail.title
        var detail = event.detail.detail

        this.player.classList.add('open')
        this.setMeta(title, detail)

        if (!audio) {
          this.loading(`Audio file missing: "${audio}"`)
          return
        }

        if (!this.audios) {
          this.loading('Loading audio list...')

          fetch('/_catalogue/a.json')
            .then(function (response) { return response.json() })
            .then((function (json) {
              this.audios = json
              this.play({ player, audio, title, detail })
            }).bind(this))
        } else {
          this.play({ audio, title, detail })
        }
      }).bind(this))

      window.addEventListener('keydown', (function (event) {
        if (!this.playing) {
          return
        }

        if (event.key === 'Escape') {
          this.closePlayer()
        }
      }).bind(this))

      this.close.addEventListener('click', (function (event) {
        this.closePlayer()
      }).bind(this))
    }
  }

  var slider = {
    init() {
      var sliders = document.querySelectorAll('.slider')
      sliders.forEach(function (slider) {
        var toggle = slider.querySelector('.slider--fullscreen-toggle')
        var section = slider
        var i = 0

        while (section.tagName.toLowerCase() !== 'section' && i < 20) {
          section = section.parentNode
          i++
        }

        toggle.addEventListener('click', function () {
          slider.classList.toggle('fullscreen')
          section.classList.toggle('fullscreen-slider')
          document.body.classList.toggle('blocked')
        })
      })
    }
  }

  var contactForm = {
    init() {
      var form = document.querySelector('form[name="contact"]')

      if (!form) {
        return
      }

      var enquiry = form.querySelector('select[name="enquiry"]')

      if (!enquiry) {
        return
      }

      // Duplicated from webapp/src/services/qs.js
      // TODO move app.js code in webapp ES6-based project
      var qs = window.location.search
        .split(/[\?&]/)
        .filter(value => value)
        .reduce(function (params, param) {
          var kv = param.split('=')
          var key = kv[0]
          var value = kv[1]
          var values = (value && value.split(',')) || true

          if (values === true) {
            params[key] = true
          } else if (values.length === 1) {
            params[key] = decodeURIComponent(value)
          } else {
            params[key] = values.map(function (value) {
              return decodeURIComponent(value)
            })
          }

          return params
        }, {})

      if (qs && qs.publisher && typeof qs.publisher === 'string') {
        enquiry.querySelectorAll('option').forEach(function (option) {
          if (option.value === 'publisher') {
            option.selected = true
          }
        })

        var publisherInfo = document.createElement('div')
        publisherInfo.style.marginTop = '0.5rem';
        publisherInfo.innerHTML = 'Publisher ID: <strong>' + qs.publisher + '</strong>'

        enquiry.parentNode.appendChild(publisherInfo)
      }
    }
  }

  header.init()
  footer.init()
  download.init()
  audioPlayer.init()
  slider.init()
  contactForm.init()

})(window)