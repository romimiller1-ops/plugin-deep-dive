/* Scratch cards. The text is real page content under a decorative canvas;
   a plain button gives keyboard and screen-reader users the same result. */
window.Dive = window.Dive || {};

Dive.scratch = (function () {
  var BRUSH_RADIUS = 22;
  var REVEAL_RATIO = 0.42;
  var SAMPLE_STEP = 8;

  function paintFoil(canvas, context) {
    var gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#61bdaf");
    gradient.addColorStop(0.5, "#26b7cd");
    gradient.addColorStop(1, "#61bdaf");
    context.globalCompositeOperation = "source-over";
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#191834";
    context.font = "700 18px Assistant, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.direction = "rtl";
    context.fillText("גרדו כאן", canvas.width / 2, canvas.height / 2);
  }

  function setupCard(card) {
    var surface = card.querySelector(".scratch__surface");
    var button = card.querySelector(".scratch__reveal");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d", { willReadFrequently: true });
    var drawing = false;
    var revealed = false;
    var last = null;

    canvas.className = "scratch__foil";
    canvas.setAttribute("aria-hidden", "true");
    surface.appendChild(canvas);

    function size() {
      if (revealed) {
        return;
      }
      canvas.width = Math.max(1, surface.offsetWidth);
      canvas.height = Math.max(1, surface.offsetHeight);
      paintFoil(canvas, context);
    }

    function reveal() {
      if (revealed) {
        return;
      }
      revealed = true;
      card.classList.add("is-revealed");
      button.disabled = true;
      button.textContent = "נחשף";
      window.setTimeout(function () {
        canvas.remove();
      }, 500);
    }

    function clearedRatio() {
      var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      var cleared = 0;
      var total = 0;
      for (var index = 3; index < pixels.length; index += 4 * SAMPLE_STEP) {
        total += 1;
        if (pixels[index] === 0) {
          cleared += 1;
        }
      }
      return cleared / Math.max(1, total);
    }

    function point(event) {
      var box = canvas.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    }

    function scratchTo(position) {
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineWidth = BRUSH_RADIUS * 2;
      context.beginPath();
      context.moveTo((last || position).x, (last || position).y);
      context.lineTo(position.x + 0.01, position.y);
      context.stroke();
      last = position;
    }

    canvas.addEventListener("pointerdown", function (event) {
      drawing = true;
      last = null;
      canvas.setPointerCapture(event.pointerId);
      scratchTo(point(event));
    });
    canvas.addEventListener("pointermove", function (event) {
      if (drawing) {
        scratchTo(point(event));
      }
    });
    function finish() {
      if (drawing) {
        drawing = false;
        if (clearedRatio() >= REVEAL_RATIO) {
          reveal();
        }
      }
    }
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);

    button.addEventListener("click", reveal);
    size();
    if ("ResizeObserver" in window) {
      new ResizeObserver(size).observe(surface);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(size);
    }
  }

  function init() {
    document.querySelectorAll(".scratch").forEach(setupCard);
  }

  return { init: init };
})();
