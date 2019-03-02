(() => {
  'use strict'

  const Header  =  {
    _navOpenClass: 'is-nav-open',
    _subNavOpenClass: 'is-subnav-open',
    _el: null,
    _hamburgerEl: null,

    _getEl() {
      if (!this._el) {
        this._el = document.querySelector('.Header')
      }
      return this._el
    },

    _getHamburgerEl() {
      if (!this._hamburgerEl) {
        this._hamburgerEl = document.querySelector('.Header .Header-hamburger')
      }
      return this._hamburgerEl
    },

    init() {
      this._getHamburgerEl().addEventListener("click", this, false)

      if (Nav.hasSelectedNav()) {
        this.toggleSubNav()
      }
    },

    handleEvent(e) {
      switch(e.type) {
        case "click":
        case "touchstart":
          this.toggleNav(e)
          break
      }
    },

    isNavOpen() {
      return this._getEl().classList.contains(this._navOpenClass)
    },

    isSubNavOpen() {
      return this._getEl().classList.contains(this._subNavOpenClass)
    },

    toggleNav(e) {
      const el = this._getEl()

      el.classList.toggle(this._navOpenClass)

      if (!this.isNavOpen()) {
        el.classList.remove(this._subNavOpenClass)
        Nav.unselectAll()
      }

      e.preventDefault()
    },

    toggleSubNav() {
      const el = this._getEl()

      el.classList.toggle(this._subNavOpenClass)

      if (this.isSubNavOpen()) {
        el.classList.add(this._navOpenClass)
      }
    }
  }

  const Nav = {
    _navItems: null,
    _openClass: 'is-open',
    _selectedClass: 'is-selected',

    _getOpenedNavItem() {
      const self = this;
      return this._getNavItems().filter((item) => {
        return item.classList.contains(self._openClass)
      })[0]
    },

    _getNavItem(el) {
      return el.parentNode
    },

    _getNavItems() {
      if (!this._navItems) {
        this._navItems = [].slice.call(document.querySelectorAll('.Header nav li'))
      }
      return this._navItems
    },

    _hasSubNav(navItem) {
      return !!navItem.querySelector('ul')
    },

    init() {
      const self = this

      this._getNavItems().forEach((el) => {
        el.querySelector('a').addEventListener("click", self, false)
      })
    },

    handleEvent(e) {
      switch(e.type) {
        case "click":
        case "touchstart":
          this.toggleSubNav(e)
          break
      }
    },

    toggleSubNav(e) {
      var navItem = this._getNavItem(e.target)
      var openedItem = this._getOpenedNavItem()

      this.unselectAll(navItem)

      if (this._hasSubNav(navItem)) {
        if (!Header.isSubNavOpen() || openedItem === navItem) {
          Header.toggleSubNav()
        }

        if (navItem.classList.contains(this._openClass)) {
          const subnav = navItem.querySelector('.Header-subnav-wrapper')
          const duration = 1000 * parseFloat(
            window.getComputedStyle(subnav)['transition-duration'])

          window.setTimeout(() => {
            navItem.classList.toggle(this._openClass)
          }, duration)
        } else {
          navItem.classList.toggle(this._openClass)
        }

        e.preventDefault()
      }
    },

    unselectAll(exceptedEl) {
      this._getNavItems().forEach((el) => {
        if (!exceptedEl || exceptedEl !== el) {
          el.classList.remove(this._openClass)
        }
      })
    },

    hasSelectedNav() {
      return this._getNavItems().filter((el) => {
        return el.classList.contains(this._selectedClass)
      }).length > 0
    }
  }

  const Footer = {
    init() {
      const lastSection = document.querySelector('section:last-of-type')
      var sectionClass

      if (lastSection) {
        sectionClass = lastSection.getAttribute('class').replace('Section', '').trim()
      }
      
      if (sectionClass) {
        document.body.classList.add(sectionClass)
      }
    }
  }

  Footer.init()
  Header.init()
  Nav.init()

})(window)
