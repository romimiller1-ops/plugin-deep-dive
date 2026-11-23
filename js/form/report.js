/* Turns a checked form result into SCORM 1.2 interaction records, following the mapping table in SCORM_SPEC (part 4).
   Responses are readable answer text rather than a/b/c codes, so the client can read the Moodle report directly
   (a deliberate deviation from the standard's short identifiers; Moodle accepts it).
   Pure: reads content data and the form's labels, never writes to the LMS. */
window.Dive = window.Dive || {};

Dive.report = (function () {
  var MAX_TEXT = 255;
  var SEPARATOR = "; ";

  function roleText(roleId) {
    return Dive.ui.byId(Dive.content.form.matchRoles.map(function (item) {
      return { id: item.file, role: item.role };
    }), roleId).role;
  }

  /* Q1: "file: chosen role" for every file, in the order the question shows them. */
  function matchingResponse(pairs) {
    return Dive.content.form.matchRoles.map(function (item) {
      return Dive.ui.byId(Dive.content.files, item.file).name + ": " + roleText(pairs[item.file]);
    }).join(SEPARATOR);
  }

  function correctPairs() {
    var pairs = {};
    Dive.content.form.matchRoles.forEach(function (item) {
      pairs[item.file] = item.file;
    });
    return pairs;
  }

  /* Q2: the text of the chosen option, as the learner saw it. */
  function firstStepText(value) {
    var option = document.querySelector('#q-first option[value="' + value + '"]');
    return option ? option.textContent.trim() : value;
  }

  /* Q3: the label of every ticked option, in the order they appear. */
  function checksResponse(picked) {
    return Object.keys(Dive.content.form.checks).filter(function (key) {
      return picked[key];
    }).map(function (key) {
      return document.querySelector('label[for="q-check-' + key + '"]').textContent.trim();
    }).join(SEPARATOR);
  }

  function checksPattern() {
    var right = {};
    Object.keys(Dive.content.form.checks).forEach(function (key) {
      right[key] = Dive.content.form.checks[key].right;
    });
    return checksResponse(right);
  }

  /* SCORM 1.2 text fields reject line breaks and anything past 255 characters. */
  function cleanText(text) {
    return String(text || "").replace(/\s*[\r\n]+\s*/g, " ").trim().slice(0, MAX_TEXT);
  }

  function pad(number) {
    return (number < 10 ? "0" : "") + number;
  }

  function clockTime(date) {
    return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  }

  /* SCORM 1.2 result: "correct", "wrong", or a decimal. A partly right answer is reported as its share of
     the point (for example 0.8 or 0.33), so the LMS report matches the score instead of showing it as wrong. */
  function outcome(result) {
    if (result.status === "ok") {
      return "correct";
    }
    return result.status === "partial" ? String(Math.round(result.points * 100) / 100) : "wrong";
  }

  /* Refresh Q1: "symptom: chosen file" for every symptom, in the order the question shows them. */
  function symptomResponse(pairs) {
    return Dive.content.refreshForm.match.items.map(function (item) {
      return item.label + ": " + (pairs[item.id] ? Dive.ui.byId(Dive.content.files, pairs[item.id]).name : "");
    }).join(SEPARATOR);
  }

  function symptomPattern() {
    var pairs = {};
    Dive.content.refreshForm.match.items.forEach(function (item) {
      pairs[item.id] = item.answer;
    });
    return symptomResponse(pairs);
  }

  function optionText(selectId, value) {
    var option = document.querySelector("#" + selectId + ' option[value="' + value + '"]');
    return option ? option.textContent.trim() : value;
  }

  function labelsResponse(prefix, defs, picked) {
    return Object.keys(defs).filter(function (key) {
      return picked[key];
    }).map(function (key) {
      return document.querySelector('label[for="' + prefix + key + '"]').textContent.trim();
    }).join(SEPARATOR);
  }

  function rightPicks(defs) {
    var right = {};
    Object.keys(defs).forEach(function (key) {
      right[key] = defs[key].right;
    });
    return right;
  }

  function fileNameOf(id) {
    var file = Dive.ui.byId(Dive.content.files, id);
    return file ? file.name : id;
  }

  /* The learning track: always the first record, so the LMS report shows it before any answer. */
  function trackInteraction(track, time) {
    return {
      id: "Q0_learning_track",
      type: "choice",
      student_response: cleanText(Dive.content.tracks.labels[track]),
      result: "neutral",
      weighting: "0",
      time: time
    };
  }

  function firstTrackItems(answers, results, time) {
    return [
      {
        id: "Q1_match_files_to_roles",
        type: "matching",
        student_response: cleanText(matchingResponse(answers.pairs)),
        pattern: cleanText(matchingResponse(correctPairs())),
        result: outcome(results.match),
        weighting: "1",
        time: time
      },
      {
        id: "Q2_first_step_in_plugin_dev",
        type: "choice",
        student_response: cleanText(firstStepText(answers.first)),
        pattern: cleanText(firstStepText(Dive.content.form.firstStep.right)),
        result: outcome(results.first),
        weighting: "1",
        time: time
      },
      {
        id: "Q3_checks_for_valid_output",
        type: "choice",
        student_response: cleanText(checksResponse(answers.picked)),
        pattern: cleanText(checksPattern()),
        result: outcome(results.checks),
        weighting: "1",
        time: time
      },
      {
        id: "Q4_folders_referenced_by_skill_md",
        type: "numeric",
        student_response: String(answers.count).trim(),
        pattern: String(Dive.content.form.count.right),
        result: outcome(results.count),
        weighting: "1",
        time: time
      }
    ];
  }

  function refreshTrackItems(answers, results, time) {
    var cfg = Dive.content.refreshForm;
    return [
      {
        id: "Q1_match_symptom_to_file",
        type: "matching",
        student_response: cleanText(symptomResponse(answers.pairs)),
        pattern: cleanText(symptomPattern()),
        result: outcome(results.match),
        weighting: "1",
        time: time
      },
      {
        id: "Q2_stage_to_fix_ungrounded_output",
        type: "choice",
        student_response: cleanText(optionText("r-stage", answers.stage)),
        pattern: cleanText(optionText("r-stage", cfg.stage.right)),
        result: outcome(results.stage),
        weighting: "1",
        time: time
      },
      {
        id: "Q3_signs_of_misplaced_file",
        type: "choice",
        student_response: cleanText(labelsResponse("r-check-", cfg.checks, answers.picked)),
        pattern: cleanText(labelsResponse("r-check-", cfg.checks, rightPicks(cfg.checks))),
        result: outcome(results.checks),
        weighting: "1",
        time: time
      },
      {
        id: "Q4_refresh_file_to_fix",
        type: "choice",
        student_response: cleanText(fileNameOf(answers.pick)),
        pattern: cleanText(fileNameOf(cfg.pick.right)),
        result: outcome(results.pick),
        weighting: "1",
        time: time
      }
    ];
  }

  /* result: state.form.result after a valid check (it carries its track). learnedText: the optional open answer.
     Order: the track first, then Q1-Q4, then the open answer if there is one. */
  function buildInteractions(result, learnedText, now) {
    var time = clockTime(now || new Date());
    var track = result.track === "refresh" ? "refresh" : "first";
    var list = [trackInteraction(track, time)].concat(
      track === "refresh" ? refreshTrackItems(result.answers, result.results, time) : firstTrackItems(result.answers, result.results, time)
    );

    var learned = cleanText(learnedText);
    if (learned) {
      list.push({
        id: track === "refresh" ? "Q5_one_thing_i_will_check" : "Q5_one_thing_i_learned",
        type: "fill-in",
        student_response: learned,
        result: "neutral",
        weighting: "0",
        time: time
      });
    }
    return list;
  }

  return { buildInteractions: buildInteractions };
})();
