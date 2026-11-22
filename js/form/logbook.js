/* Final form and the closing summary.
   Each track has its own five questions (first track: the original set; refresh: "plugin checker" questions
   about the same example). One engine runs both: matching game, per-answer feedback, check, submit. */
window.Dive = window.Dive || {};

Dive.logbook = (function () {
  var data = Dive.content;
  var ui = Dive.ui;
  var scoring = Dive.scoring;
  var state = Dive.state.form;

  var submitted = false;
  var form, summary, submitButton, submitStatus, retryButton;
  var quizzes = {};

  function track() {
    return Dive.state.track === "refresh" ? "refresh" : "first";
  }

  function quiz() {
    return quizzes[track()];
  }

  /* ---------- Matching game (Q1 in both tracks) ----------
     items: [{ id, answer, prompt (html), why }], options: [{ id, label (html), text }] */
  function createMatch(root, cfg) {
    var pairs = {};
    var activeId = null;

    function option(id) {
      return ui.byId(cfg.options, id);
    }

    function nextItem() {
      var open = cfg.items.filter(function (item) { return !pairs[item.id]; })[0];
      return open ? open.id : null;
    }

    function render() {
      var total = cfg.items.length;
      var done = Object.keys(pairs).length;
      var current = activeId || nextItem();
      var html = "";

      if (current) {
        var item = ui.byId(cfg.items, current);
        var used = Object.keys(pairs).map(function (key) { return pairs[key]; });
        var buttons = cfg.options.filter(function (opt) { return used.indexOf(opt.id) === -1; }).map(function (opt) {
          return '<button type="button" class="btn option-btn match-role" data-role="' + opt.id + '">' + opt.label + "</button>";
        }).join("");
        html += '<p class="match__progress">' + cfg.progress + " " + (done + 1) + " מתוך " + total + "</p>" +
          '<p class="match__file' + (cfg.promptClass ? " " + cfg.promptClass : "") + '">' + item.prompt + "</p>" +
          '<div class="match__roles">' + buttons + "</div>";
      } else {
        html += '<p class="match__progress" tabindex="-1" data-match-complete>' + cfg.complete + "</p>";
      }

      if (done) {
        html += '<ul class="match__done">' + cfg.items.filter(function (item) { return pairs[item.id]; }).map(function (item) {
          return "<li>" + item.short + "<span>" + option(pairs[item.id]).label + "</span>" +
            '<button type="button" class="btn btn-outline-dark match-edit" data-edit="' + item.id + '">שינוי<span class="visually-hidden"> של ' + item.plain + "</span></button></li>";
        }).join("") + "</ul>";
      }

      root.innerHTML = html;
      root.dataset.current = current || "";
    }

    function focus() {
      var target = root.querySelector(".match-role") || root.querySelector("[data-match-complete]");
      if (target) {
        target.focus();
      }
    }

    root.addEventListener("click", function (event) {
      if (submitted) {
        return;
      }
      var roleButton = event.target.closest("[data-role]");
      var editButton = event.target.closest("[data-edit]");
      if (roleButton) {
        pairs[root.dataset.current] = roleButton.dataset.role;
        activeId = null;
        cfg.onChange();
        render();
        focus();
        ui.announce("הותאם. " + Object.keys(pairs).length + " מתוך " + cfg.items.length + ".");
      } else if (editButton) {
        delete pairs[editButton.dataset.edit];
        activeId = editButton.dataset.edit;
        cfg.onChange();
        render();
        focus();
      }
    });

    /* One line per item: what was chosen, whether it fits, and why. */
    function feedback(result) {
      var head = result.status === "ok"
        ? cfg.allRight
        : result.right + " מתוך " + cfg.items.length + " " + cfg.someRight;
      var items = cfg.items.map(function (item) {
        var chosen = option(pairs[item.id]);
        var correct = pairs[item.id] === item.answer;
        var body = correct
          ? "בחרתם " + chosen.quoted + ". " + item.why
          : "בחרתם " + chosen.quoted + ", " + cfg.but + " " + option(item.answer).quoted + ". " + item.why;
        return '<li class="' + (correct ? "is-right" : "is-wrong") + '">' + ui.status(correct ? "ok" : "bad") + " " + item.short +
          " <span>" + ui.codeify(body) + "</span></li>";
      }).join("");
      return "<span>" + head + '</span><ul class="feedback__list">' + items + "</ul>";
    }

    return {
      render: render,
      pairs: function () { return pairs; },
      firstButton: function () { return root.querySelector(".match-role"); },
      feedback: feedback,
      reset: function () {
        pairs = {};
        activeId = null;
        render();
      }
    };
  }

  /* ---------- Shared helpers ---------- */
  function setFeedback(id, kind, html) {
    var box = document.getElementById("fb-" + id);
    box.classList.remove("is-stale");
    box.innerHTML = kind ? ui.status(kind) + ' <div class="feedback__body">' + html + "</div>" : "";
  }

  function markField(element, invalid) {
    if (!element) {
      return;
    }
    element.classList.toggle("is-invalid", invalid);
    if (invalid) {
      element.setAttribute("aria-invalid", "true");
    } else {
      element.removeAttribute("aria-invalid");
    }
  }

  /* A right answer in a dropdown or number field turns the field green, like the other questions.
     A wrong one keeps the field as it is: the feedback under it says what to fix. */
  function markCorrect(element, correct) {
    element.classList.toggle("is-valid", Boolean(correct));
  }

  /* A wrong answer in a dropdown or number field turns red (the feedback under it explains why). */
  function markResult(element, status) {
    markCorrect(element, status === "ok");
    element.classList.toggle("is-wrong-answer", status === "bad");
  }

  function markStale(feedbackId) {
    if (!state.result) {
      return;
    }
    state.stale = true;
    updateSubmit();
    document.getElementById("logbook-stale").hidden = false;
    document.getElementById("fb-" + feedbackId).classList.add("is-stale");
    Dive.debrief.render();
  }

  /* Checkbox questions: one line per option, picked or not, and whether that was the right call. */
  function checksFeedback(result, picked, defs, labelFor) {
    var head = result.status === "ok"
      ? "סימנתם בדיוק את מה שצריך."
      : result.status === "partial" ? "חלק מהבחירות מדויקות. הנה פירוט לכל אפשרות:" : "יש כאן בחירה שכדאי לתקן. הנה פירוט לכל אפשרות:";
    var items = Object.keys(defs).map(function (key) {
      var def = defs[key];
      var good = picked[key] === def.right;
      return '<li class="' + (good ? "is-right" : "is-wrong") + '">' + ui.status(good ? "ok" : "bad", picked[key] ? "סימנתם" : "לא סימנתם") +
        " <span>״" + labelFor(key).textContent.trim() + "״ – " + ui.codeify(picked[key] ? def.picked : def.missed) + "</span></li>";
    }).join("");
    return "<span>" + head + '</span><ul class="feedback__list">' + items + "</ul>";
  }

  function markChecks(selector, attr, picked, defs) {
    document.querySelectorAll(selector).forEach(function (row) {
      var key = row.getAttribute(attr);
      var good = picked[key] === defs[key].right;
      row.classList.toggle("is-right", good && picked[key]);
      row.classList.toggle("is-wrong", !good);
    });
  }

  /* The open question has no right answer: a filled field gets a thank-you, an empty one nothing. */
  /* The open question has no right answer and no minimum length: a filled field gets a thank-you, an empty one nothing. */
  function learnedFeedback(fieldId, feedbackId) {
    var value = document.getElementById(fieldId).value.trim();
    var box = document.getElementById(feedbackId);
    box.classList.remove("is-stale");
    box.innerHTML = value ? '<p class="thanks">' + data.form.thanks + "</p>" : "";
  }

  /* Runs the shared part of a check: missing answers first, then the score line. */
  /* problems: [{ element, kind: "missing" | "invalid" }]. Missing answers and answers that do not meet
     the instructions are counted and named separately. */
  function finishCheck(results, problems, answers, showAll) {
    if (problems.length) {
      state.result = null;
      state.stale = false;
      updateSubmit();
      document.getElementById("logbook-stale").hidden = true;
      var missingCount = problems.filter(function (p) { return p.kind === "missing"; }).length;
      var invalidCount = problems.length - missingCount;
      var parts = [];
      if (missingCount) {
        parts.push(missingCount === 1 ? "להשלים שאלה אחת" : "להשלים " + missingCount + " שאלות");
      }
      if (invalidCount) {
        parts.push(invalidCount === 1 ? "לתקן תשובה אחת שלא עומדת בהנחיות" : "לתקן " + invalidCount + " תשובות שלא עומדות בהנחיות");
      }
      var problemText = "יש " + parts.join(" ו") + " לפני הבדיקה.";
      summary.innerHTML = ui.status(invalidCount ? "invalid" : "missing") + " <span>" + problemText + "</span>";
      problems[0].element.focus();
      ui.announce(problemText);
      Dive.debrief.render();
      return;
    }
    showAll();
    var score = Object.keys(results).reduce(function (sum, key) { return sum + results[key].points; }, 0);
    /* answers: a snapshot of what was checked, so the submit reports exactly these answers. */
    state.result = { track: track(), score: score, total: 4, results: results, answers: answers };
    state.stale = false;
    updateSubmit();
    document.getElementById("logbook-stale").hidden = true;

    var counts = { ok: 0, partial: 0, bad: 0 };
    Object.keys(results).forEach(function (key) { counts[results[key].status] += 1; });
    var level = counts.ok === 4 ? "ok" : counts.ok === 0 && counts.partial === 0 ? "bad" : "partial";
    var parts = [];
    if (counts.ok) { parts.push(counts.ok === 1 ? "תשובה אחת נכונה" : counts.ok + " תשובות נכונות"); }
    if (counts.partial) { parts.push(counts.partial === 1 ? "תשובה אחת נכונה חלקית" : counts.partial + " תשובות נכונות חלקית"); }
    if (counts.bad) { parts.push(counts.bad === 1 ? "תשובה אחת שכדאי לתקן" : counts.bad + " תשובות שכדאי לתקן"); }
    var line = level === "ok"
      ? (track() === "refresh" ? "עניתם נכון על כל השאלות. בודקי פלאגינים מוסמכים!" : "עניתם נכון על כל השאלות. כל הכבוד!")
      : "מתוך 4 שאלות: " + parts.join(", ") + ". קראו את המשוב ליד כל שאלה, תקנו ובדקו שוב.";
    var badge = level === "ok" ? "4 מתוך 4" : level === "bad" ? "עוד לא" : "חלקי";
    summary.innerHTML = ui.status(level, badge) + " <span>" + line + "</span>";
    summary.focus();
    Dive.debrief.render();
  }

  /* ---------- First track: the original five questions ---------- */
  function createFirstQuiz() {
    var ROLE_ORDER = ["template", "readme", "output", "manifest", "skillfile"];
    var match = createMatch(document.getElementById("match-game"), {
      items: data.form.matchRoles.map(function (item) {
        var name = ui.byId(data.files, item.file).name;
        return { id: item.file, answer: item.file, prompt: ui.fileName(name), short: ui.fileName(name), plain: name, why: item.why };
      }),
      options: ROLE_ORDER.map(function (id) {
        var role = ui.byId(data.form.matchRoles.map(function (item) { return { id: item.file, role: item.role }; }), id).role;
        return { id: id, label: role, quoted: "״" + role + "״" };
      }),
      progress: "קובץ",
      complete: "כל הקבצים הותאמו. אפשר להמשיך לשאלה הבאה.",
      allRight: "כל חמשת הקבצים הותאמו לתפקיד שלהם.",
      someRight: "קבצים הותאמו לתפקיד שלהם. הנה פירוט לכל קובץ:",
      but: "אבל התפקיד שלו הוא",
      onChange: function () { markStale("match"); }
    });

    function labelFor(key) {
      return document.querySelector('label[for="q-check-' + key + '"]');
    }

    /* Every number gets an answer that explains it; large counts are possible in other plugins, not in ours. */
    function countFeedback(result) {
      var text = data.form.count.feedback;
      var value = result.value;
      var answer;
      if (result.status === "ok") {
        answer = text.right;
      } else if (value === 3) {
        answer = text.three;
      } else if (value === 1) {
        answer = text.one;
      } else if (value === 0) {
        answer = text.zero;
      } else {
        answer = "כתבתם " + value + ". " + (value >= 10 ? text.many : text.few);
      }
      return answer + '<p class="feedback__link">' + data.form.count.link + "</p>";
    }

    function check() {
      var step = document.getElementById("q-first");
      var count = document.getElementById("q-count");
      var picked = {};
      Object.keys(data.form.checks).forEach(function (key) {
        picked[key] = document.getElementById("q-check-" + key).checked;
      });
      var results = {
        match: scoring.scoreMatch(match.pairs()),
        first: scoring.scoreFirstStep(step.value),
        checks: scoring.scoreChecks(picked),
        count: scoring.scoreCount(count.value, count.validity.badInput)
      };

      var problems = [];
      function missing(key, fbId, text, element) {
        if (results[key].status === "missing") {
          setFeedback(fbId, "missing", text);
          problems.push({ element: element, kind: "missing" });
        } else {
          setFeedback(fbId, null);
        }
      }
      missing("match", "match", results.match.remaining === 1 ? "נותר קובץ אחד בלי תפקיד." : "נותרו " + results.match.remaining + " קבצים בלי תפקיד.", match.firstButton());
      missing("first", "first", "בחרו פעולה.", step);
      missing("checks", "checks", "סמנו לפחות אפשרות אחת.", document.getElementById("q-check-grounded"));
      missing("count", "count", "כתבו מספר.", count);
      if (results.count.status === "invalid") {
        setFeedback("count", "invalid", data.form.count.feedback[results.count.reason]);
        problems.push({ element: count, kind: "invalid" });
      }
      learnedFeedback("q-learned", "fb-learned");
      markField(step, results.first.status === "missing");
      markField(count, results.count.status === "missing" || results.count.status === "invalid");

      finishCheck(results, problems, { pairs: Object.assign({}, match.pairs()), first: step.value, picked: picked, count: count.value }, function () {
        setFeedback("match", results.match.status, match.feedback(results.match));
        setFeedback("first", results.first.status, data.form.firstStep.feedback[results.first.value]);
        markResult(step, results.first.status);
        markResult(count, results.count.status);
        setFeedback("checks", results.checks.status, checksFeedback(results.checks, picked, data.form.checks, labelFor));
        markChecks("[data-check]", "data-check", picked, data.form.checks);
        setFeedback("count", results.count.status, countFeedback(results.count));
      });
    }

    function listen() {
      document.getElementById("q-first").addEventListener("change", function () { markResult(this, null); markStale("first"); });
      document.getElementById("q-count").addEventListener("input", function () { markResult(this, null); markStale("count"); });
      document.querySelectorAll('[data-check] input').forEach(function (box) {
        box.addEventListener("change", function () {
          markStale("checks");
          document.querySelectorAll("[data-check]").forEach(function (row) { row.classList.remove("is-right", "is-wrong"); });
        });
      });
    }

    return {
      learnedId: "q-learned",
      learnedFb: "fb-learned",
      match: match,
      check: check,
      listen: listen,
      reset: function () {
        match.reset();
        document.querySelectorAll("[data-check]").forEach(function (row) { row.classList.remove("is-right", "is-wrong"); });
        markField(document.getElementById("q-first"), false);
        markField(document.getElementById("q-count"), false);
        markResult(document.getElementById("q-first"), null);
        markResult(document.getElementById("q-count"), null);
      },
      /* Where to go back to after a check that was not perfect. */
      links: function (result, wreckScore) {
        var links = [];
        if (wreckScore < 6 || result.results.count.status !== "ok") {
          links.push('<a href="#dive">מבנה התיקיות</a>');
        }
        if (result.results.first.status !== "ok" || result.results.checks.status !== "ok") {
          links.push('<a href="#ascent">שלבי הפיתוח</a>');
        }
        return links;
      }
    };
  }

  /* ---------- Refresh track: same plugin, from the angle of finding what to fix ---------- */
  function createRefreshQuiz() {
    var cfg = data.refreshForm;
    var match = createMatch(document.getElementById("r-match-game"), {
      items: cfg.match.items.map(function (item) {
        return { id: item.id, answer: item.answer, prompt: ui.codeify(item.prompt), short: "<span class=\"match__symptom\">" + ui.codeify(item.prompt) + "</span>", plain: item.prompt, why: item.why };
      }),
      options: cfg.match.order.map(function (id) {
        var name = ui.byId(data.files, id).name;
        return { id: id, label: ui.fileName(name), quoted: name };
      }),
      promptClass: "match__file--symptom",
      progress: "תקלה",
      complete: "לכל התקלות נבחר קובץ. אפשר להמשיך לשאלה הבאה.",
      allRight: "לכל חמש התקלות מצאתם את הקובץ הנכון.",
      someRight: "תקלות קיבלו את הקובץ הנכון. הנה פירוט לכל תקלה:",
      but: "אבל כאן כדאי לבדוק את",
      onChange: function () { markStale("r-match"); }
    });

    function labelFor(key) {
      return document.querySelector('label[for="r-check-' + key + '"]');
    }

    function pickedValue() {
      var chosen = document.querySelector('input[name="r-pick"]:checked');
      return chosen ? chosen.value : "";
    }

    function check() {
      var stage = document.getElementById("r-stage");
      var picked = {};
      Object.keys(cfg.checks).forEach(function (key) {
        picked[key] = document.getElementById("r-check-" + key).checked;
      });
      var pick = pickedValue();
      var results = {
        match: scoring.scoreMatch(match.pairs(), cfg.match.items),
        stage: scoring.scoreFirstStep(stage.value, cfg.stage.right),
        checks: scoring.scoreChecks(picked, cfg.checks),
        pick: scoring.scorePick(pick, cfg.pick.right)
      };

      var problems = [];
      function missing(key, fbId, text, element) {
        if (results[key].status === "missing") {
          setFeedback(fbId, "missing", text);
          problems.push({ element: element, kind: "missing" });
        } else {
          setFeedback(fbId, null);
        }
      }
      missing("match", "r-match", results.match.remaining === 1 ? "נותרה תקלה אחת בלי קובץ." : "נותרו " + results.match.remaining + " תקלות בלי קובץ.", match.firstButton());
      missing("stage", "r-stage", "בחרו שלב.", stage);
      missing("checks", "r-checks", "סמנו לפחות אפשרות אחת.", document.getElementById("r-check-skillspot"));
      var tickedCount = Object.keys(picked).filter(function (key) { return picked[key]; }).length;
      if (tickedCount > cfg.checksMax) {
        setFeedback("r-checks", "invalid", cfg.checksTooMany);
        problems.push({ element: document.getElementById("r-check-skillspot"), kind: "invalid" });
      }
      missing("pick", "r-pick", "בחרו קובץ אחד.", document.getElementById("r-pick-skillfile"));
      learnedFeedback("r-learned", "fb-r-learned");
      markField(stage, results.stage.status === "missing");

      finishCheck(results, problems, { pairs: Object.assign({}, match.pairs()), stage: stage.value, picked: picked, pick: pick }, function () {
        setFeedback("r-match", results.match.status, match.feedback(results.match));
        setFeedback("r-stage", results.stage.status, cfg.stage.feedback[results.stage.value]);
        markResult(stage, results.stage.status);
        setFeedback("r-checks", results.checks.status, checksFeedback(results.checks, picked, cfg.checks, labelFor));
        markChecks("[data-r-check]", "data-r-check", picked, cfg.checks);
        document.querySelectorAll("[data-r-pick]").forEach(function (row) {
          var chosen = row.getAttribute("data-r-pick") === pick;
          row.classList.toggle("is-right", chosen && results.pick.status === "ok");
          row.classList.toggle("is-wrong", chosen && results.pick.status !== "ok");
        });
        setFeedback("r-pick", results.pick.status, ui.codeify(cfg.pick.feedback[pick]) + '<p class="feedback__link">' + ui.codeify(cfg.pick.link) + "</p>");
      });
    }

    function listen() {
      document.getElementById("r-stage").addEventListener("change", function () { markResult(this, null); markStale("r-stage"); });
      document.querySelectorAll("[data-r-check] input").forEach(function (box) {
        box.addEventListener("change", function () {
          markStale("r-checks");
          document.querySelectorAll("[data-r-check]").forEach(function (row) { row.classList.remove("is-right", "is-wrong"); });
        });
      });
      document.querySelectorAll('input[name="r-pick"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
          markStale("r-pick");
          document.querySelectorAll("[data-r-pick]").forEach(function (row) { row.classList.remove("is-right", "is-wrong"); });
        });
      });
    }

    return {
      learnedId: "r-learned",
      learnedFb: "fb-r-learned",
      match: match,
      check: check,
      listen: listen,
      reset: function () {
        match.reset();
        document.querySelectorAll("[data-r-check], [data-r-pick]").forEach(function (row) { row.classList.remove("is-right", "is-wrong"); });
        markField(document.getElementById("r-stage"), false);
        markResult(document.getElementById("r-stage"), null);
      },
      links: function (result, wreckScore) {
        var links = [];
        if (wreckScore < 6 || result.results.pick.status !== "ok" || result.results.match.status !== "ok") {
          links.push('<a href="#wreck">בדיקת הסידור</a>');
        }
        if (result.results.stage.status !== "ok" || result.results.checks.status !== "ok") {
          links.push('<a href="#checks">בדיקת הנתיבים והתוצר</a>');
        }
        return links;
      }
    };
  }

  /* ---------- Submit ---------- */
  /* Submit is open only after a valid check that has not changed since, and never in review mode. */
  function updateSubmit() {
    if (!submitButton) {
      return;
    }
    submitButton.disabled = submitted || !state.result || state.stale || Dive.lms.isReviewMode();
  }

  function lockForm() {
    form.querySelectorAll("input, select, textarea, button").forEach(function (element) {
      element.disabled = true;
    });
  }

  function showSubmitStatus(kind, text) {
    submitStatus.className = "submit-status is-" + kind;
    submitStatus.textContent = text;
    submitStatus.hidden = false;
    submitStatus.focus();
  }

  var lastOutcome = null;

  /* One sentence on the score and pass/fail, shared by every submit message. */
  function outcomeText(outcome) {
    var text = "הציון שלכם: " + outcome.score + ". ";
    if (outcome.passed) {
      text += "עברתם את היחידה!";
    } else {
      text += "ציון המעבר הוא " + Dive.lms.PASS_MARK + ".";
    }
    if (outcome.keptPass) {
      text += " כבר עברתם את היחידה קודם, ולכן הסטטוס נשאר ״עבר״.";
    }
    if (outcome.keptScore !== null) {
      text += " הציון הקודם (" + outcome.keptScore + ") גבוה יותר, ולכן הוא נשמר.";
    }
    return text;
  }

  /* A score under the pass mark shows in red; green only when the unit counts as passed. */
  function outcomeKind(outcome) {
    return outcome.passed || outcome.keptPass ? "ok" : "failed";
  }

  function onSaveResult(ok) {
    retryButton.hidden = ok;
    if (ok) {
      showSubmitStatus(outcomeKind(lastOutcome), "ההגשה נשמרה במערכת הלמידה. " + outcomeText(lastOutcome));
    } else {
      showSubmitStatus("error", "השמירה במערכת הלמידה נכשלה. אל תסגרו את החלון ונסו שוב.");
    }
  }

  function submit() {
    /* Disable first, so a fast double click reports only once. */
    if (submitted || submitButton.disabled) {
      return;
    }
    submitted = true;
    updateSubmit();
    lockForm();
    /* After submitting, the track can no longer change. */
    Dive.track.lock();

    var score = Math.round(state.result.score / state.result.total * 100);
    if (!Dive.lms.isConnected()) {
      lastOutcome = Dive.lms.outcomeFor(score);
      showSubmitStatus(lastOutcome.passed ? "local" : "failed", "ההגשה הסתיימה. " + outcomeText(lastOutcome) + " הציון לא נשמר – היחידה פתוחה מחוץ למערכת הלמידה.");
      return;
    }
    var learned = document.getElementById(quiz().learnedId).value;
    lastOutcome = Dive.lms.submitAttempt(Dive.report.buildInteractions(state.result, learned), score);
    onSaveResult(lastOutcome.ok);
  }

  function bindCounter(fieldId, countId, feedbackId) {
    var field = document.getElementById(fieldId);
    function update() {
      document.getElementById(countId).textContent = field.value.length + "/" + field.maxLength + " תווים";
    }
    field.addEventListener("input", function () {
      update();
      if (state.result) {
        document.getElementById(feedbackId).classList.add("is-stale");
      }
    });
    return update;
  }

  var counters = [];

  /* Clears every answer in both tracks (used when the learner switches track). */
  function reset() {
    form.reset();
    quizzes.first.reset();
    quizzes.refresh.reset();
    form.querySelectorAll(".feedback").forEach(function (box) {
      box.innerHTML = "";
      box.classList.remove("is-stale");
    });
    counters.forEach(function (update) { update(); });
    state.result = null;
    state.stale = false;
    summary.innerHTML = "";
    document.getElementById("logbook-stale").hidden = true;
    updateSubmit();
    Dive.debrief.render();
  }

  function init() {
    form = document.getElementById("logbook-form");
    summary = document.getElementById("logbook-summary");
    submitButton = document.getElementById("logbook-submit");
    submitStatus = document.getElementById("logbook-submit-status");
    retryButton = document.getElementById("logbook-retry");

    quizzes.first = createFirstQuiz();
    quizzes.refresh = createRefreshQuiz();

    submitButton.addEventListener("click", submit);
    retryButton.addEventListener("click", function () {
      onSaveResult(Dive.lms.retry());
    });
    counters.push(bindCounter("q-learned", "q-learned-count", "fb-learned"));
    counters.push(bindCounter("r-learned", "r-learned-count", "fb-r-learned"));
    updateSubmit();

    /* Start empty: browsers may restore old answers after a reload. */
    form.reset();
    quizzes.first.match.render();
    quizzes.refresh.match.render();
    quizzes.first.listen();
    quizzes.refresh.listen();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!submitted) {
        quiz().check();
      }
    });
  }

  /* True once anything in the form was answered or checked (used to decide whether a track switch needs a warning). */
  function hasProgress() {
    if (state.result) {
      return true;
    }
    if (Object.keys(quizzes.first.match.pairs()).length || Object.keys(quizzes.refresh.match.pairs()).length) {
      return true;
    }
    return Array.prototype.some.call(form.querySelectorAll("input, select, textarea"), function (field) {
      return field.type === "checkbox" || field.type === "radio" ? field.checked : field.value.trim() !== "";
    });
  }

  return {
    init: init,
    reset: reset,
    hasProgress: hasProgress,
    isSubmitted: function () { return submitted; },
    links: function (result, wreckScore) { return quizzes[result.track].links(result, wreckScore); }
  };
})();

