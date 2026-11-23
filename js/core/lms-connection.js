/* LMS adapter (SCORM 1.2 via the pipwerks wrapper).
   Every API call goes through this module, so the unit keeps working outside an LMS. */
window.Dive = window.Dive || {};

Dive.lms = (function () {
  var NOTICE_OUTSIDE = "אתם צופים ביחידה מחוץ למערכת הלמידה. אפשר ללמוד ולענות, אבל התשובות והציון לא יישמרו.";
  var NOTICE_REVIEW = "מצב צפייה – אפשר לענות ולבדוק, אבל התשובות לא יישמרו.";
  var GREETING_FALLBACK = "שלום לכם, צוללים! ברוכים הבאים לצלילה.";
  var NOTICE_PASSED = "כבר עברתם את היחידה. אפשר לענות שוב, והציון הקודם יישמר אם הוא גבוה יותר.";
  var PASS_MARK = 75;

  var scorm = window.pipwerks && window.pipwerks.SCORM;
  var connected = false;
  var terminated = false;
  var lessonMode = "normal";
  var startTime = Date.now();
  var entryStatus = "";
  var entryScore = NaN;

  /* Guarded read: returns "" when there is no LMS connection or the field is empty. */
  function get(field) {
    if (!connected || terminated) {
      return "";
    }
    var value = scorm.get(field);
    return value === null || value === undefined ? "" : String(value);
  }

  /* Moodle returns "Last, First"; the learner sees "First Last". */
  function formatName(raw) {
    var text = String(raw || "").trim();
    var comma = text.indexOf(",");
    if (comma === -1) {
      return text;
    }
    var last = text.slice(0, comma).trim();
    var first = text.slice(comma + 1).trim();
    return (first + " " + last).trim();
  }

  function showGreeting(name) {
    var element = document.getElementById("learner-greeting");
    if (element) {
      element.textContent = name ? "שלום " + name + ", ברוכים הבאים לצלילה!" : GREETING_FALLBACK;
    }
  }

  function showNotice(text) {
    var element = document.getElementById("lms-notice");
    if (!element) {
      return;
    }
    element.hidden = !text;
    element.textContent = text || "";
  }

  function pad(number, size) {
    var text = String(number);
    while (text.length < size) {
      text = "0" + text;
    }
    return text;
  }

  /* Time since the page loaded, in the SCORM 1.2 timespan format HHHH:MM:SS. */
  function sessionTime() {
    var seconds = Math.floor((Date.now() - startTime) / 1000);
    return pad(Math.min(Math.floor(seconds / 3600), 9999), 4) + ":" + pad(Math.floor(seconds / 60) % 60, 2) + ":" + pad(seconds % 60, 2);
  }

  /* Closes the session once; safe to call from several exit paths.
     pipwerks sets cmi.core.exit itself (suspend while incomplete, logout after passed/failed). */
  function quit() {
    if (!connected || terminated) {
      return;
    }
    if (!isReviewMode()) {
      scorm.set("cmi.core.session_time", sessionTime());
    }
    terminated = true;
    scorm.quit();
  }

  function init() {
    if (scorm) {
      scorm.version = "1.2";
      connected = scorm.init() === true;
    }

    if (!connected) {
      showGreeting("");
      showNotice(NOTICE_OUTSIDE);
      return;
    }

    lessonMode = get("cmi.core.lesson_mode") || "normal";
    entryStatus = get("cmi.core.lesson_status");
    entryScore = parseFloat(get("cmi.core.score.raw"));
    showGreeting(formatName(get("cmi.core.student_name")));
    showNotice(isReviewMode() ? NOTICE_REVIEW : alreadyPassed() ? NOTICE_PASSED : "");

    restoreSuspend();
    Dive.prefs.onSave(scheduleSuspend);
    window.addEventListener("pagehide", function () {
      writeSuspend();
      quit();
    });
  }

  /* ---------- Preferences in cmi.suspend_data ----------
     Small JSON: { v, text }. The text size is restored from here, so it follows the learner across devices.
     (The track is not stored: every visit opens on the two track cards, and the chosen track is reported
     with the answers as Q0.) Nothing is written in review/browse mode. */
  var SUSPEND_VERSION = 1;
  var suspend = { v: SUSPEND_VERSION };
  var suspendTimer = null;

  function restoreSuspend() {
    var raw = get("cmi.suspend_data");
    if (!raw) {
      return;
    }
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.v === SUSPEND_VERSION) {
        suspend = parsed;
      }
    } catch (error) {
      console.warn("suspend_data is not ours; ignoring it.");
    }
    if (suspend.text) {
      Dive.textSize.set(suspend.text, false);
    }
  }

  function writeSuspend() {
    window.clearTimeout(suspendTimer);
    suspendTimer = null;
    if (!canReport()) {
      return;
    }
    if (scorm.set("cmi.suspend_data", JSON.stringify(suspend))) {
      scorm.save();
    } else {
      logFailure("cmi.suspend_data");
    }
  }

  /* A short delay groups several quick clicks into one commit. */
  function scheduleSuspend(key, value) {
    if (key !== "text-size") {
      return;
    }
    suspend.text = value;
    window.clearTimeout(suspendTimer);
    suspendTimer = window.setTimeout(writeSuspend, 500);
  }


  /* review = re-opening a finished attempt, browse = Moodle preview: nothing is stored in either. */
  function isReviewMode() {
    return lessonMode === "review" || lessonMode === "browse";
  }

  function isConnected() {
    return connected && !terminated;
  }

  /* The learner passed earlier in this same attempt: the status must never go back down. */
  function alreadyPassed() {
    return entryStatus === "passed";
  }

  /* True only when results may be written to the LMS. */
  function canReport() {
    return isConnected() && !isReviewMode();
  }

  /* Writes that failed last time; a retry sends only these, so nothing is duplicated. */
  var pending = [];

  function logFailure(key) {
    var code = scorm.debug.getCode();
    console.warn("SCORM set failed: " + key + " (error " + code + ": " + scorm.debug.getInfo(code) + ")");
  }

  /* Sends the pending writes, then commits. Returns true only if every write and the commit succeeded. */
  function flush() {
    var failed = pending.filter(function (call) {
      var ok = scorm.set(call.key, call.value);
      if (!ok) {
        logFailure(call.key);
      }
      return !ok;
    });
    pending = failed;
    var saved = scorm.save();
    if (!saved) {
      console.warn("SCORM save failed.");
    }
    return failed.length === 0 && saved;
  }

  /* Queues one interaction per question, starting at cmi.interactions._count so earlier ones are kept.
     items: [{ id, type, student_response, pattern?, result, weighting, time }] */
  function queueInteractions(items) {
    var start = parseInt(get("cmi.interactions._count"), 10);
    if (isNaN(start)) {
      start = 0;
    }
    items.forEach(function (item, offset) {
      var prefix = "cmi.interactions." + (start + offset) + ".";
      /* id and type first: the LMS needs them before the other fields of the same interaction. */
      pending.push({ key: prefix + "id", value: item.id });
      pending.push({ key: prefix + "type", value: item.type });
      pending.push({ key: prefix + "student_response", value: item.student_response });
      if (item.pattern !== undefined) {
        pending.push({ key: prefix + "correct_responses.0.pattern", value: item.pattern });
      }
      pending.push({ key: prefix + "result", value: item.result });
      pending.push({ key: prefix + "weighting", value: item.weighting });
      pending.push({ key: prefix + "time", value: item.time });
    });
  }

  /* Pass/fail outcome for a score, including the "never downgrade a pass" rule from the spec. */
  function outcomeFor(score) {
    var passed = score >= PASS_MARK;
    var keepPrevious = alreadyPassed() && !isNaN(entryScore) && score <= entryScore;
    return {
      score: score,
      passed: passed,
      keptPass: alreadyPassed() && !passed,
      keptScore: keepPrevious ? entryScore : null
    };
  }

  /* The whole submit in one queue: interactions, score, status, one commit, then quit.
     score: 0-100. Returns the outcome with ok = whether everything reached the LMS. */
  function submitAttempt(items, score) {
    var outcome = outcomeFor(score);
    if (!canReport()) {
      outcome.ok = false;
      return outcome;
    }
    pending = [];
    queueInteractions(items);
    if (outcome.keptScore === null) {
      pending.push({ key: "cmi.core.score.raw", value: String(score) });
      pending.push({ key: "cmi.core.score.min", value: "0" });
      pending.push({ key: "cmi.core.score.max", value: "100" });
    }
    if (outcome.passed) {
      pending.push({ key: "cmi.core.lesson_status", value: "passed" });
    } else if (!outcome.keptPass) {
      pending.push({ key: "cmi.core.lesson_status", value: "failed" });
    }
    /* The attempt is finished either way. pipwerks would write "suspend" after a fail,
       so we set exit ourselves and switch off its own exit handling before quit. */
    pending.push({ key: "cmi.core.exit", value: "logout" });
    outcome.ok = flush();
    if (outcome.ok) {
      finishAttempt();
    }
    return outcome;
  }

  function finishAttempt() {
    scorm.handleExitMode = false;
    quit();
  }

  /* Re-sends only what failed and commits again; closes the session once everything is stored. */
  function retry() {
    if (!isConnected()) {
      return false;
    }
    var ok = flush();
    if (ok) {
      finishAttempt();
    }
    return ok;
  }

  return {
    PASS_MARK: PASS_MARK,
    init: init,
    isConnected: isConnected,
    isReviewMode: isReviewMode,
    outcomeFor: outcomeFor,
    submitAttempt: submitAttempt,
    retry: retry
  };
})();
