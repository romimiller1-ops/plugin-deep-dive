/* Exploration activities in the opening and the dive. None of them is scored.
   Each one has a keyboard and screen-reader path that gives the same result. */
window.Dive = window.Dive || {};

Dive.explore = (function () {
  var data = Dive.content;
  var ui = Dive.ui;

  /* Transcript button: three soft pulses when it first comes into view, then it stays highlighted. */
  function initTranscriptButton() {
    var button = document.getElementById("transcript-toggle");
    var label = button.querySelector("span");
    var panel = document.getElementById("clip-transcript");
    panel.addEventListener("shown.bs.collapse", function () { label.textContent = "הסתרת התמליל"; });
    panel.addEventListener("hidden.bs.collapse", function () { label.textContent = "לקריאת תמליל הסרטון"; });
    if (!("IntersectionObserver" in window)) {
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        button.classList.add("is-calling");
        observer.disconnect();
      }
    }, { threshold: 0.8 });
    observer.observe(button);
  }

  /* The running example: the passage travels through the plugin and comes out as questions. */
  function initExample() {
    var flow = document.getElementById("example-flow");
    var button = document.getElementById("example-play");
    button.addEventListener("click", function () {
      flow.classList.remove("is-playing");
      void flow.offsetWidth;
      flow.classList.add("is-playing");
      ui.announce("קטע ההדרכה נכנס לפלאגין, ויוצאות ממנו שלוש שאלות עם משוב.");
    });
  }

  /* X-ray lens: the cover is masked around the pointer; the button opens it fully. */
  function initXray() {
    document.querySelectorAll("[data-xray]").forEach(function (card) {
      var windowEl = card.querySelector(".xray__window");
      var open = card.querySelector(".xray__open");
      windowEl.addEventListener("pointermove", function (event) {
        var box = windowEl.getBoundingClientRect();
        windowEl.style.setProperty("--mx", (event.clientX - box.left) + "px");
        windowEl.style.setProperty("--my", (event.clientY - box.top) + "px");
        windowEl.classList.add("is-looking");
      });
      windowEl.addEventListener("pointerleave", function () {
        windowEl.classList.remove("is-looking");
      });
      open.addEventListener("click", function () {
        var opened = card.classList.toggle("is-open");
        open.textContent = opened ? "סגירת הקובץ" : "פתיחת הקובץ";
      });
    });
  }

  /* Chat simulation: send a message and see whether the skill wakes up. */
  function initChat() {
    var log = document.getElementById("chat-log");
    var skill = document.getElementById("chat-skill");
    var timer = null;

    document.querySelectorAll(".chat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var message = data.chat[Number(chip.dataset.msg)];
        window.clearTimeout(timer);
        document.querySelectorAll(".chat-chip").forEach(function (other) {
          other.classList.toggle("is-sent", other === chip);
        });
        skill.classList.remove("is-awake", "is-asleep");
        log.innerHTML = '<p class="chat__bubble chat__bubble--user">' + message.text + "</p>" +
          '<p class="chat__bubble chat__bubble--typing" aria-hidden="true"><span></span><span></span><span></span></p>';

        function answer() {
          skill.classList.add(message.wakes ? "is-awake" : "is-asleep");
          log.innerHTML = '<p class="chat__bubble chat__bubble--user">' + message.text + "</p>" +
            '<p class="chat__bubble chat__bubble--bot">' + ui.status(message.wakes ? "ok" : "bad", message.wakes ? "המיומנות התעוררה" : "המיומנות לא התעוררה") +
            " <span>" + message.reply + "</span></p>";
        }
        if (Dive.motion.isEnabled()) {
          timer = window.setTimeout(answer, 700);
        } else {
          answer();
        }
      });
    });
  }

  /* Cable tracer: choosing a line in SKILL.md draws a cable to the files it names. */
  function initCable() {
    var root = document.getElementById("cable");
    var wires = root.querySelector(".cable__wires");
    var note = document.getElementById("cable-note");
    var lines = root.querySelectorAll(".cable__line");
    var active = null;

    function draw() {
      wires.innerHTML = "";
      root.querySelectorAll("[data-node]").forEach(function (node) { node.classList.remove("is-lit"); });
      if (!active) {
        return;
      }
      var box = root.getBoundingClientRect();
      wires.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      var from = active.getBoundingClientRect();
      var stacked = root.querySelector(".cable__tree").getBoundingClientRect().top > from.bottom;
      active.dataset.targets.split(" ").forEach(function (id, index) {
        var node = root.querySelector('[data-node="' + id + '"]');
        node.classList.add("is-lit");
        var to = node.getBoundingClientRect();
        var x1, y1, x2, y2, path;
        if (stacked) {
          /* Narrow screens: run the cable down the left margin, clear of the other button. */
          var rail = 7 + index * 3;
          x1 = from.left - box.left;
          y1 = from.top - box.top + from.height / 2;
          x2 = to.left - box.left - 6;
          y2 = to.top - box.top + to.height / 2;
          path = "M" + x1 + " " + y1 + " C" + rail + " " + y1 + " " + rail + " " + y1 + " " + rail + " " + (y1 + 20) +
            " L" + rail + " " + (y2 - 20) + " C" + rail + " " + y2 + " " + rail + " " + y2 + " " + x2 + " " + y2;
        } else {
          x1 = from.right - box.left;
          y1 = from.top - box.top + from.height / 2;
          x2 = to.left - box.left - 6;
          y2 = to.top - box.top + to.height / 2;
          var mid = (x1 + x2) / 2;
          path = "M" + x1 + " " + y1 + " C" + mid + " " + y1 + " " + mid + " " + y2 + " " + x2 + " " + y2;
        }
        wires.insertAdjacentHTML("beforeend", '<path class="cable__wire" d="' + path + '" pathLength="1"/><circle class="cable__plug" cx="' + x2 + '" cy="' + y2 + '" r="5"/>');
      });
    }

    lines.forEach(function (line) {
      line.addEventListener("click", function () {
        active = line;
        lines.forEach(function (other) { other.setAttribute("aria-pressed", String(other === line)); });
        note.innerHTML = line.dataset.note.replace(/\[(.+?)\]/g, '<code dir="ltr" lang="en">$1</code>');
        draw();
      });
    });
    window.addEventListener("resize", draw);
  }

  /* Before / after slider between the empty template and a filled question. */
  function initCompare() {
    var root = document.getElementById("compare");
    var range = document.getElementById("compare-range");
    function update() {
      var value = Number(range.value);
      root.style.setProperty("--split", value + "%");
      range.setAttribute("aria-valuetext", value < 15 ? "רואים בעיקר את השאלה שנכתבה" : value > 85 ? "רואים בעיקר את התבנית הריקה" : "חלק מהתבנית וחלק מהשאלה");
    }
    range.addEventListener("input", update);
    update();
  }

  function initFlip() {
    var card = document.getElementById("flip");
    var button = document.getElementById("flip-btn");
    var label = button.querySelector("span");
    var busy = false;

    function setFace(flipped) {
      card.classList.toggle("is-flipped", flipped);
      button.setAttribute("aria-pressed", String(flipped));
      label.textContent = flipped ? "חזרה לקלט" : "הצגת הפלט";
      ui.announce(flipped ? "מוצגת דוגמת הפלט." : "מוצגת דוגמת הקלט.");
    }

    function flip() {
      var next = !card.classList.contains("is-flipped");
      if (!Dive.motion.isEnabled()) {
        setFace(next);
        return;
      }
      if (busy) {
        return;
      }
      busy = true;
      card.classList.add("is-turning");
      window.setTimeout(function () {
        setFace(next);
        card.classList.remove("is-turning");
        busy = false;
      }, 230);
    }

    button.addEventListener("click", flip);
    card.addEventListener("click", flip);
  }

  /* Path walk (ascent stage 3): each part of the path lights its step. */
  function initPathwalk() {
    var root = document.getElementById("pathwalk");
    var segments = root.querySelectorAll(".pathwalk__seg");
    var steps = root.querySelectorAll(".pathwalk__steps li");
    function show(step) {
      segments.forEach(function (segment) {
        segment.classList.toggle("is-on", Number(segment.dataset.step) <= step);
      });
      steps.forEach(function (item) {
        item.classList.toggle("is-on", Number(item.dataset.step) === step);
        item.classList.toggle("is-past", Number(item.dataset.step) < step);
      });
    }
    segments.forEach(function (segment) {
      var step = Number(segment.dataset.step);
      segment.addEventListener("mouseenter", function () { show(step); });
      segment.addEventListener("focus", function () { show(step); });
      segment.addEventListener("click", function () { show(step); });
    });
  }

  function init() {
    initTranscriptButton();
    initExample();
    initXray();
    initChat();
    initCable();
    initCompare();
    initFlip();
    initPathwalk();
  }

  return { init: init };
})();
