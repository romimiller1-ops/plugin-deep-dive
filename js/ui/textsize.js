/* Text size buttons in the top bar: normal, medium, large.
   The size itself is applied in a11y.js (before the first paint); this module only wires the buttons. */
window.Dive = window.Dive || {};

Dive.textSizeControl = (function () {
  function render(level) {
    document.querySelectorAll(".text-size__btn").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.size === level));
    });
  }

  function init() {
    var group = document.querySelector(".text-size");
    group.addEventListener("click", function (event) {
      var button = event.target.closest(".text-size__btn");
      if (!button || button.dataset.size === Dive.textSize.get()) {
        return;
      }
      /* Keep the reader on the same paragraph: remember what sits under the top bar, and bring it back there. */
      var navBottom = document.querySelector(".site-nav").getBoundingClientRect().bottom;
      var probe = document.elementFromPoint(window.innerWidth / 2, navBottom + 24);
      var anchor = probe && window.scrollY > 0 ? probe.closest("p, li, h2, h3, fieldset, .panel, section") : null;
      var before = anchor ? anchor.getBoundingClientRect().top : 0;

      Dive.textSize.set(button.dataset.size);

      if (anchor) {
        window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - before, behavior: "instant" });
      }
      Dive.ui.announce("גודל הטקסט: " + Dive.textSize.NAMES[button.dataset.size]);
    });

    Dive.textSize.onChange(function (level) {
      render(level);
      /* Pinned scenes and drawn cables depend on measured sizes. */
      Dive.engine.measure();
      window.dispatchEvent(new Event("resize"));
    });
    render(Dive.textSize.get());
  }

  return { init: init };
})();
