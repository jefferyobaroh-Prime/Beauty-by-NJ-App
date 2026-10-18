(function () {
  'use strict';

  const marquee = document.querySelector('.marquee');
  const track   = marquee && marquee.querySelector('.marqueeTrack');
  if (!track) return;

  // the original items, saved once
  const originals = Array.from(track.children).map(function (n) { return n.cloneNode(true); });
  if (!originals.length) return;

  function build() {
    track.replaceChildren();

    // 1) first group: repeat the items until the group is wider than the marquee
    const first = document.createElement('div');
    first.className = 'marqueeGroup';
    track.append(first);

    let guard = 0;
    do {
      originals.forEach(function (n) { first.append(n.cloneNode(true)); });
      guard++;
    } while (first.getBoundingClientRect().width < marquee.clientWidth && guard < 30);

    // 2) second group: an exact copy (hidden from screen readers)
    const second = first.cloneNode(true);
    second.setAttribute('aria-hidden', 'true');
    track.append(second);

    // 3) measure the real distance from the start of group 1 to the start of group 2
    const shift = second.offsetLeft - first.offsetLeft;
    track.style.setProperty('--marquee-shift', shift + 'px');

    // 4) same speed on every screen (pixels per second)
    const SPEED = 60;
    track.style.setProperty('--marquee-time', (shift / SPEED).toFixed(2) + 's');
  }

  build();

  // rebuild when the screen size changes or the font finishes loading
  let timer;
  function rebuildSoon() { clearTimeout(timer); timer = setTimeout(build, 150); }
  window.addEventListener('resize', rebuildSoon);
  window.addEventListener('load', rebuildSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuildSoon);
})();