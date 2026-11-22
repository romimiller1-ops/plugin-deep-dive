/* Refresh track, checks 2 and 3: where does the path break, when does the skill wake up,
   and which of the produced questions need fixing. Not scored: every answer turns green or red
   and explains itself. */
window.Dive = window.Dive || {};

Dive.quickchecks = (function () {
  var data = Dive.content.tracks;
  var ui = Dive.ui;
  var flags = {};

  function ringHtml(ring, index) {
    var options = ring.options.map(function (option, index) {
      var id = "qc-" + ring.id + "-" + index;
      return '<input class="btn-check" type="radio" autocomplete="off" name="qc-' + ring.id + '" id="' + id + '" value="' + index + '">' +
        '<label class="btn option-btn" for="' + id + '">' + ui.codeify(option.text) + "</label>";
    }).join("");
    /* One flex item for the number and one for the whole question, so a code word never splits the line. */
    return '<fieldset class="lens-ring quick-check" data-ring="' + ring.id + '"><legend><span class="quick-check__n" aria-hidden="true">' + index + "</span>" +
      '<span class="quick-check__q">' + ui.codeify(ring.legend) + "</span></legend>" +
      '<p class="quick-check__hint">לחצו על התשובה הנכונה:</p>' +
      '<div class="lens-ring__options">' + options + "</div>" +
      '<p class="choice-feedback" id="qc-fb-' + ring.id + '" aria-live="polite"></p></fieldset>';
  }

  function findRing(id) {
    var found = null;
    Object.keys(data.checks).forEach(function (group) {
      data.checks[group].forEach(function (ring) {
        if (ring.id === id) {
          found = ring;
        }
      });
    });
    return found;
  }

  function onChange(event) {
    var ringEl = event.target.closest("[data-ring]");
    if (!ringEl) {
      return;
    }
    var ring = findRing(ringEl.dataset.ring);
    var option = ring.options[Number(event.target.value)];
    ringEl.classList.toggle("is-right", option.right);
    ringEl.classList.toggle("is-wrong", !option.right);
    document.getElementById("qc-fb-" + ring.id).innerHTML = ui.status(option.right ? "ok" : "bad") + " <span>" + ui.codeify(option.feedback) + "</span>";
  }

  /* ---------- Check 3: which questions need fixing? ---------- */
  function renderOutput() {
    var root = document.getElementById("output-audit");
    root.innerHTML = data.outputAudit.map(function (item) {
      var flagged = Boolean(flags[item.id]);
      return '<button type="button" class="output-card' + (flagged ? " is-flagged" : "") + '" data-output="' + item.id + '" aria-pressed="' + flagged + '">' +
        '<span class="visually-hidden">סימון לתיקון: </span>' +
        '<span class="output-card__lines">' + item.lines.map(function (line, index) {
          return "<span" + (index === 0 ? ' class="output-card__q"' : "") + ">" + line + "</span>";
        }).join("") + "</span>" +
        '<span class="file-chip__flag output-card__flag" aria-hidden="true">' + ui.icon("exclamation-triangle") + "לתיקון</span></button>";
    }).join("");
  }

  function checkOutput() {
    var summary = document.getElementById("output-audit-summary");
    var details = document.getElementById("output-audit-details");
    var anyFlag = data.outputAudit.some(function (item) { return flags[item.id]; });
    if (!anyFlag) {
      details.innerHTML = "";
      summary.innerHTML = ui.status("missing") + " <span>עוד לא סימנתם אף שאלה. לחצו על שאלה שנראית לכם בעייתית.</span>";
      summary.focus();
      return;
    }
    var right = 0;
    details.innerHTML = data.outputAudit.map(function (item, index) {
      var flagged = Boolean(flags[item.id]);
      var correct = flagged === item.bad;
      right += correct ? 1 : 0;
      var word = item.bad ? (flagged ? "זיהיתם" : "פספסתם") : (flagged ? "דווקא תקינה" : "תקינה");
      document.querySelector('[data-output="' + item.id + '"]').classList.toggle("is-right", correct);
      document.querySelector('[data-output="' + item.id + '"]').classList.toggle("is-wrong", !correct);
      return '<li class="' + (correct ? "is-right" : "is-wrong") + '"><p class="wreck__file">' + ui.status(correct ? "ok" : "bad", word) +
        " <strong>שאלה " + (index + 1) + "</strong></p><p>" + ui.codeify(item.note) + "</p></li>";
    }).join("");
    var total = data.outputAudit.length;
    var level = right === total ? "ok" : right === 0 ? "bad" : "partial";
    var message = level === "ok"
      ? "עין חדה! מצאתם בדיוק את שתי השאלות שטעונות תיקון, וגם למה."
      : "חלק מהזיהויים מדויקים. הפירוט למטה מסביר מה בודקים בכל שאלה.";
    summary.innerHTML = ui.status(level, right + " מתוך " + total) + " <span>" + message + "</span>";
    summary.focus();
  }

  function initOutput() {
    renderOutput();
    document.getElementById("output-audit").addEventListener("click", function (event) {
      var card = event.target.closest("[data-output]");
      if (!card) {
        return;
      }
      var id = card.dataset.output;
      flags[id] = !flags[id];
      renderOutput();
      document.querySelector('[data-output="' + id + '"]').focus();
      ui.announce("שאלה " + id.slice(1) + (flags[id] ? " סומנה לתיקון." : " כבר לא מסומנת."));
    });
    document.getElementById("output-audit-check").addEventListener("click", checkOutput);
  }

  function hasProgress() {
    return Boolean(document.querySelector(".quick-check input:checked")) ||
      Object.keys(flags).some(function (id) { return flags[id]; });
  }

  function reset() {
    document.querySelectorAll(".quick-check").forEach(function (ringEl) {
      ringEl.classList.remove("is-right", "is-wrong");
      ringEl.querySelectorAll("input").forEach(function (input) { input.checked = false; });
      ringEl.querySelector(".choice-feedback").innerHTML = "";
    });
    flags = {};
    renderOutput();
    document.getElementById("output-audit-summary").innerHTML = "";
    document.getElementById("output-audit-details").innerHTML = "";
  }

  function init() {
    /* Questions are numbered in one run across the section (1, 2, 3), not from 1 in every group. */
    var number = 0;
    document.querySelectorAll("[data-quick-checks]").forEach(function (holder) {
      holder.innerHTML = data.checks[holder.dataset.quickChecks].map(function (ring) {
        number += 1;
        return ringHtml(ring, number);
      }).join("");
      holder.addEventListener("change", onChange);
    });
    initOutput();
    document.getElementById("refresh-checklist").innerHTML = data.checklist.map(function (line) {
      return "<li>" + ui.icon("check-circle") + "<span>" + line + "</span></li>";
    }).join("");
  }

  return { init: init, reset: reset, hasProgress: hasProgress };
})();
