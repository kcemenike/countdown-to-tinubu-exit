/* ==========================================================================
   Countdown to January 16, 2027
   No dependencies. Everything below is progressive — if a feature is
   unavailable (canvas, IntersectionObserver, clipboard) the page still works.
   ========================================================================== */

(function () {
  'use strict';

  /* --- configuration ------------------------------------------------------ */

  // Election day, midnight West Africa Time (UTC+1).
  var TARGET = new Date('2027-01-16T00:00:00+01:00').getTime();
  // Start of the current administration — used for the "road so far" bar.
  var TERM_START = new Date('2023-05-29T00:00:00+01:00').getTime();

  var REEL_ITEMS = 11; // 0-9 plus a trailing 0 so 9 -> 0 rolls forward
  var ROLL_MS = 760;
  var RING_LEN = 2 * Math.PI * 92; // matches r="92" in the markup

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ======================================================================
     1. Odometer reels
     ====================================================================== */

  function buildDigit() {
    var digit = document.createElement('span');
    digit.className = 'digit';

    var reel = document.createElement('span');
    reel.className = 'digit__reel';

    for (var i = 0; i < REEL_ITEMS; i++) {
      var cell = document.createElement('span');
      cell.textContent = String(i % 10);
      reel.appendChild(cell);
    }

    digit.appendChild(reel);
    digit._reel = reel;
    digit._value = 0;
    return digit;
  }

  function shiftTo(reel, index, animate) {
    reel.style.transition = animate ? '' : 'none';
    reel.style.transform = 'translateY(' + (-index / REEL_ITEMS) * 100 + '%)';
    if (!animate) {
      void reel.offsetHeight; // flush, then hand control back to the stylesheet
      reel.style.transition = '';
    }
  }

  function setDigit(digit, value) {
    if (digit._value === value) return;

    var wraps = digit._value === 9 && value === 0;
    shiftTo(digit._reel, wraps ? 10 : value, !reduceMotion);

    if (wraps && !reduceMotion) {
      clearTimeout(digit._snap);
      digit._snap = setTimeout(function () {
        shiftTo(digit._reel, 0, false);
      }, ROLL_MS);
    }

    digit._value = value;
  }

  /* ======================================================================
     2. The clock
     ====================================================================== */

  var UNITS = ['days', 'hours', 'minutes', 'seconds'];
  var clock = {};

  UNITS.forEach(function (name) {
    var el = $('[data-unit="' + name + '"]');
    if (!el) return;

    var pad = parseInt(el.getAttribute('data-pad'), 10) || 2;
    var host = $('[data-reels]', el);
    var digits = [];

    for (var i = 0; i < pad; i++) {
      var d = buildDigit();
      digits.push(d);
      host.appendChild(d);
    }

    clock[name] = {
      digits: digits,
      host: host,
      bar: $('.ring__bar', el)
    };
  });

  function paint(unit, value, fraction) {
    var slot = clock[unit];
    if (!slot) return;

    var text = String(Math.max(0, value));
    while (text.length < slot.digits.length) text = '0' + text;
    // Grow leftwards if the number ever outruns its padding.
    while (text.length > slot.digits.length) {
      var extra = buildDigit();
      slot.host.insertBefore(extra, slot.digits[0]);
      slot.digits.unshift(extra);
    }

    for (var i = 0; i < slot.digits.length; i++) {
      setDigit(slot.digits[i], parseInt(text.charAt(i), 10) || 0);
    }

    if (slot.bar) {
      slot.bar.style.strokeDashoffset = RING_LEN * (1 - Math.max(0, Math.min(1, fraction)));
    }
  }

  var srOut = $('#clock-sr');
  var termFill = $('[data-term-fill]');
  var termDot = $('[data-term-dot]');
  var termPct = $('[data-term-pct]');
  var heroLine = $('.hero__title .line');
  var lastSecond = -1;
  var arrived = false;

  function tick() {
    var remaining = TARGET - Date.now();

    if (remaining <= 0 && !arrived) {
      arrived = true;
      if (heroLine) heroLine.textContent = 'Nigeria is voting. Show up. Stay. Defend.';
    }
    remaining = Math.max(0, remaining);

    var totalSeconds = Math.floor(remaining / 1000);
    if (totalSeconds === lastSecond) return;
    lastSecond = totalSeconds;

    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    paint('days', days, Math.min(days / 365, 1));
    paint('hours', hours, hours / 24);
    paint('minutes', minutes, minutes / 60);
    paint('seconds', seconds, seconds / 60);

    // Screen readers get a calm, low-frequency summary rather than every second.
    if (srOut && seconds % 30 === 0) {
      srOut.textContent =
        days +
        ' days, ' +
        hours +
        ' hours and ' +
        minutes +
        ' minutes until 16 January 2027.';
    }

    // "Road so far" only needs refreshing occasionally.
    if (seconds % 10 === 0 || termPct.textContent === '0%') {
      var span = TARGET - TERM_START;
      var pct = Math.max(0, Math.min(100, ((Date.now() - TERM_START) / span) * 100));
      if (termFill) termFill.style.width = pct.toFixed(2) + '%';
      if (termDot) termDot.style.left = pct.toFixed(2) + '%';
      if (termPct) termPct.textContent = pct.toFixed(1) + '%';
    }
  }

  tick();
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tick();
  });

  /* ======================================================================
     3. Reveal on scroll
     ====================================================================== */

  var revealables = $$('.reveal');
  revealables.forEach(function (el) {
    el.style.setProperty('--d', el.getAttribute('data-delay') || 0);
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  /* ======================================================================
     4. Pointer effects — spotlight, card sheen, card tilt
     ====================================================================== */

  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    var root = document.documentElement;

    window.addEventListener(
      'pointermove',
      function (e) {
        root.style.setProperty('--mx', e.clientX + 'px');
        root.style.setProperty('--my', e.clientY + 'px');
      },
      { passive: true }
    );

    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener(
        'pointermove',
        function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width;
          var y = (e.clientY - r.top) / r.height;
          card.style.setProperty('--cx', x * 100 + '%');
          card.style.setProperty('--cy', y * 100 + '%');
          card.style.transform =
            'perspective(1000px) rotateX(' +
            (0.5 - y) * 6 +
            'deg) rotateY(' +
            (x - 0.5) * 7 +
            'deg) translateY(-4px)';
        },
        { passive: true }
      );

      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ======================================================================
     5. Toast, copy, share, the "I'm ready" pledge
     ====================================================================== */

  var toast = $('[data-toast]');
  var toastTimer;

  function say(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-shown');
    }, 2600);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand('copy') ? resolve() : reject();
      } catch (err) {
        reject(err);
      }
      document.body.removeChild(field);
    });
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || window.location.href;
      copy(text).then(
        function () {
          say('Copied. Now send it to someone.');
        },
        function () {
          say(text);
        }
      );
    });
  });

  var SHARE_TEXT =
    'The countdown to 16 January 2027 has started. Plan your vote, organise your polling unit, defend your mandate.';
  var pageUrl = window.location.href.split('#')[0];

  var shareUrls = {
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT + ' ' + pageUrl),
    x:
      'https://twitter.com/intent/tweet?text=' +
      encodeURIComponent(SHARE_TEXT) +
      '&url=' +
      encodeURIComponent(pageUrl),
    telegram:
      'https://t.me/share/url?url=' +
      encodeURIComponent(pageUrl) +
      '&text=' +
      encodeURIComponent(SHARE_TEXT)
  };

  $$('[data-share]').forEach(function (link) {
    var key = link.getAttribute('data-share');
    if (shareUrls[key]) link.href = shareUrls[key];
  });

  var readyBtn = $('[data-ready]');
  if (readyBtn) {
    var readyLabel = $('[data-ready-label]', readyBtn);
    var STORE_KEY = 'countdown2027:ready';

    var markReady = function (announce) {
      readyBtn.classList.add('is-on');
      readyLabel.textContent = "I'm ready — count me in";
      readyBtn.setAttribute('aria-pressed', 'true');
      if (announce) say('Good. Now bring five more people.');
    };

    try {
      if (localStorage.getItem(STORE_KEY)) markReady(false);
    } catch (e) {
      /* storage blocked — no problem */
    }

    readyBtn.addEventListener('click', function () {
      markReady(true);
      try {
        localStorage.setItem(STORE_KEY, '1');
      } catch (e) {
        /* ignore */
      }
    });
  }

  /* ======================================================================
     6. Ambient particle field
     ====================================================================== */

  var canvas = $('#field');
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0;
    var h = 0;
    var motes = [];
    var pointer = { x: -999, y: -999 };

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.round(Math.min(90, (w * h) / 20000));
      motes = [];
      for (var i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.7 + 0.5,
          vx: (Math.random() - 0.5) * 0.14,
          vy: -(Math.random() * 0.22 + 0.05),
          a: Math.random() * 0.45 + 0.15,
          gold: Math.random() < 0.18
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx;
        m.y += m.vy;

        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;

        // gentle repulsion from the cursor
        var dx = m.x - pointer.x;
        var dy = m.y - pointer.y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < 16000) {
          var push = (16000 - dist2) / 16000;
          m.x += (dx / (Math.sqrt(dist2) || 1)) * push * 1.6;
          m.y += (dy / (Math.sqrt(dist2) || 1)) * push * 1.6;
        }

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.gold
          ? 'rgba(255, 209, 102, ' + m.a + ')'
          : 'rgba(124, 255, 178, ' + m.a + ')';
        ctx.fill();

        // thread nearby motes together
        for (var j = i + 1; j < motes.length; j++) {
          var n = motes[j];
          var ax = m.x - n.x;
          var ay = m.y - n.y;
          var d2 = ax * ax + ay * ay;
          if (d2 < 12000) {
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = 'rgba(33, 208, 122, ' + (1 - d2 / 12000) * 0.1 + ')';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(frame);
    }

    window.addEventListener(
      'pointermove',
      function (e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      },
      { passive: true }
    );
    window.addEventListener('pointerleave', function () {
      pointer.x = pointer.y = -999;
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    });

    resize();
    requestAnimationFrame(frame);
  }
})();
