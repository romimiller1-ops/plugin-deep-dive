/* Glossary: a short plain-language explanation that opens right next to a term (a "toggletip"),
   plus the full list in a side panel. Opens on click, tap, Enter or Space; never on hover alone,
   so it works the same with a mouse, a keyboard and a finger. Esc or a click elsewhere closes it. */
window.Dive = window.Dive || {};

Dive.glossary = (function () {
  var data = Dive.content;
  var ui = Dive.ui;
  var open = null;
  var counter = 0;

  function entry(id) {
    return ui.byId(data.glossary, id);
  }

  function build(holder) {
    var item = entry(holder.dataset.term);
    if (!item) {
      return;
    }
    counter += 1;
    var tipId = "term-tip-" + counter;
    var wrap = document.createElement("span");
    wrap.className = "term";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "term__btn";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", tipId);
    button.innerHTML = holder.innerHTML + ui.icon("info-circle").replace('class="bi"', 'class="bi term__icon"') +
      '<span class="visually-hidden">, הסבר המונח</span>';

    var tip = document.createElement("span");
    tip.className = "term__tip";
    tip.id = tipId;
    tip.hidden = true;
    tip.innerHTML = '<span class="term__tip-text"><strong>' + item.term + ":</strong> " + item.def + "</span>" +
      '<button type="button" class="term__close" aria-label="סגירת ההסבר על ' + item.term.replace(/\s*\(.*\)/, "") + '">' + ui.icon("x-circle") + "</button>";

    wrap.appendChild(button);
    wrap.appendChild(tip);
    holder.replaceWith(wrap);
  }

  /* Keeps the bubble inside the screen: shift it sideways if it would cross an edge. */
  function place(tip) {
    tip.style.setProperty("--shift", "0px");
    var box = tip.getBoundingClientRect();
    var margin = 12;
    var shift = 0;
    if (box.left < margin) {
      shift = margin - box.left;
    } else if (box.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - box.right;
    }
    tip.style.setProperty("--shift", shift + "px");
  }

  function close(returnFocus) {
    if (!open) {
      return;
    }
    var current = open;
    open = null;
    current.button.setAttribute("aria-expanded", "false");
    current.tip.hidden = true;
    current.wrap.classList.remove("is-open");
    if (returnFocus) {
      current.button.focus();
    }
  }

  function toggle(button) {
    var wrap = button.closest(".term");
    var tip = wrap.querySelector(".term__tip");
    var wasOpen = open && open.button === button;
    close(false);
    if (wasOpen) {
      return;
    }
    open = { button: button, tip: tip, wrap: wrap };
    button.setAttribute("aria-expanded", "true");
    tip.hidden = false;
    wrap.classList.add("is-open");
    place(tip);
    ui.announce(tip.querySelector(".term__tip-text").textContent);
  }

  function fillList() {
    document.getElementById("glossary-list").innerHTML = data.glossary.map(function (item) {
      return "<div><dt>" + item.term + "</dt><dd>" + item.def + "</dd></div>";
    }).join("");
  }

  function init() {
    document.querySelectorAll("[data-term]").forEach(build);
    fillList();

    document.addEventListener("click", function (event) {
      var termButton = event.target.closest(".term__btn");
      var closeButton = event.target.closest(".term__close");
      if (termButton) {
        toggle(termButton);
      } else if (closeButton) {
        close(true);
      } else if (open && !event.target.closest(".term__tip")) {
        close(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        close(true);
      }
    });

    /* Tab out of the term and its bubble closes it. A click on the bubble's own text (to select or copy it)
       moves focus nowhere (relatedTarget is null), so it stays open. */
    document.addEventListener("focusout", function (event) {
      if (!open || !open.wrap.contains(event.target)) {
        return;
      }
      var next = event.relatedTarget;
      if (next && !open.wrap.contains(next)) {
        close(false);
      }
    });

    window.addEventListener("resize", function () {
      if (open) {
        place(open.tip);
      }
    });
  }

  return { init: init };
})();
