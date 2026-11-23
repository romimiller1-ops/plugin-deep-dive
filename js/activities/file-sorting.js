/* Main practice: place the files in the folder tree, then watch the request
   travel through the structure the learner actually built.
   Refresh track: the files start in an arrangement "a colleague already built", with three mistakes.
   Step 1 (spot): flag the files that are out of place. Step 2 (fix): move them, then the same check as above. */
window.Dive = window.Dive || {};

Dive.wreck = (function () {
  var STEP_MS = 800;
  var DRAG_THRESHOLD = 6;

  var data = Dive.content;
  var state = Dive.state.wreck;
  var ui = Dive.ui;
  var selectedFile = null;
  var replayTimers = [];

  var tree, tray, summary, details, skipButton;
  /* The tray shows the files in a shuffled order, so the order itself is never a hint. */
  var trayOrder = [];
  var arrangement = Dive.content.tracks.arrangement;

  function isRefresh() {
    return Dive.state.track === "refresh";
  }

  /* Refresh phases: "spot" (flagging), "spotted" (identification checked, results shown), "fix" (moving files). */
  function isSpotting() {
    return isRefresh() && (state.phase === "spot" || state.phase === "spotted");
  }

  function placeFile(fileId, folderId) {
    state.placements[fileId] = folderId || undefined;
    if (!folderId) {
      delete state.placements[fileId];
    }
    if (state.result) {
      state.stale = true;
    }
    selectedFile = null;
    render();
    var file = ui.byId(data.files, fileId);
    var folder = ui.byId(data.folders, folderId);
    ui.announce(folder ? file.name + " הועבר אל " + folder.label : file.name + " הוחזר למגש");
  }

  function fileChip(file) {
    if (isSpotting()) {
      var flagged = Boolean(state.flags[file.id]);
      var done = state.phase === "spotted" ? ' aria-disabled="true"' : "";
      return '<button type="button" class="file-chip file-chip--spot' + (flagged ? " is-flagged" : "") + '" data-file="' + file.id + '" aria-pressed="' + flagged + '"' + done + '>' +
        ui.icon("file-earmark-text") + '<span class="visually-hidden">סימון לתיקון: </span><span dir="ltr" lang="en">' + file.name + "</span>" +
        '<span class="file-chip__flag" aria-hidden="true">' + ui.icon("exclamation-triangle") + "לתיקון</span></button>";
    }
    var pressed = selectedFile === file.id;
    var toFix = isRefresh() && state.audit && state.audit.wrongIds.indexOf(file.id) !== -1;
    return '<button type="button" class="file-chip' + (toFix ? " is-flagged" : "") + '" data-file="' + file.id + '" aria-pressed="' + pressed + '">' +
      ui.icon("file-earmark-text") + '<span dir="ltr" lang="en">' + file.name + "</span>" +
      (toFix ? '<span class="file-chip__flag">' + ui.icon("exclamation-triangle") + "לתיקון</span>" : "") + "</button>";
  }

  function renderTree() {
    tree.innerHTML = data.folders.map(function (folder) {
      var inside = data.files.filter(function (file) {
        return state.placements[file.id] === folder.id;
      }).map(fileChip).join("");
      return '<div class="dock dock--level-' + folder.level + '" data-folder="' + folder.id + '">' +
        '<button type="button" class="dock__head" data-folder="' + folder.id + '">' +
        ui.icon("folder2-open") + '<span dir="ltr" lang="en">' + folder.label + "</span></button>" +
        '<div class="dock__files">' + inside + "</div></div>";
    }).join("");
  }

  function shuffleTray() {
    var ids = data.files.map(function (file) { return file.id; });
    var original = ids.join();
    do {
      for (var i = ids.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var keep = ids[i];
        ids[i] = ids[j];
        ids[j] = keep;
      }
    } while (ids.join() === original);
    trayOrder = ids;
  }

  function renderTray() {
    var loose = trayOrder.map(function (id) {
      return ui.byId(data.files, id);
    }).filter(function (file) {
      return !state.placements[file.id];
    });
    tray.innerHTML = loose.length ? loose.map(fileChip).join("") : '<p class="m-0">כל הקבצים שובצו.</p>';
  }


  function renderStale() {
    var note = document.getElementById("wreck-stale");
    note.hidden = !state.stale;
    details.classList.toggle("is-stale", state.stale);
  }

  function renderHint() {
    var hint = document.getElementById("wreck-hint");
    var file = selectedFile && ui.byId(data.files, selectedFile);
    hint.textContent = file ? "נבחר הקובץ " + file.name + ". עכשיו לחצו על התיקייה המתאימה." : "";
    tree.classList.toggle("is-picking", Boolean(file));
  }

  /* Labels, steps and which helpers are offered depend on the track and the phase. */
  function renderPhase() {
    var refresh = isRefresh();
    var spotting = isSpotting();
    document.getElementById("wreck-tray-box").hidden = refresh;
    document.getElementById("wreck-area").classList.toggle("wreck--full", refresh);
    var stage = state.phase === "fix" ? "fix" : "spot";
    document.getElementById("wreck-check-label").textContent = spotting ? "בדיקת הזיהוי" : "בדיקת הסידור";
    document.getElementById("wreck-check").hidden = refresh && state.phase === "spotted";
    document.getElementById("audit-next-box").hidden = !(refresh && state.phase === "spotted");
    document.getElementById("wreck-reset-refresh").textContent = state.phase === "fix"
      ? "הקבצים יחזרו למקום שבו עמית השאיר אותם, ותוכלו לתקן שוב. הזיהוי משלב 1 יישאר."
      : "הסימונים יימחקו, ותוכלו לזהות מחדש.";
    document.getElementById("audit-task-spot").hidden = !spotting;
    document.getElementById("audit-task-fix").hidden = !refresh || spotting;
    document.getElementById("audit-stage-title").textContent = stage === "fix"
      ? "שלב 2 מתוך 2: מחזירים את הקבצים הביתה"
      : "שלב 1 מתוך 2: מאתרים קבצים שלא במקום";
    document.querySelectorAll("[data-audit-step]").forEach(function (item) {
      var step = item.dataset.auditStep;
      item.classList.toggle("is-current", refresh && step === stage);
      item.classList.toggle("is-done", refresh && step === "spot" && stage === "fix");
      if (refresh && step === stage) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function render() {
    renderPhase();
    renderHint();
    renderTree();
    renderTray();
    renderStale();
  }

  function clearReplay() {
    replayTimers.forEach(window.clearTimeout);
    replayTimers = [];
    skipButton.hidden = true;
  }

  function buildRouteSteps() {
    return data.route.map(function (step) {
      var file = ui.byId(data.files, step.file);
      var ok = state.placements[file.id] === file.target;
      return { ok: ok, file: file.id, text: file.name + ": " + (ok ? step.found : step.lost), folder: state.placements[file.id] };
    });
  }

  /* Each file is judged on its own chip, so a folder holding one right and one wrong file is never shown as all right. */
  function markChip(fileId, ok) {
    var chip = tree.querySelector('.file-chip[data-file="' + fileId + '"]');
    if (chip) {
      chip.classList.toggle("is-right", ok);
      chip.classList.toggle("is-wrong", !ok);
    }
  }

  /* The replay follows the request: one file at a time, as the request reaches it. */
  function showStep(step) {
    markChip(step.file, step.ok);
  }

  /* Final marks for every file (README is not on the request route) and every folder:
     a folder is green only when everything in it is right and nothing that belongs there is missing. */
  function markAll() {
    data.files.forEach(function (file) {
      markChip(file.id, state.placements[file.id] === file.target);
    });
    data.folders.forEach(function (folder) {
      var dock = tree.querySelector('.dock[data-folder="' + folder.id + '"]');
      var relevant = data.files.filter(function (file) {
        return file.target === folder.id || state.placements[file.id] === folder.id;
      });
      var broken = relevant.some(function (file) {
        return state.placements[file.id] !== file.target;
      });
      dock.classList.toggle("is-broken", broken);
      dock.classList.toggle("is-hit", relevant.length > 0 && !broken);
    });
  }

  /* One entry per file: where it went, whether that is right, what the file does,
     and what happened to the request because of it. */
  function renderDetails(result) {
    var showTarget = state.attempts >= 2;
    details.innerHTML = result.results.map(function (entry) {
      var file = ui.byId(data.files, entry.id);
      var chosen = ui.byId(data.folders, state.placements[file.id]);
      var target = ui.byId(data.folders, file.target);
      var step = data.route.filter(function (item) { return item.file === file.id; })[0];
      var body;
      if (entry.correct) {
        body = file.explain;
      } else {
        body = "שמתם אותו בתיקייה " + ui.fileName(chosen.label) + ". " +
          (showTarget ? "המקום הנכון: " + ui.fileName(target.label) + ". " + file.explain : "רמז: " + file.hint) +
          " " + (step ? step.lost : "הפלאגין יפעל גם בלי ההסבר, אבל מי שיפתח את התיקייה לא ימצא אותו.");
      }
      return '<li class="' + (entry.correct ? "is-right" : "is-wrong") + '">' +
        '<p class="wreck__file">' + ui.status(entry.correct ? "ok" : "bad", entry.correct ? "במקום" : "לא במקום") + " " + ui.fileName(file.name) + "</p>" +
        "<p>" + body + "</p></li>";
    }).join("");
  }

  function finish(result) {
    clearReplay();
    var messages = {
      ok: "כל הקבצים במקומם, והפלאגין מוכן לעבודה.",
      partial: result.score + " מתוך " + result.total + " קבצים במקומם.",
      bad: "אף קובץ לא נמצא במקומו. כדאי לחזור למבנה התיקיות."
    };
    summary.innerHTML = ui.status(result.level) + " <span>" + messages[result.level] + "</span>" +
      (result.level === "bad" ? ' <a href="#dive">חזרה למבנה התיקיות</a>' : "");
    markAll();
    renderDetails(result);
    document.getElementById("wreck").classList.toggle("is-solved", result.level === "ok");
    ui.announce(messages[result.level]);
    if (Dive.debrief) {
      Dive.debrief.render();
    }
  }

  /* Refresh step 1: one entry per file, then the fix step opens with the misplaced files tagged. */
  function checkAudit() {
    var result = Dive.scoring.scoreAudit(state.flags, arrangement);
    var notes = Dive.content.tracks.auditNotes;
    var flaggedCount = Object.keys(state.flags).filter(function (id) { return state.flags[id]; }).length;
    if (!flaggedCount) {
      summary.innerHTML = ui.status("missing") + " <span>עוד לא סימנתם אף קובץ. לחצו על קובץ שנראה לכם לא במקום.</span>";
      ui.announce("עוד לא סימנתם אף קובץ.");
      summary.focus();
      return;
    }
    state.audit = {
      right: result.right,
      total: result.total,
      wrongIds: result.results.filter(function (item) { return item.wrong; }).map(function (item) { return item.id; })
    };
    state.phase = "spotted";
    render();

    /* The mark on each file says whether the learner's call about it was right (green ✓) or not (red ✗),
       not whether the file itself is in place. */
    result.results.forEach(function (item) {
      markChip(item.id, item.correct);
    });
    details.innerHTML = result.results.map(function (item) {
      var file = ui.byId(data.files, item.id);
      var word, kind, body;
      if (item.wrong && item.flagged) {
        kind = "ok"; word = "זיהיתם נכון"; body = "הקובץ באמת לא במקום. " + notes[item.id];
      } else if (item.wrong) {
        kind = "bad"; word = "פספסתם"; body = "הקובץ הזה לא במקום, ולא סימנתם אותו. " + notes[item.id];
      } else if (item.flagged) {
        kind = "bad"; word = "סימון לא נכון"; body = "הקובץ הזה דווקא במקום. " + file.explain;
      } else {
        kind = "ok"; word = "נכון, הוא במקום"; body = "לא סימנתם אותו, ובצדק: הוא בדיוק איפה שהוא צריך להיות.";
      }
      return '<li class="' + (kind === "ok" ? "is-right" : "is-wrong") + '">' +
        '<p class="wreck__file">' + ui.status(kind, word) + " " + ui.fileName(file.name) + "</p><p>" + ui.codeify(body) + "</p></li>";
    }).join("");

    var messages = {
      ok: "עין של בודקים! זיהיתם נכון את כל ששת הקבצים.",
      partial: "חלק מהזיהויים מדויקים, וחלק עוד מתחבאים. הפירוט למטה מסביר כל קובץ.",
      bad: "הפעם הזיהוי לא הצליח, וזה בסדר. הפירוט למטה מסביר כל קובץ."
    };
    summary.innerHTML = ui.status(result.level, "זיהוי: " + result.right + " מתוך 6") + " <span>" + messages[result.level] +
      " כשתסיימו לקרוא, המשיכו לשלב 2 ותקנו את הסידור.</span>";
    summary.focus();
    ui.announce(messages[result.level] + " כשתסיימו לקרוא, המשיכו לשלב 2.");
  }

  /* Step 2 starts only when the learner asks for it, with a clean board and the misplaced files tagged. */
  function startFix() {
    state.phase = "fix";
    summary.textContent = "";
    details.innerHTML = "";
    render();
    var title = document.getElementById("audit-stage-title");
    title.scrollIntoView({ block: "start", behavior: Dive.motion.isEnabled() ? "smooth" : "auto" });
    title.focus({ preventScroll: true });
    ui.announce("שלב 2 מתוך 2: מחזירים את הקבצים הביתה.");
  }

  function check() {
    if (isSpotting()) {
      checkAudit();
      return;
    }
    clearReplay();
    details.innerHTML = "";
    var result = Dive.scoring.scoreWreck(state.placements);
    if (!result.complete) {
      state.result = null;
      state.stale = false;
      var missingText = result.missing.length === 1 ? "נותר קובץ אחד בלי תיקייה." : "נותרו " + result.missing.length + " קבצים בלי תיקייה.";
      summary.innerHTML = ui.status("missing") + " <span>" + missingText + "</span>";
      renderStale();
      var firstLoose = tray.querySelector(".file-chip");
      if (firstLoose) {
        firstLoose.focus();
      }
      ui.announce(missingText);
      return;
    }

    state.attempts += 1;
    state.result = result;
    state.stale = false;
    render();

    var steps = buildRouteSteps();
    if (!Dive.motion.isEnabled()) {
      steps.forEach(showStep);
      finish(result);
      return;
    }
    summary.textContent = "בודקים את המבנה שבניתם...";
    skipButton.hidden = false;
    steps.forEach(function (step, index) {
      replayTimers.push(window.setTimeout(function () { showStep(step); }, STEP_MS * index));
    });
    replayTimers.push(window.setTimeout(function () { finish(result); }, STEP_MS * steps.length));
    skipButton.onclick = function () {
      clearReplay();
        steps.forEach(showStep);
      finish(result);
      summary.focus();
    };
  }

  /* Starting point of the practice: empty for the first track, the colleague's arrangement for refresh. */
  function startState() {
    state.placements = isRefresh() ? Object.assign({}, arrangement) : {};
    state.phase = isRefresh() ? "spot" : null;
    state.flags = {};
    state.audit = null;
  }

  /* quiet=true: a full restart (track chosen or changed). A reset from the button in the refresh track's
     step 2 restarts only step 2: the files go back to the colleague's arrangement, the identification stays. */
  function reset(quiet) {
    clearReplay();
    if (quiet !== true && isRefresh() && state.phase === "fix") {
      state.placements = Object.assign({}, arrangement);
    } else {
      startState();
    }
    state.attempts = 0;
    state.result = null;
    state.stale = false;
    selectedFile = null;
    summary.textContent = "";
    details.innerHTML = "";
    document.getElementById("wreck").classList.remove("is-solved");
    shuffleTray();
    render();
    if (quiet !== true) {
      ui.announce("התרגול אופס.");
    }
    if (Dive.debrief) {
      Dive.debrief.render();
    }
  }

  /* Pointer dragging works for mouse and touch; click and select remain equivalent. */
  function enableDragging(area) {
    var drag = null;

    area.addEventListener("pointerdown", function (event) {
      var chip = event.target.closest(".file-chip");
      if (chip && event.button === 0 && !isSpotting()) {
        drag = { chip: chip, id: chip.dataset.file, x: event.clientX, y: event.clientY, ghost: null };
      }
    });

    window.addEventListener("pointermove", function (event) {
      if (!drag) {
        return;
      }
      if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > DRAG_THRESHOLD) {
        drag.ghost = drag.chip.cloneNode(true);
        drag.ghost.classList.add("file-chip--ghost");
        drag.ghost.setAttribute("aria-hidden", "true");
        document.body.appendChild(drag.ghost);
      }
      if (drag.ghost) {
        drag.ghost.style.setProperty("--x", event.clientX + "px");
        drag.ghost.style.setProperty("--y", event.clientY + "px");
      }
    });

    window.addEventListener("pointerup", function (event) {
      if (!drag) {
        return;
      }
      if (drag.ghost) {
        drag.ghost.remove();
        var under = document.elementFromPoint(event.clientX, event.clientY);
        var dock = under && under.closest(".dock");
        if (dock) {
          placeFile(drag.id, dock.dataset.folder);
        }
        area.dataset.justDragged = "1";
        window.setTimeout(function () { delete area.dataset.justDragged; }, 0);
      }
      drag = null;
    });
  }

  function onAreaClick(event) {
    if (event.currentTarget.dataset.justDragged) {
      return;
    }
    var chip = event.target.closest(".file-chip");
    var head = event.target.closest(".dock__head");
    if (chip && isSpotting()) {
      if (state.phase === "spotted") {
        return;
      }
      var id = chip.dataset.file;
      state.flags[id] = !state.flags[id];
      render();
      tree.querySelector('.file-chip[data-file="' + id + '"]').focus();
      ui.announce(ui.byId(data.files, id).name + (state.flags[id] ? " סומן לתיקון." : " כבר לא מסומן."));
      return;
    }
    if (chip) {
      selectedFile = selectedFile === chip.dataset.file ? null : chip.dataset.file;
      render();
      var focusTarget = document.querySelector('.file-chip[data-file="' + chip.dataset.file + '"]');
      if (focusTarget) {
        focusTarget.focus();
      }
      if (selectedFile) {
        ui.announce("נבחר " + ui.byId(data.files, selectedFile).name + ". עכשיו בחרו תיקייה.");
      }
    } else if (head && selectedFile) {
      var folderId = head.dataset.folder;
      placeFile(selectedFile, folderId);
      tree.querySelector('.dock__head[data-folder="' + folderId + '"]').focus();
    }
  }

  function init() {
    tree = document.getElementById("wreck-tree");
    tray = document.getElementById("wreck-tray");
    summary = document.getElementById("wreck-summary");
    details = document.getElementById("wreck-details");
    skipButton = document.getElementById("wreck-skip");

    shuffleTray();
    startState();
    render();

    var area = document.getElementById("wreck-area");
    area.addEventListener("click", onAreaClick);
    enableDragging(area);

    document.getElementById("wreck-check").addEventListener("click", check);
    document.getElementById("audit-next").addEventListener("click", startFix);
    document.getElementById("wreck-reset-confirm").addEventListener("click", reset);
  }

  /* Called when the track is chosen or changed: the practice starts over from that track's start. */
  function setTrack() {
    reset(true);
  }

  /* True once the learner has moved, flagged or checked anything. */
  function hasProgress() {
    if (state.result || state.audit || Object.keys(state.flags).some(function (id) { return state.flags[id]; })) {
      return true;
    }
    var start = isRefresh() ? arrangement : {};
    return data.files.some(function (file) {
      return (state.placements[file.id] || "") !== (start[file.id] || "");
    });
  }

  return { init: init, setTrack: setTrack, hasProgress: hasProgress };
})();
