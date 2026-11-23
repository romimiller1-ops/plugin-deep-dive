/* Decorative canvas layer: plankton, a fish school that forms a folder, and sonar ripples.
   Nothing here carries information, so the canvas is hidden from assistive technology. */
window.Dive = window.Dive || {};

Dive.ambient = (function () {
  var WIDE_SCREEN = 992;
  var MEDIUM_SCREEN = 768;
  var MAX_PIXEL_RATIO = 2;
  var SCHOOL_DEPTH_MIN = 30;
  var SCHOOL_DEPTH_MAX = 72;
  var FORM_DEPTH_MIN = 44;
  var FORM_DEPTH_MAX = 56;
  var POINTER_RADIUS = 150;
  var WHALE_DEPTH_MIN = 62;
  var WHALE_DEPTH_MAX = 96;

  var canvas = document.getElementById("ambient");
  var context = canvas ? canvas.getContext("2d") : null;
  var width = 0;
  var height = 0;
  var plankton = [];
  var school = [];
  var folderPoints = [];
  var ripples = [];
  var pointer = { x: -9999, y: -9999 };
  var running = false;
  var clock = 0;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  /* Samples points along a folder outline, centred on the free side of the layout. */
  function buildFolderPoints(count) {
    var outline = [[-1, -0.6], [-0.25, -0.6], [-0.05, -0.32], [1, -0.32], [1, 0.72], [-1, 0.72], [-1, -0.6]];
    var scale = Math.min(width, height) * 0.2;
    var centreX = width * 0.3;
    var centreY = height * 0.52;
    var lengths = [];
    var total = 0;
    for (var index = 0; index < outline.length - 1; index += 1) {
      var length = Math.hypot(outline[index + 1][0] - outline[index][0], outline[index + 1][1] - outline[index][1]);
      lengths.push(length);
      total += length;
    }
    var points = [];
    for (var pointIndex = 0; pointIndex < count; pointIndex += 1) {
      var distance = (pointIndex / count) * total;
      var segment = 0;
      while (distance > lengths[segment]) {
        distance -= lengths[segment];
        segment += 1;
      }
      var amount = distance / lengths[segment];
      points.push({
        x: centreX + (outline[segment][0] + (outline[segment + 1][0] - outline[segment][0]) * amount) * scale,
        y: centreY + (outline[segment][1] + (outline[segment + 1][1] - outline[segment][1]) * amount) * scale
      });
    }
    return points;
  }

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    var planktonCount = width >= MEDIUM_SCREEN ? 90 : 34;
    plankton = [];
    for (var index = 0; index < planktonCount; index += 1) {
      plankton.push({ x: random(0, width), y: random(0, height), depth: random(0.25, 1), size: random(0.7, 2.1) });
    }

    school = [];
    if (width >= WIDE_SCREEN) {
      var fishCount = 76;
      folderPoints = buildFolderPoints(fishCount);
      for (var fish = 0; fish < fishCount; fish += 1) {
        school.push({ x: random(0, width * 0.4), y: random(0, height), vx: random(-1, 1), vy: random(-1, 1) });
      }
    }
  }

  function drawPlankton(state) {
    var streak = Math.min(26, Math.abs(state.velocity) * 0.35);
    context.lineCap = "round";
    plankton.forEach(function (speck) {
      var drift = clock * 0.012 * speck.depth;
      var y = (speck.y - state.offset * 0.4 * speck.depth - drift) % height;
      if (y < 0) {
        y += height;
      }
      context.strokeStyle = "rgba(255, 255, 255, " + (0.2 + speck.depth * 0.4) + ")";
      context.lineWidth = speck.size;
      context.beginPath();
      context.moveTo(speck.x, y);
      context.lineTo(speck.x + 0.01, y + (state.velocity >= 0 ? streak : -streak) * speck.depth);
      context.stroke();
    });
  }

  function schoolAlpha(depth) {
    if (depth < SCHOOL_DEPTH_MIN || depth > SCHOOL_DEPTH_MAX) {
      return 0;
    }
    return Math.min(1, Math.min(depth - SCHOOL_DEPTH_MIN, SCHOOL_DEPTH_MAX - depth) / 6);
  }

  function drawSchool(state) {
    var alpha = schoolAlpha(state.depth);
    if (!school.length || alpha === 0) {
      return;
    }
    var forming = state.depth >= FORM_DEPTH_MIN && state.depth <= FORM_DEPTH_MAX;
    var centreX = width * 0.3 + Math.cos(clock * 0.0007) * width * 0.08;
    var centreY = height * 0.5 + Math.sin(clock * 0.0011) * height * 0.26;

    context.strokeStyle = "rgba(190, 240, 232, " + (0.85 * alpha) + ")";
    context.lineWidth = 1.6;

    school.forEach(function (fish, index) {
      var pull = forming ? 0.016 : 0.0016;
      var targetX = forming ? folderPoints[index].x : centreX + Math.cos(index * 2.4) * 90;
      var targetY = forming ? folderPoints[index].y : centreY + Math.sin(index * 1.7) * 70;

      fish.vx += (targetX - fish.x) * pull + random(-0.05, 0.05);
      fish.vy += (targetY - fish.y) * pull + random(-0.05, 0.05);

      var awayX = fish.x - pointer.x;
      var awayY = fish.y - pointer.y;
      var distance = Math.hypot(awayX, awayY);
      if (distance < POINTER_RADIUS && distance > 0) {
        var push = (1 - distance / POINTER_RADIUS) * 1.6;
        fish.vx += (awayX / distance) * push;
        fish.vy += (awayY / distance) * push;
      }

      var damping = forming ? 0.86 : 0.97;
      fish.vx *= damping;
      fish.vy *= damping;
      fish.x += fish.vx;
      fish.y += fish.vy;

      var speed = Math.hypot(fish.vx, fish.vy) || 1;
      context.beginPath();
      context.moveTo(fish.x, fish.y);
      context.lineTo(fish.x - (fish.vx / speed) * 8, fish.y - (fish.vy / speed) * 8);
      context.stroke();
    });
  }

  /* A dotted whale crossing the deep water once per pass; driven by depth, so it reverses on the way up. */
  function drawWhale(state) {
    if (width < MEDIUM_SCREEN || state.depth < WHALE_DEPTH_MIN || state.depth > WHALE_DEPTH_MAX) {
      return;
    }
    var travel = (state.depth - WHALE_DEPTH_MIN) / (WHALE_DEPTH_MAX - WHALE_DEPTH_MIN);
    var length = width * 0.46;
    var originX = width * 1.1 - travel * (width * 1.1 + length);
    var originY = height * 0.32;
    context.fillStyle = "rgba(190, 240, 232, 0.5)";
    for (var column = 0; column < 90; column += 1) {
      var along = column / 89;
      var half = Math.sin(Math.PI * Math.pow(along, 0.62)) * length * 0.13;
      var sway = Math.sin(along * 5 + clock * 0.001) * 6 * along;
      for (var row = -1; row <= 1; row += 0.25) {
        context.fillRect(originX + along * length, originY + row * half + sway, 1.8, 1.8);
      }
    }
    var tailX = originX + length;
    var tailY = originY + Math.sin(5 + clock * 0.001) * 6;
    for (var spread = 0; spread < 26; spread += 1) {
      context.fillRect(tailX + spread * 1.6, tailY - spread * 1.8, 1.8, 1.8);
      context.fillRect(tailX + spread * 1.6, tailY + spread * 1.8, 1.8, 1.8);
    }
  }

  function drawRipples() {
    ripples = ripples.filter(function (ripple) {
      return ripple.age < 1;
    });
    ripples.forEach(function (ripple) {
      ripple.age += 0.022;
      context.strokeStyle = "rgba(255, 255, 255, " + (0.55 * (1 - ripple.age)) + ")";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(ripple.x, ripple.y, 12 + ripple.age * 130, 0, Math.PI * 2);
      context.stroke();
    });
  }

  function frame(time) {
    if (!running) {
      return;
    }
    clock = time;
    context.clearRect(0, 0, width, height);
    var state = Dive.engine.state;
    drawPlankton(state);
    drawSchool(state);
    drawWhale(state);
    drawRipples();
    window.requestAnimationFrame(frame);
  }

  function start() {
    if (!running && canvas) {
      running = true;
      window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    if (context) {
      context.clearRect(0, 0, width, height);
    }
  }

  function sync() {
    if (Dive.motion.isEnabled() && !document.hidden) {
      start();
    } else {
      stop();
    }
  }

  function init() {
    if (!context) {
      return;
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });
    window.addEventListener("pointerdown", function (event) {
      ripples.push({ x: event.clientX, y: event.clientY, age: 0 });
    }, { passive: true });
    document.addEventListener("visibilitychange", sync);
    Dive.motion.onChange(sync);
    sync();
  }

  return { init: init };
})();
