/* Activities along the ascent. None of them is scored, but every choice answers back. */
window.Dive = window.Dive || {};

Dive.stations = (function () {
  var data = Dive.content;
  var ui = Dive.ui;

  /* The task sentence grows with every right answer, written as an instruction to the plugin. */
  function buildTask(root, game) {
    var on = {};
    game.rings.forEach(function (ring) {
      var chosen = root.querySelector('input[name="lens-' + ring.id + '"]:checked');
      on[ring.id] = Boolean(chosen && ring.options[Number(chosen.value)].right);
    });
    return "צור" + (on.who ? game.parts.who : "") + (on.out ? game.parts.out : " שאלות") +
      (on["in"] ? game.parts["in"] : "") + (on.limit ? game.parts.limit : "") + ".";
  }

  /* Stage 1: each ring is a pair of choices; a wrong choice turns red with its own reason. */
  function initLens() {
    var root = document.getElementById("lens");
    var holder = document.getElementById("lens-rings");
    var text = document.getElementById("lens-text");
    var count = document.getElementById("lens-count");
    var game = data.lens;

    holder.innerHTML = game.rings.map(function (ring) {
      var options = ring.options.map(function (option, index) {
        var id = "lens-" + ring.id + "-" + index;
        return '<input class="btn-check" type="radio" autocomplete="off" name="lens-' + ring.id + '" id="' + id + '" value="' + index + '">' +
          '<label class="btn option-btn" for="' + id + '">' + option.text + "</label>";
      }).join("");
      return '<fieldset class="lens-ring" data-ring="' + ring.id + '"><legend>' + ring.legend + "</legend>" +
        '<div class="lens-ring__options">' + options + "</div>" +
        '<p class="choice-feedback" id="lens-fb-' + ring.id + '" aria-live="polite"></p></fieldset>';
    }).join("");

    root.addEventListener("change", function (event) {
      var ringEl = event.target.closest("[data-ring]");
      var ring = ui.byId(game.rings, ringEl.dataset.ring);
      var option = ring.options[Number(event.target.value)];
      ringEl.classList.toggle("is-right", option.right);
      ringEl.classList.toggle("is-wrong", !option.right);
      document.getElementById("lens-fb-" + ring.id).innerHTML = ui.status(option.right ? "ok" : "bad") + " <span>" + option.feedback + "</span>";

      var right = game.rings.filter(function (item) {
        var chosen = root.querySelector('input[name="lens-' + item.id + '"]:checked');
        return chosen && item.options[Number(chosen.value)].right;
      }).length;
      root.style.setProperty("--focus", String(right / game.rings.length));
      var done = right === game.rings.length;
      text.textContent = buildTask(root, game);
      count.textContent = "דיוק: " + right + " מתוך " + game.rings.length;
      root.classList.toggle("is-sharp", done);
      if (done) {
        ui.announce("המשימה מוגדרת: " + text.textContent);
      }
    });
  }

  /* Stage 2: the output is rebuilt from the switches; every missing line is explained. */
  function saboteurOutput(on) {
    var q = data.saboteur.question;
    var fake = !on.grounded;
    var mark = function (html, broken) {
      return broken ? '<mark class="broken">' + html + "</mark>" : html;
    };
    var options = (fake ? q.fabricatedOptions : q.options).slice();
    if (!on.options) {
      options = options.slice(0, 2);
    }
    var letters = ["א", "ב", "ג"];
    var title = mark("שאלה 1: " + (fake ? q.fabricated : q.text), fake);
    var optionText = options.map(function (option, index) { return "אפשרות " + letters[index] + ": " + option + "."; });
    var answer = "תשובה נכונה: " + (fake ? q.fabricatedAnswer : q.answer) + ".";
    var feedback = on.feedback ? "משוב: " + (fake ? q.fabricatedFeedback : q.feedback) : "";

    if (!on.template) {
      return '<p class="saboteur-output__flat">' + mark([title, optionText.join(" "), answer, feedback].filter(Boolean).join(" "), true) + "</p>";
    }
    return '<dl class="saboteur-output__q"><dt>' + title + "</dt>" +
      optionText.map(function (line) { return "<dd>" + line + "</dd>"; }).join("") +
      (!on.options ? '<dd><mark class="broken">(חסרה אפשרות שלישית)</mark></dd>' : "") +
      "<dd>" + answer + "</dd>" +
      (feedback ? "<dd>" + feedback + "</dd>" : '<dd><mark class="broken">(אין משוב)</mark></dd>') + "</dl>";
  }

  function initSaboteur() {
    var root = document.getElementById("saboteur");
    var output = document.getElementById("saboteur-output");
    var notes = document.getElementById("saboteur-notes");
    var game = data.saboteur;

    root.innerHTML = game.lines.map(function (line) {
      return '<div class="form-check form-switch saboteur-line"><input class="form-check-input" type="checkbox" role="switch" autocomplete="off" id="sab-' + line.id + '" data-line="' + line.id + '" checked>' +
        '<label class="form-check-label" for="sab-' + line.id + '">' + line.text + "</label></div>";
    }).join("");

    function render() {
      var on = {};
      root.querySelectorAll("input").forEach(function (input) {
        on[input.dataset.line] = input.checked;
        input.closest(".saboteur-line").classList.toggle("is-off", !input.checked);
      });
      output.innerHTML = saboteurOutput(on);
      var off = game.lines.filter(function (line) { return !on[line.id]; });
      notes.innerHTML = off.length
        ? off.map(function (line) {
          return "<li>" + ui.status("bad", "חסרה השורה ״" + line.text + "״") + " <span>" + line.missing + "</span></li>";
        }).join("")
        : "<li>" + ui.status("ok", "כל השורות פעילות") + " <span>השאלה מבוססת על הקטע, יש בה שלוש אפשרויות ומשוב, והיא בנויה לפי התבנית.</span></li>";
    }
    root.addEventListener("change", render);
    render();
  }

  /* Stage 4: every line explains itself when chosen. */
  function initInspector() {
    var root = document.getElementById("inspector");
    var feedback = document.getElementById("inspector-feedback");
    var game = data.inspector;

    root.innerHTML = game.map(function (sentence, index) {
      return '<button type="button" class="inspect-line" aria-pressed="false" data-id="' + sentence.id + '"><span class="inspect-line__n">' + (index + 1) + "</span><span>" + sentence.text + "</span></button>";
    }).join("");

    root.addEventListener("click", function (event) {
      var button = event.target.closest(".inspect-line");
      if (!button) {
        return;
      }
      var sentence = ui.byId(game, button.dataset.id);
      root.querySelectorAll(".inspect-line").forEach(function (line) {
        var chosen = line === button;
        line.setAttribute("aria-pressed", String(chosen));
        line.classList.toggle("is-right", chosen && sentence.bad);
        line.classList.toggle("is-wrong", chosen && !sentence.bad);
      });
      feedback.innerHTML = ui.status(sentence.bad ? "ok" : "bad") + " <span>" + sentence.feedback + "</span>";
    });
  }

  function init() {
    initLens();
    initSaboteur();
    initInspector();
  }

  return { init: init };
})();
