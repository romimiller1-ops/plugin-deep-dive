/* Tooltips for the icon buttons in the top bar (WCAG 1.4.13: content on hover or focus).
   - Opens when the button gets keyboard focus (Tab) or the mouse rests on it; closes when Tab moves on
     or the mouse leaves both the button and the tooltip.
   - Hoverable: the pointer can move onto the tooltip without it closing, so its text can be selected and copied.
   - Dismissable: Escape closes it without moving focus.
   - Persistent: it stays until one of the above happens.
   The button's name is in aria-label, so the tooltip is hidden from screen readers to avoid reading it twice. */
window.Dive = window.Dive || {};

Dive.tooltip = (function () {
  var HIDE_DELAY = 150;

  function setup(button) {
    var wrap = document.createElement("span");
    wrap.className = "tip-wrap";
    button.parentNode.insertBefore(wrap, button);
    wrap.appendChild(button);

    var tip = document.createElement("span");
    tip.className = "tip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    tip.textContent = button.dataset.tip;
    wrap.appendChild(tip);

    var timer = null;
    var hovering = false;
    var focused = false;

    function show() {
      window.clearTimeout(timer);
      tip.textContent = button.dataset.tip;
      wrap.classList.add("is-tip-open");
    }

    function hideSoon() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        if (!hovering && !focused) {
          wrap.classList.remove("is-tip-open");
        }
      }, HIDE_DELAY);
    }

    wrap.addEventListener("mouseenter", function () {
      hovering = true;
      show();
    });
    wrap.addEventListener("mouseleave", function () {
      hovering = false;
      hideSoon();
    });
    /* Keyboard focus only: a mouse click does not leave a tooltip stuck on the screen. */
    button.addEventListener("focus", function () {
      if (button.matches(":focus-visible")) {
        focused = true;
        show();
      }
    });
    button.addEventListener("blur", function () {
      focused = false;
      hideSoon();
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && wrap.classList.contains("is-tip-open")) {
        event.stopPropagation();
        wrap.classList.remove("is-tip-open");
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-tip]").forEach(setup);
    /* Escape also closes a tooltip opened by the mouse, wherever focus is. */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.querySelectorAll(".tip-wrap.is-tip-open").forEach(function (wrap) {
          wrap.classList.remove("is-tip-open");
        });
      }
    });
  }

  /* The pause button's label changes; the visible tooltip follows it. */
  function refresh(button) {
    var wrap = button.closest(".tip-wrap");
    if (wrap) {
      wrap.querySelector(".tip").textContent = button.dataset.tip;
    }
  }

  return { init: init, refresh: refresh };
})();
