/* Learning track: "first" (first hands-on) or "refresh" (refresh after hands-on).
   Chosen right after the greeting: one click on a track card opens it and brings the learner straight in.
   The content stays hidden until then. Switching is possible until submitting; once there are answers,
   a "שימו לב" popup describes the other track and warns that the answers will be deleted.
   Every visit starts on the two cards; the choice is reported to the LMS with the answers. */
window.Dive = window.Dive || {};

Dive.track = (function () {
  var TRACKS = ["first", "refresh"];
  var root = document.documentElement;
  var ui = Dive.ui;
  var labels = Dive.content.tracks.labels;
  var pending = null;
  var locked = false;
  var modal = null;

  /* Where each track starts, and what the popup tells about it. */
  var START = { first: "what-is-plugin", refresh: "example" };
  var PREVIEW = {
    first: {
      who: "למי שעוד לא בנה פלאגין, ופוגש את הנושא לראשונה.",
      what: "מכירים את הקבצים של הפלאגין ואת התפקיד של כל אחד, ומסדרים אותם יחד."
    },
    refresh: {
      who: "למי שכבר בנה דוגמה פשוטה של פלאגין.",
      what: "מסלול קצר שבו בודקים פלאגין שמישהו כבר בנה, מוצאים מה התקלקל ומתקנים."
    }
  };

  function current() {
    return Dive.state.track;
  }

  function cards() {
    return document.querySelectorAll(".track-card");
  }

  function other(track) {
    return track === "first" ? "refresh" : "first";
  }

  function renderPicker(track) {
    cards().forEach(function (card) {
      card.setAttribute("aria-pressed", String(card.dataset.track === track));
    });
    document.querySelectorAll(".js-track-change").forEach(function (button) {
      button.hidden = !track || locked;
    });
  }

  /* Moves the reader to the first section of the chosen track. */
  function goToStart(track) {
    var target = document.getElementById(START[track]);
    Dive.engine.measure();
    target.scrollIntoView({ behavior: Dive.motion.isEnabled() ? "smooth" : "auto", block: "start" });
    var heading = target.querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  /* Makes a track the active one. reset=true starts the practices and the form over. */
  function apply(track, options) {
    var opts = options || {};
    var changed = current() !== track;
    Dive.state.track = track;
    root.setAttribute("data-track", track);
    /* Each track starts with motion on. */
    if (changed && Dive.motion.isPaused()) {
      Dive.motion.setPaused(false);
    }
    renderPicker(track);
    if (changed || opts.reset) {
      Dive.wreck.setTrack(track);
      Dive.logbook.reset();
      Dive.quickchecks.reset();
    }
    Dive.debrief.render();
    Dive.engine.measure();
    window.dispatchEvent(new Event("resize"));
    if (opts.announce) {
      ui.announce(opts.announce);
    }
  }

  function hasProgress() {
    return Dive.wreck.hasProgress() || Dive.logbook.hasProgress() || Dive.quickchecks.hasProgress();
  }

  function askToSwitch(next) {
    pending = next;
    var preview = PREVIEW[next];
    document.getElementById("track-switch-name").textContent = "״" + labels[next] + "״";
    document.getElementById("track-switch-preview").innerHTML =
      "<p><strong>למי?</strong> " + preview.who + "</p><p><strong>מה עושים בו?</strong> " + preview.what + "</p>";
    document.getElementById("track-switch-body").querySelector(".switch-warning").hidden = !hasProgress();
    modal.show();
  }

  function enter(next) {
    apply(next, { reset: true, announce: "נבחר המסלול ״" + labels[next] + "״." });
    goToStart(next);
  }

  /* A card click: the first choice opens the track at once. Changing tracks with no answers yet
     is just as quick; once there are answers, the popup asks first. */
  function onPick(event) {
    var card = event.target.closest(".track-card");
    if (!card || locked) {
      return;
    }
    var next = card.dataset.track;
    if (next === current()) {
      goToStart(next);
      return;
    }
    if (!current() || !hasProgress()) {
      enter(next);
      return;
    }
    askToSwitch(next);
  }

  /* Before a track is chosen, links into the (hidden) content lead back to the picker. */
  function guardLinks(event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link || current()) {
      return;
    }
    var target = document.querySelector(link.getAttribute("href"));
    if (target && target.closest("main")) {
      event.preventDefault();
      var picker = document.getElementById("track-picker");
      picker.scrollIntoView({ block: "center", behavior: Dive.motion.isEnabled() ? "smooth" : "auto" });
      cards()[0].focus({ preventScroll: true });
      ui.announce("כדי להתחיל, בחרו מסלול.");
    }
  }

  function lock() {
    locked = true;
    cards().forEach(function (card) {
      card.disabled = true;
    });
    document.getElementById("track-picker").classList.add("is-locked");
    document.getElementById("track-picker-note").textContent = "המסלול נקבע עם ההגשה.";
    document.querySelectorAll(".js-track-change").forEach(function (button) {
      button.hidden = true;
    });
  }

  function init() {
    modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById("track-switch"));

    document.getElementById("track-picker").addEventListener("click", onPick);
    document.addEventListener("click", guardLinks);

    /* "שינוי מסלול" in the top bar: the popup opens right here, without moving the page. */
    document.querySelectorAll(".js-track-change").forEach(function (button) {
      button.addEventListener("click", function () {
        if (current() && !locked) {
          var menu = document.getElementById("main-menu");
          if (menu.classList.contains("show")) {
            window.bootstrap.Collapse.getOrCreateInstance(menu).hide();
          }
          askToSwitch(other(current()));
        }
      });
    });

    document.getElementById("track-switch-confirm").addEventListener("click", function () {
      var next = pending;
      pending = null;
      modal.hide();
      apply(next, { reset: true, announce: "עברתם למסלול ״" + labels[next] + "״. מתחילים מההתחלה של המסלול." });
      goToStart(next);
    });
    document.getElementById("track-switch").addEventListener("hidden.bs.modal", function () {
      if (pending) {
        pending = null;
        ui.announce("נשארתם במסלול ״" + labels[current()] + "״.");
      }
    });

    /* The unit always opens on the two track cards: nothing opens until the learner chooses. */
    renderPicker(null);
  }

  return { init: init, lock: lock, current: current };
})();
