/* Learner preferences that must be in place before the first paint:
   motion and text size.
   Loaded synchronously in <head>, so the page never jumps from one size to another. */
window.Dive = window.Dive || {};

document.documentElement.classList.add("js");

/* Small preference store. localStorage keeps a choice in this browser;
   inside an LMS, lms-connection.js also mirrors it to cmi.suspend_data through onSave. */
Dive.prefs = (function () {
  var PREFIX = "dive-";
  var listeners = [];

  function read(key) {
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(PREFIX + key);
      } else {
        window.localStorage.setItem(PREFIX + key, String(value));
      }
    } catch (error) {
      /* Storage can be blocked; the choice then lasts for this visit only. */
    }
  }

  return {
    read: read,
    /* Stores locally and tells the LMS mirror (if any) that something changed. */
    save: function (key, value) {
      write(key, value);
      listeners.forEach(function (listener) {
        listener(key, value);
      });
    },
    onSave: function (listener) {
      listeners.push(listener);
    }
  };
})();

/* Text size: three levels, applied as a root font size so every rem-based size follows. */
Dive.textSize = (function () {
  var LEVELS = ["normal", "medium", "large"];
  var NAMES = { normal: "רגיל", medium: "בינוני", large: "גדול" };
  var root = document.documentElement;
  var listeners = [];

  function valid(level) {
    return LEVELS.indexOf(level) !== -1;
  }

  var current = valid(Dive.prefs.read("text-size")) ? Dive.prefs.read("text-size") : "normal";

  function apply() {
    if (current === "normal") {
      root.removeAttribute("data-text-size");
    } else {
      root.setAttribute("data-text-size", current);
    }
    listeners.forEach(function (listener) {
      listener(current);
    });
  }

  if (current !== "normal") {
    root.setAttribute("data-text-size", current);
  }

  return {
    LEVELS: LEVELS,
    NAMES: NAMES,
    get: function () {
      return current;
    },
    /* save=false applies a value that came from the LMS without echoing it back. */
    set: function (level, save) {
      if (!valid(level)) {
        return;
      }
      current = level;
      if (save !== false) {
        Dive.prefs.save("text-size", level);
      }
      apply();
    },
    onChange: function (listener) {
      listeners.push(listener);
    }
  };
})();

/* Motion preference: combines the OS setting with the on-page pause button. */
Dive.motion = (function () {
  var root = document.documentElement;
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = [];
  /* Motion is on by default every time the unit opens (unless the device asks for reduced motion).
     The pause button works for the current visit only. */
  var paused = false;

  function isEnabled() {
    return !paused && !reducedQuery.matches;
  }

  function apply() {
    root.classList.toggle("is-motion", isEnabled());
    listeners.forEach(function (listener) {
      listener(isEnabled());
    });
  }

  reducedQuery.addEventListener("change", apply);
  root.classList.toggle("is-motion", isEnabled());

  return {
    isEnabled: isEnabled,
    isPaused: function () {
      return paused;
    },
    isReducedByOs: function () {
      return reducedQuery.matches;
    },
    setPaused: function (value) {
      paused = value;
      apply();
    },
    onChange: function (listener) {
      listeners.push(listener);
    }
  };
})();