Dive.debrief = (function () {
  function render() {
    var ui = Dive.ui;
    var wreck = Dive.state.wreck;
    var form = Dive.state.form;
    var refresh = Dive.state.track === "refresh";
    var box = document.getElementById("debrief-result");

    /* The summary appears only after the form answers have been checked. */
    document.getElementById("debrief").hidden = !form.result;
    var wreckValid = wreck.result && !wreck.stale;
    var formValid = form.result && !form.stale;
    var lines = [];

    lines.push("<li>" + (refresh ? "תיקון הסידור של עמית" : "שיבוץ הקבצים") + ": " + (wreckValid ? wreck.result.score + " מתוך 6 במקום" : "עדיין לא נבדק") + "</li>");
    lines.push("<li>בדיקת ההבנה: " + (formValid ? form.result.score + " מתוך 4 נקודות" : "עדיין לא נבדק") + "</li>");

    var message = refresh
      ? "כדי לראות את התמונה המלאה, תקנו ובדקו גם את הסידור של עמית."
      : "כדי לראות את התמונה המלאה, בדקו גם את תרגול שיבוץ הקבצים.";
    var links = "";
    var list = formValid ? Dive.logbook.links(form.result, wreckValid ? wreck.result.score : 6) : [];
    if (wreckValid && formValid) {
      var perfect = wreck.result.score === 6 && form.result.score === 4;
      message = perfect
        ? ui.status("ok", "עמדתם בכל היעדים") + " <span>כל הפעילויות הושלמו בלי טעויות. אפשר להגיש בלב שלם.</span>"
        : ui.status("partial", "השלמתם, אבל עם טעויות") + " <span>עברתם על כל הפעילויות, ונשארו כמה תשובות שלא מדויקות. מומלץ לחזור לחלקים שבקישורים, לתקן ולבדוק שוב לפני ההגשה.</span>";
    }
    if (formValid && list.length && !(wreckValid && wreck.result.score === 6 && form.result.score === 4)) {
      links = '<p class="debrief__links">כדאי לחזור אל: ' + list.join(" · ") + "</p>";
    }
    var tone = message.indexOf("status--ok") !== -1 ? "is-ok" : message.indexOf("status--partial") !== -1 ? "is-partial" : "";
    box.innerHTML = "<ul>" + lines.join("") + '</ul><p class="debrief__message ' + tone + '">' + message + "</p>" + links;
  }

  return { render: render };
})();
