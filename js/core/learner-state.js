/* Single serialisable learner state, ready to be stored by the LMS adapter later. */
window.Dive = window.Dive || {};

Dive.state = {
  /* "first" | "refresh" | null until the learner chooses. */
  track: null,
  /* Refresh practice adds: phase ("spot" | "fix"), flags and the audit result. */
  wreck: { placements: {}, attempts: 0, result: null, stale: false, phase: null, flags: {}, audit: null },
  form: { result: null, stale: false }
};

/* Shared UI helpers used by every activity. */
Dive.ui = (function () {
  var STATUS = {
    ok: { icon: "check-circle", word: "נכון" },
    partial: { icon: "dash-circle", word: "חלקי" },
    bad: { icon: "x-circle", word: "לא נכון" },
    missing: { icon: "dash-circle", word: "חסר" },
    invalid: { icon: "exclamation-triangle", word: "לא תקין" }
  };

  function icon(name) {
    return '<svg class="bi" aria-hidden="true"><use href="#' + name + '"></use></svg>';
  }

  /* Status always carries a word and an icon; colour is only an addition. */
  function status(kind, word) {
    var item = STATUS[kind];
    return '<span class="status status--' + kind + '">' + icon(item.icon) + "<span>" + (word || item.word) + "</span></span>";
  }

  function fileName(text) {
    return '<code class="fname" dir="ltr" lang="en">' + text + "</code>";
  }

  /* Marks file names, folder names and field names inside Hebrew text, so they read left to right. */
  var CODE_TOKENS = /([A-Za-z][\w-]*\.(?:json|md|txt)|(?:[a-z][\w-]*\/)+(?:[\w-]+\.(?:json|md|txt))?|\b(?:description|Template|Examples)\b)/g;

  function codeify(text) {
    return String(text).replace(CODE_TOKENS, '<code class="fname" dir="ltr" lang="en">$1</code>');
  }

  function announce(message) {
    var region = document.getElementById("announcer");
    region.textContent = "";
    window.setTimeout(function () {
      region.textContent = message;
    }, 40);
  }

  function byId(list, id) {
    return list.filter(function (item) {
      return item.id === id;
    })[0];
  }

  return { icon: icon, status: status, fileName: fileName, codeify: codeify, announce: announce, byId: byId };
})();
