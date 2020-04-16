(() => {
  'use strict'

  var wavesurfer
  var playing

  var header = {
    init () {
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
    init () {
      var ls = document.querySelector('section:last-of-type')
      var sc

      if (!ls) return
      sc = ls.getAttribute('class').trim()

      if (!sc) return
      document.body.classList.add(sc)
    }
  }

  var audioPlayer = {
    init () {
      var libLoaded = window.setInterval(function () {
        if (window.WaveSurfer) {
          window.clearInterval(libLoaded)

          wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'rgba(255,255,255, .35)',
            progressColor: '#83cacc',
            cursorColor: '#FAB700',
            responsive: true,
            barWidth: 2,
            height: 40,
            barHeight: 2
          })

          wavesurfer.on('ready', function () {
            wavesurfer.play()
          })

          wavesurfer.on('finish', function () {
            var play = document.querySelectorAll('.play')
            for (var i = 0; i < play.length; i++) {
              play[i].classList.remove('playing')
            }
          })
        }
      }, 500)

      var play = document.querySelectorAll('.play')

      if (!play) return

      for (var i = 0; i < play.length; i++) {
        play[i].addEventListener('click', function (event) {
          var player = document.querySelector('#player')
          var playerPlay = document.querySelector('#player .play')
          var el = event.target === playerPlay
            ? document.querySelector('.play[data-url="'+playing+'"]')
            : event.target

          var url = el.getAttribute('data-url')

          if (!url) return

          player.classList.add('open')

          if (el.classList.contains('playing')) {
            wavesurfer.pause()
          } else if (playing === url) {
            wavesurfer.play()
          } else {
            for (var j = 0; j < play.length; j++) {
              play[j].classList.remove('playing')
            }
            wavesurfer.stop()
            wavesurfer.load(url)
            playing = url
          }

          el.classList.toggle('playing')
          playerPlay.classList.toggle('playing')
        })
      }
    }
  }

  header.init()
  footer.init()
  audioPlayer.init()

})(window)