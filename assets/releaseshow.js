/* release.show. The page's behaviour, no dependencies.
   Everything reads correctly with this file blocked: <html class="no-js"> puts
   the stylesheet in static mode, where the scroll scenes collapse to their
   content, the player holds its title card, and the sign-up form falls back to
   a mailto. With prefers-reduced-motion the page uses the same static mode. */

(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var pad = function (n) { return String(Math.floor(n)).padStart(2, '0'); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('static');

  /* ------------------------------------------------------- scroll frame
     One pass per animation frame. Each [data-scene] gets --p, its progress
     through its own sticky run. Each [data-win="a,b,fade"] inside it gets --v,
     1 while --p is inside [a, b] and ramping over `fade` at both ends. Each
     [data-reveal] gets --e as it enters the viewport. The HUD names the reel
     whose top has passed the middle of the screen. */
  var scenes = $$('[data-scene]');
  var reveals = $$('[data-reveal]');
  var reels = $$('[data-reel]');
  var track = $('[data-track]');
  var hudReel = $('[data-hud-reel]');
  var hudTc = $('[data-hud-tc]');
  var hudBar = $('[data-hud-bar]');
  var top = $('.top');
  var darks = $$('.finale, .foot');
  var wins = scenes.map(function (sec) {
    return $$('[data-win]', sec).map(function (el) {
      var w = el.getAttribute('data-win').split(',').map(Number);
      return { el: el, a: w[0], b: w[1], f: w[2] || 0.06 };
    });
  });

  function measure() {
    // The feature strip slides by exactly the overflow of its track.
    if (track) track.style.setProperty('--shift', Math.max(0, track.scrollWidth - window.innerWidth) + 'px');
  }

  function frame() {
    var vh = window.innerHeight;
    if (!reduced) {
      scenes.forEach(function (sec, i) {
        var r = sec.getBoundingClientRect();
        var span = r.height - vh > 10 ? r.height - vh : r.height;
        var p = clamp(-r.top / span);
        sec.style.setProperty('--p', p.toFixed(4));
        wins[i].forEach(function (w) {
          var v = Math.min(clamp((p - w.a) / w.f), clamp((w.b + w.f - p) / w.f));
          w.el.style.setProperty('--v', v.toFixed(3));
        });
      });
      reveals.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        el.style.setProperty('--e', clamp((vh * 0.98 - top) / (vh * 0.32)).toFixed(3));
      });
    }
    var overDark = darks.some(function (el) { var r = el.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; });
    if (top) top.classList.toggle('is-dark', overDark);
    var reel = reels.length ? reels[0].getAttribute('data-reel') : '';
    reels.forEach(function (el) { if (el.getBoundingClientRect().top <= vh * 0.5) reel = el.getAttribute('data-reel'); });
    var prog = clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - vh));
    var secs = prog * 90;
    if (hudReel) hudReel.textContent = 'REEL ' + reel.toUpperCase();
    if (hudTc) hudTc.textContent = '00:' + pad(secs / 60) + ':' + pad(secs % 60) + ':' + pad((secs * 24) % 24);
    if (hudBar) hudBar.style.width = (prog * 100) + '%';
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); });
  measure();
  frame();
  // Fonts change the strip's width once they land.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); frame(); });

  /* ------------------------------------------------------------- 02 player
     Four five-second scenes on a loop. Showing a scene un-hides it, which
     restarts its CSS animations, so each cut plays its entrance again. */
  var player = $('[data-player]');
  if (player) {
    var SCENE = 5, TOTAL = 20;
    var CAPTIONS = [
      'acme ships v3.2.0.',
      'Dark mode is here, and it follows your system setting.',
      'Every screen, redrawn for low light.',
      'One line of config. Shipped in 23 pull requests.'
    ];
    var FORMATS = { '16:9': ['16 / 9', 16 / 9], '1:1': ['1 / 1', 1], '9:16': ['9 / 16', 9 / 16] };
    var sceneEls = $$('[data-scene-i]', player);
    var caption = $('[data-caption]', player);
    var pip = $('[data-pip]', player);
    var fill = $('[data-fill]', player);
    var knob = $('[data-knob]', player);
    var tc = $('[data-tc]', player);
    var playBtn = $('[data-play]', player);
    var t = 0, current = 0, playing = !reduced, last = performance.now(), visible = true;

    var show = function (i) {
      current = i;
      sceneEls.forEach(function (el, n) { el.hidden = n !== i; });
      caption.textContent = CAPTIONS[i];
      // Restart the caption's fade by re-inserting the animation.
      caption.style.animation = 'none'; void caption.offsetWidth; caption.style.animation = '';
      pip.hidden = !(i === 1 || i === 3);
    };
    var setPlaying = function (on) {
      playing = on;
      playBtn.textContent = on ? '❚❚' : '▶';
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    };
    setPlaying(playing);

    var loop = function (now) {
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing && visible) t = (t + dt) % TOTAL;
      var sc = Math.floor(t / SCENE);
      if (sc !== current) show(sc);
      var p = (t / TOTAL) * 100 + '%';
      fill.style.width = p;
      knob.style.left = p;
      tc.textContent = '00:' + pad(t) + ' / 00:20';
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // Only run the clock while the player is on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(player);
    }

    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    $$('[data-chapter]', player).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-chapter'));
        t = i * SCENE + 0.01;
        show(i);
      });
    });
    $$('[data-format]', player).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = FORMATS[btn.getAttribute('data-format')];
        player.style.setProperty('--aspect', f[0]);
        player.style.setProperty('--ratio', f[1].toFixed(4));
        $$('[data-format]', player).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on);
        });
      });
    });
    // On a phone a 16:9 frame leaves no room between the caption and the
    // controls, so start square.
    if (window.innerWidth < 600) $('[data-format="1:1"]', player).click();
  }

  /* ------------------------------------------------------- 07 episode thumb
     A title card follows the pointer over the episode list. Pointer only:
     touch devices never see it. */
  var list = $('[data-episodes]');
  var thumb = $('[data-thumb]');
  if (list && thumb && window.matchMedia('(hover: hover)').matches) {
    var tagOut = $('[data-thumb-tag-out]', thumb);
    var hashOut = $('[data-thumb-hash-out]', thumb);
    $$('.ep', list).forEach(function (ep) {
      ep.addEventListener('mouseenter', function () {
        tagOut.textContent = ep.getAttribute('data-thumb-tag');
        hashOut.textContent = ep.getAttribute('data-thumb-hash');
        thumb.classList.add('is-on');
      });
    });
    list.addEventListener('mousemove', function (e) {
      thumb.style.transform = 'translate(' + (e.clientX + 28) + 'px, ' + (e.clientY - 90) + 'px) rotate(-3deg)';
    });
    list.addEventListener('mouseleave', function () { thumb.classList.remove('is-on'); });
  }

  /* --------------------------------------------------------- 09 billing
     The page ships the annual prices. The toggle is hidden until here, so a
     page without JS never shows a control that does nothing. */
  var billing = $('[data-billing]');
  if (billing) {
    billing.hidden = false;
    $$('[data-period]', billing).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var yr = btn.getAttribute('data-period') === 'yr';
        $$('[data-period]', billing).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on);
        });
        $$('[data-mo]').forEach(function (el) {
          var spans = el.querySelectorAll('span');
          spans[0].textContent = '$' + el.getAttribute(yr ? 'data-yr' : 'data-mo');
          spans[1].textContent = yr ? '/ mo, billed yearly' : '/ month';
        });
      });
    });
  }

  /* --------------------------------------------------------- 10 sign-up
     Posts to the waitlist Worker at api.release.show (Release-Show/
     waitlist-backend, Cratefield harness) as { email, product, answers }.
     On any failure the form says so and offers the address, rather than
     pretending the email was saved. Without JS the form is a mailto. */
  var API = 'https://api.release.show/v1/waitlist';
  var form = $('[data-form]');
  if (form) {
    var email = form.elements.email;
    var repo = form.elements.repo;
    var err = $('[data-form-err]', form);
    var go = $('.signup__go', form);
    var label = $('[data-submit-label]', form);
    var fail = function (html) { err.innerHTML = html; err.hidden = false; };
    var ok = function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()); };
    email.addEventListener('input', function () {
      if (email.getAttribute('aria-invalid') === 'true' && ok()) { email.setAttribute('aria-invalid', 'false'); err.hidden = true; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      if (!ok()) {
        email.setAttribute('aria-invalid', 'true');
        fail('! That email looks off. Try again?');
        email.focus();
        return;
      }
      email.setAttribute('aria-invalid', 'false');
      go.disabled = true;
      label.textContent = 'Rolling…';
      var body = { email: email.value.trim(), product: 'release.show' };
      if (repo.value.trim()) body.answers = { repo: repo.value.trim() };
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          $('[data-done-email]').textContent = body.email;
          form.hidden = true;
          $('[data-done]').hidden = false;
        })
        .catch(function (x) {
          fail(Number(x && x.message) === 429
            ? '! Too many tries. Give it a minute, then send again.'
            : '! That didn\'t go through. Try again, or email <a href="mailto:contact@release.show?subject=release.show%20early%20access">contact@release.show</a>.');
        })
        .then(function () { go.disabled = false; label.textContent = 'Get early access'; });
    });
  }
})();
