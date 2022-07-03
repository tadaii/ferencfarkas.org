let refine, inner, list

export function initScrollBehaviors(app) {
  setTimeout(() => {
    refine = app.querySelector('.refine--wrapper')
    inner = app.querySelector('.refine--inner')
    list = app.querySelector('.works--list')
  }, 200)

  window.addEventListener('scroll', stickRefinePanel)
  window.addEventListener('resize', stickRefinePanel)
}

function stickRefinePanel() {
  if (!refine || !list || !inner) {
    return
  }

  const innerC = inner.getBoundingClientRect()
  const listC = list.getBoundingClientRect()

  if (listC.top > 0) {
    refine.classList.remove('sticked')
    refine.classList.remove('scrolled')
  } else {
    if (listC.bottom >= innerC.height) {
      refine.classList.add('sticked')
      refine.classList.remove('scrolled')
    } else {
      refine.classList.add('scrolled')
      refine.classList.remove('sticked')
    }
  }
}

export function scrollToTop(works) {
  if (!list) {
    return
  }

  window.setTimeout(() => {
    list.parentNode.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}
