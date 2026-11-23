/* Scroll engine: turns native scroll position into CSS variables.
   All visual movement lives in main.css; this file only supplies the numbers. */
window.Dive = window.Dive || {};

Dive.engine = (function () {
  var MAX_DEPTH = 100;

  /* Water colours by depth: [depth, top colour, bottom colour] */
  var WATER_STOPS = [
    [0, [97, 189, 175], [38, 183, 205]],
    [25, [38, 183, 205], [51, 138, 202]],
    [50, [51, 138, 202], [43, 44, 104]],
    [75, [43, 44, 104], [25, 24, 52]],
    [100, [25, 24, 52], [16, 15, 36]]
  ];

  var root = document.documentElement;
  var scenes = [];
  var waypoints = [];
  var viewportHeight = window.innerHeight;
  var maxScroll = 1;
  var frameRequested = false;
  var previousY = window.scrollY;

  var hudDepth = document.getElementById("hud-depth");
  var hudPath = document.getElementById("hud-path");
  var hud = document.querySelector(".depth-hud");
  var shownDepth = null;
  var shownPath = null;

  /* Navigation: the menu item of the section in view is highlighted. */
  var navLinks = document.querySelectorAll("[data-nav]");
  var navSections = [];
  var shownSection = null;

  var state = { depth: 0, velocity: 0, ascending: false, offset: 0 };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mixChannel(a, b, amount) {
    return Math.round(a + (b - a) * amount);
  }

  function mixColor(a, b, amount) {
    return "rgb(" + mixChannel(a[0], b[0], amount) + " " + mixChannel(a[1], b[1], amount) + " " + mixChannel(a[2], b[2], amount) + ")";
  }

  function pageTop(element) {
    return element.getBoundingClientRect().top + window.scrollY;
  }

  function measure() {
    viewportHeight = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);

    scenes = Array.prototype.map.call(document.querySelectorAll("[data-scene]"), function (element) {
      return {
        element: element,
        top: pageTop(element),
        height: element.offsetHeight,
        pinned: element.hasAttribute("data-pinned"),
        last: -1
      };
    });

    /* Only what is on the page counts: sections of the other track are hidden and skipped. */
    waypoints = Array.prototype.filter.call(document.querySelectorAll("[data-depth]"), function (element) {
      return element.getClientRects().length > 0;
    }).map(function (element) {
      return {
        y: Math.max(0, pageTop(element) + element.offsetHeight / 2 - viewportHeight / 2),
        depth: Number(element.dataset.depth),
        path: element.dataset.path || "",
        ascent: element.hasAttribute("data-ascent")
      };
    }).sort(function (a, b) {
      return a.y - b.y;
    });

    /* Sections hidden by the other track do not count. A section may serve several menu items ("what-is-plugin example"). */
    navSections = Array.prototype.filter.call(document.querySelectorAll("[data-nav-section]"), function (element) {
      return element.offsetParent !== null || element.getClientRects().length > 0;
    }).map(function (element) {
      return { ids: element.dataset.navSection.split(" "), top: pageTop(element) };
    });

    shownSection = undefined;
    update();
  }

  function updateNav(y) {
    var line = y + viewportHeight * 0.35;
    var current = null;
    navSections.forEach(function (section) {
      if (section.top <= line) {
        current = section.ids;
      }
    });
    var key = current ? current.join(" ") : null;
    if (key === shownSection) {
      return;
    }
    shownSection = key;
    /* The form sits on a white background: the gauge switches to blue there. */
    if (hud) {
      hud.classList.toggle("is-light", key === "logbook");
    }
    navLinks.forEach(function (link) {
      var on = Boolean(current) && current.indexOf(link.dataset.nav) !== -1 && link.offsetParent !== null;
      link.classList.toggle("active", on);
      if (on) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function depthAt(y) {
    if (!waypoints.length) {
      return { depth: 0, path: "", ascent: false };
    }
    var previous = waypoints[0];
    for (var index = 1; index < waypoints.length; index += 1) {
      var next = waypoints[index];
      if (y < next.y) {
        var span = Math.max(1, next.y - previous.y);
        var amount = clamp((y - previous.y) / span, 0, 1);
        return {
          depth: previous.depth + (next.depth - previous.depth) * amount,
          path: previous.path,
          ascent: next.ascent
        };
      }
      previous = next;
    }
    return { depth: previous.depth, path: previous.path, ascent: previous.ascent };
  }

  function paintWater(depth) {
    var lower = WATER_STOPS[0];
    var upper = WATER_STOPS[WATER_STOPS.length - 1];
    for (var index = 0; index < WATER_STOPS.length - 1; index += 1) {
      if (depth >= WATER_STOPS[index][0] && depth <= WATER_STOPS[index + 1][0]) {
        lower = WATER_STOPS[index];
        upper = WATER_STOPS[index + 1];
        break;
      }
    }
    var amount = clamp((depth - lower[0]) / Math.max(1, upper[0] - lower[0]), 0, 1);
    root.style.setProperty("--water-top", mixColor(lower[1], upper[1], amount));
    root.style.setProperty("--water-bottom", mixColor(lower[2], upper[2], amount));
  }

  function updateHud(depth, path) {
    var rounded = Math.round(depth);
    if (hudDepth && rounded !== shownDepth) {
      shownDepth = rounded;
      hudDepth.textContent = String(rounded);
    }
    if (hudPath && path !== shownPath) {
      shownPath = path;
      hudPath.textContent = path;
    }
  }

  function updateScenes(y) {
    scenes.forEach(function (scene) {
      var progress = scene.pinned
        ? (y - scene.top) / Math.max(1, scene.height - viewportHeight)
        : (y + viewportHeight - scene.top) / Math.max(1, scene.height + viewportHeight);
      progress = clamp(progress, 0, 1);

      if (Math.abs(progress - scene.last) < 0.001) {
        return;
      }
      scene.last = progress;
      scene.element.style.setProperty("--p", progress.toFixed(4));
      scene.element.style.setProperty("--pe", (progress * progress * progress).toFixed(4));
    });
  }

  function update() {
    frameRequested = false;
    var y = window.scrollY;
    var position = depthAt(y);

    state.velocity = y - previousY;
    state.offset += position.ascent ? -state.velocity : state.velocity;
    state.depth = position.depth;
    state.ascending = position.ascent;
    previousY = y;

    root.style.setProperty("--progress", clamp(y / maxScroll, 0, 1).toFixed(4));
    root.style.setProperty("--depth-ratio", clamp(position.depth / MAX_DEPTH, 0, 1).toFixed(4));
    paintWater(position.depth);
    updateHud(position.depth, position.path);
    if (hud) {
      hud.classList.toggle("is-ascending", position.ascent);
    }
    updateNav(y);
    updateScenes(y);
  }

  function requestUpdate() {
    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(update);
    }
  }

  function init() {
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", measure);
    /* Re-measure on the next frame, not inside the observer callback: measuring there can change the layout
       again and makes the browser report a "ResizeObserver loop" error. */
    if ("ResizeObserver" in window) {
      var pending = false;
      new ResizeObserver(function () {
        if (!pending) {
          pending = true;
          window.requestAnimationFrame(function () {
            pending = false;
            measure();
          });
        }
      }).observe(document.body);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
    measure();
  }

  return { init: init, state: state, measure: measure };
})();
