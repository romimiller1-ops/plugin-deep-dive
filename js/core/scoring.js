/* Pure scoring and validation: no DOM, and the same input always gives the same result. */
window.Dive = window.Dive || {};

Dive.scoring = (function () {
  function scoreWreck(placements) {
    var files = Dive.content.files;
    var missing = files.filter(function (file) {
      return !placements[file.id];
    });
    if (missing.length) {
      return { complete: false, missing: missing.map(function (file) { return file.id; }) };
    }
    var results = files.map(function (file) {
      return { id: file.id, correct: placements[file.id] === file.target };
    });
    var score = results.filter(function (result) { return result.correct; }).length;
    return {
      complete: true,
      results: results,
      score: score,
      total: files.length,
      level: score === files.length ? "ok" : score === 0 ? "bad" : "partial"
    };
  }

  /* items: [{ id, answer }]; defaults to the first-track file/role pairs (each file's answer is itself). */
  function scoreMatch(pairs, items) {
    var list = items || Dive.content.form.matchRoles.map(function (item) {
      return { id: item.file, answer: item.file };
    });
    var answered = list.filter(function (item) { return pairs[item.id]; }).length;
    if (answered < list.length) {
      return { status: "missing", remaining: list.length - answered };
    }
    /* Each pair is worth an equal share of the point: 4 of 5 right is 0.8. */
    var right = list.filter(function (item) { return pairs[item.id] === item.answer; }).length;
    return { status: level(right, list.length), points: right / list.length, right: right };
  }

  /* ok: all right, bad: none right, partial: anything in between. */
  function level(right, total) {
    return right === total ? "ok" : right === 0 ? "bad" : "partial";
  }

  function scoreFirstStep(value, right) {
    if (!value) {
      return { status: "missing" };
    }
    var correct = value === (right || Dive.content.form.firstStep.right);
    return { status: correct ? "ok" : "bad", points: correct ? 1 : 0, value: value };
  }

  /* picked: { key: bool }. defs: { key: { right } }; defaults to the first-track checks.
     Every option is one decision worth an equal share of the point: ticking a right option, or leaving
     a wrong one unticked, earns its share. With 3 options: one right tick plus one wrong tick is 1/3.
     The form allows at most two ticks (checksMax), so ticking everything cannot collect points. */
  function scoreChecks(picked, defs) {
    var all = defs || Dive.content.form.checks;
    var keys = Object.keys(all);
    if (!keys.some(function (key) { return picked[key]; })) {
      return { status: "missing" };
    }
    var right = keys.filter(function (key) { return Boolean(picked[key]) === all[key].right; }).length;
    return { status: level(right, keys.length), points: right / keys.length, right: right };
  }

  /* raw: the field's value. badInput: true when the browser could not read a number (letters were typed).
     Validation comes before grading: a folder count is a whole number, 0 or more. */
  function scoreCount(raw, badInput) {
    var text = String(raw).trim();
    if (badInput) {
      return { status: "invalid", reason: "format" };
    }
    if (text === "") {
      return { status: "missing" };
    }
    var value = Number(text);
    if (isNaN(value)) {
      return { status: "invalid", reason: "format" };
    }
    if (value < 0) {
      return { status: "invalid", reason: "negative" };
    }
    if (value % 1 !== 0) {
      return { status: "invalid", reason: "fraction" };
    }
    var correct = value === Dive.content.form.count.right;
    return { status: correct ? "ok" : "bad", points: correct ? 1 : 0, value: value };
  }

  /* Refresh Q4: one file from a short list. */
  function scorePick(value, right) {
    if (!value) {
      return { status: "missing" };
    }
    var correct = value === right;
    return { status: correct ? "ok" : "bad", points: correct ? 1 : 0, value: value };
  }

  /* Refresh practice, step 1: did the learner flag exactly the files that are out of place?
     flags: { fileId: true }, arrangement: { fileId: folderId } */
  function scoreAudit(flags, arrangement) {
    var files = Dive.content.files;
    var results = files.map(function (file) {
      var wrong = arrangement[file.id] !== file.target;
      var flagged = Boolean(flags[file.id]);
      return { id: file.id, wrong: wrong, flagged: flagged, correct: wrong === flagged };
    });
    var right = results.filter(function (item) { return item.correct; }).length;
    return {
      results: results,
      right: right,
      total: files.length,
      level: right === files.length ? "ok" : right === 0 ? "bad" : "partial"
    };
  }

  return {
    scoreWreck: scoreWreck,
    scorePick: scorePick,
    scoreAudit: scoreAudit,
    scoreMatch: scoreMatch,
    scoreFirstStep: scoreFirstStep,
    scoreChecks: scoreChecks,
    scoreCount: scoreCount
  };
})();
