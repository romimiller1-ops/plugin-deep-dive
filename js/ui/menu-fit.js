/* Main menu: "fits or folds".
   The full menu is shown whenever it fits in one row of the top bar, at any text size and in either track
   (the links differ per track); only when it does not fit does it fold behind the menu button.
   Re-checked on load, when fonts finish loading, and on every resize (the text-size buttons and the
   track switch also send a resize). Phones (under 768px) always use the menu button. */
window.Dive = window.Dive || {};

Dive.navFit = (function () {
  var MIN_WIDTH = 768;
  var nav, bar, menu, links, brand, frame = null;

  function overflows(element) {
    return element.scrollWidth > element.clientWidth + 1;
  }

  function fits() {
    /* Nothing may spill out: not the bar, not the menu area (its links never wrap), not the unit name. */
    return !overflows(bar) && !overflows(menu) && !overflows(links) && !overflows(brand);
  }

  function fit() {
    frame = null;
    nav.classList.remove("navbar-expand-xxl");
    var expand = window.innerWidth >= MIN_WIDTH;
    if (expand) {
      nav.classList.add("navbar-expand");
      expand = fits();
    }
    nav.classList.toggle("navbar-expand", expand);
    if (expand) {
      /* The open-menu state belongs to the folded menu only. */
      menu.classList.remove("show");
      nav.querySelector(".navbar-toggler").setAttribute("aria-expanded", "false");
    }
  }

  function schedule() {
    if (frame === null) {
      frame = window.requestAnimationFrame(fit);
    }
  }

  function init() {
    nav = document.querySelector(".site-nav");
    bar = nav.querySelector(".site-nav__bar");
    menu = nav.querySelector("#main-menu");
    links = nav.querySelector(".site-nav__links");
    brand = nav.querySelector(".navbar-brand");
    fit();
    window.addEventListener("resize", schedule);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }
  }

  return { init: init, fit: fit };
})();
