/* Page bootstrap: connects the header controls and starts motion and activities. */
(function () {
  var pauseButton = document.getElementById("motion-toggle");
  var navMenu = document.getElementById("main-menu");

  function renderPauseButton() {
    var blockedByOs = Dive.motion.isReducedByOs();
    var paused = Dive.motion.isPaused() || blockedByOs;
    var label = blockedByOs ? "התנועה כבויה בהגדרות המכשיר" : paused ? "הפעלת תנועה" : "עצירת תנועה";
    /* Two copies: the icon in the top bar (wide screens) and a labelled one in the menu (narrow screens). */
    document.querySelectorAll(".js-motion-icon").forEach(function (icon) {
      icon.setAttribute("href", paused ? "#i-play" : "#i-pause");
    });
    document.querySelectorAll(".js-motion-label").forEach(function (text) {
      text.textContent = label;
    });
    document.querySelectorAll(".js-motion-toggle").forEach(function (button) {
      button.setAttribute("aria-pressed", String(paused));
      button.disabled = blockedByOs;
    });
    pauseButton.setAttribute("aria-label", label);
    pauseButton.dataset.tip = label;
    if (Dive.tooltip) {
      Dive.tooltip.refresh(pauseButton);
    }
  }

  document.querySelectorAll(".js-motion-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      Dive.motion.setPaused(!Dive.motion.isPaused());
      Dive.engine.measure();
    });
  });

  Dive.tooltip.init();
  Dive.motion.onChange(renderPauseButton);
  renderPauseButton();

  /* Close the mobile menu after a section is chosen. */
  navMenu.addEventListener("click", function (event) {
    if (event.target.closest("a") && navMenu.classList.contains("show")) {
      window.bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
    }
  });

  /* Connect to the LMS first: the greeting, the notice and the stored preferences are ready before anything else. */
  Dive.lms.init();

  Dive.engine.init();
  Dive.ambient.init();
  Dive.glossary.init();
  Dive.textSizeControl.init();
  Dive.navFit.init();
  Dive.scratch.init();
  Dive.explore.init();
  Dive.quickchecks.init();
  Dive.wreck.init();
  Dive.stations.init();
  Dive.logbook.init();
  /* The track goes last: choosing it shows the content and starts the practice and the form from its own start. */
  Dive.track.init();
  Dive.debrief.render();
  Dive.engine.measure();
})();
