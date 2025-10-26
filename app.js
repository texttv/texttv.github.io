// Keyboard navigation support
document.addEventListener('keydown', (e) => {
  if (document.activeElement === pageInput) return;
  if (e.key === 'ArrowLeft' && currentPage > minPage) {
    goToPage(currentPage - 1);
    prevBtn.focus();
  } else if (e.key === 'ArrowRight' && currentPage < maxPage) {
    goToPage(currentPage + 1);
    nextBtn.focus();
  }
});

// DR Text TV PWA main logic
const contentContainer = document.getElementById('contentContainer');
const spinner = document.getElementById('spinner');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInput = document.getElementById('pageInput');
const goBtn = document.getElementById('goBtn');
const reloadBtn = document.getElementById('reloadBtn');

let currentPage = 110;
let maxPage = 899;
let minPage = 100;

function showSpinner() {
  if (spinner) spinner.style.display = 'flex';
}
function hideSpinner() {
  if (spinner) spinner.style.display = 'none';
}










function displayPage(page) {
  showSpinner();
  let iframe = document.getElementById('drIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'drIframe';
    iframe.title = `DR Text TV page ${page}`;
    // Render the iframe at the original layout size and visually scale it.
    iframe.style.position = 'fixed';
    iframe.style.border = 'none';
    iframe.style.zIndex = '100';
    // Original Text TV width/height (approx)
    iframe.dataset.nativeWidth = '320';
    iframe.dataset.nativeHeight = '480';
    iframe.style.width = iframe.dataset.nativeWidth + 'px';
    iframe.style.height = iframe.dataset.nativeHeight + 'px';
    // Keep transform origin at top-left so we can compute offsets
    iframe.style.transformOrigin = '0 0';
  // Keep scripts allowed but avoid allow-same-origin to prevent sandbox escape
  iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.overflow = 'hidden';
    contentContainer.style.overflow = 'hidden';
    contentContainer.appendChild(iframe);

    // Scale and center helper
    const applyIframeScale = () => {
      const nativeW = parseFloat(iframe.dataset.nativeWidth);
      const nativeH = parseFloat(iframe.dataset.nativeHeight);
      const scaleByHeight = window.innerHeight / nativeH;
      const scaleByWidth = window.innerWidth / nativeW;
      // Prefer filling vertically, but ensure full document is visible horizontally
      let scale = scaleByHeight;
      if (nativeW * scale > window.innerWidth) {
        // If filling height would overflow width, scale down to fit width
        scale = scaleByWidth;
      }
      iframe.style.transform = `scale(${scale})`;
      // Center the scaled iframe within the viewport
      const scaledW = nativeW * scale;
      const scaledH = nativeH * scale;
      const left = Math.max((window.innerWidth - scaledW) / 2, 0);
      const top = Math.max((window.innerHeight - scaledH) / 2, 0);
      iframe.style.left = `${left}px`;
      iframe.style.top = `${top}px`;
    };

    // Recompute on resize
    window.addEventListener('resize', applyIframeScale);
    // expose for later calls
    iframe._applyScale = applyIframeScale;
  // Remove any legacy overlays or edge zones that might block pointer events
  const oldOverlay = document.getElementById('swipeOverlay');
  if (oldOverlay) oldOverlay.remove();
  const leftZone = document.getElementById('edgeZoneLeft');
  if (leftZone) leftZone.remove();
  const rightZone = document.getElementById('edgeZoneRight');
  if (rightZone) rightZone.remove();
  // Attach gesture handlers to iframe when created
  try { setupGestureHandlersForIframe(iframe); } catch (err) { /* ignore */ }
  }
  iframe.src = `https://www.dr.dk/cgi-bin/fttx2.exe/${page}`;
  iframe.onload = function() {
    // apply scale now that content has rendered
    if (iframe._applyScale) iframe._applyScale();
    // ensure gesture handlers are attached after load
    try { setupGestureHandlersForIframe(iframe); } catch (err) { /* ignore */ }
    hideSpinner();
  };
  iframe.onerror = function() {
    hideSpinner();
  };
  pageInput.value = page;
  currentPage = page;
}

// Gesture handling: attach pointer-based swipe detection to the iframe
function setupGestureHandlersForIframe(iframeEl) {
  if (!iframeEl) return;
  // If browser supports pointer events, bind to iframe element
  if (window.PointerEvent) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let handled = false;
    const onDown = (e) => {
      tracking = true;
      handled = false;
      startX = e.clientX;
      startY = e.clientY;
      try { iframeEl.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const onMove = (e) => {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (handled) return;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        handled = true;
        if (dx > 0 && currentPage > minPage) goToPage(currentPage - 1);
        else if (dx < 0 && currentPage < maxPage) goToPage(currentPage + 1);
      }
    };
    const onUp = (e) => {
      tracking = false;
      try { iframeEl.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    iframeEl.addEventListener('pointerdown', onDown, { passive: true });
    iframeEl.addEventListener('pointermove', onMove, { passive: true });
    iframeEl.addEventListener('pointerup', onUp, { passive: true });
    iframeEl.addEventListener('pointercancel', onUp, { passive: true });
  } else {
    // Fallback: attach edge swipe zones if pointer events not supported
    ensureEdgeSwipeZones();
  }
  // Also add touch event fallback for browsers that may not fire pointer events on iframes
  let tStartX = null;
  iframeEl.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) tStartX = e.touches[0].clientX;
  }, { passive: true });
  iframeEl.addEventListener('touchend', (e) => {
    if (tStartX === null) return;
    const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
    if (endX === null) { tStartX = null; return; }
    const dx = endX - tStartX;
    if (Math.abs(dx) > 40) {
      if (dx > 0 && currentPage > minPage) goToPage(currentPage - 1);
      else if (dx < 0 && currentPage < maxPage) goToPage(currentPage + 1);
    }
    tStartX = null;
  }, { passive: true });
}

// Fallback edge zones (kept minimal) used only if pointer events missing
function ensureEdgeSwipeZones() {
  if (document.getElementById('edgeZoneLeft')) return;
  const makeZone = (side) => {
    const z = document.createElement('div');
    z.id = side === 'left' ? 'edgeZoneLeft' : 'edgeZoneRight';
    z.style.position = 'fixed';
    z.style.top = '0';
    z.style.height = '100vh';
    z.style.width = '18%';
    z.style[side] = '0';
    z.style.zIndex = '200';
    z.style.background = 'transparent';
    z.style.touchAction = 'none';
    document.body.appendChild(z);
    return z;
  };
  const left = makeZone('left');
  const right = makeZone('right');
  const bindZone = (el, dir) => {
    let startX = null;
    el.addEventListener('touchstart', (e) => { if (e.touches.length === 1) startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (startX === null) return; const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null; if (endX === null) { startX = null; return; }
      const dx = endX - startX; if (Math.abs(dx) > 40) { if (dir === 'left' && dx > 0 && currentPage > minPage) goToPage(currentPage - 1); else if (dir === 'right' && dx < 0 && currentPage < maxPage) goToPage(currentPage + 1); } startX = null;
    }, { passive: true });
  };
  bindZone(left, 'left'); bindZone(right, 'right');
}

function goToPage(page) {
  if (page < minPage || page > maxPage) return;
  displayPage(page);
}

prevBtn.addEventListener('click', () => {
  if (currentPage > minPage) goToPage(currentPage - 1);
});
nextBtn.addEventListener('click', () => {
  if (currentPage < maxPage) goToPage(currentPage + 1);
});
goBtn.addEventListener('click', () => {
  const page = parseInt(pageInput.value, 10);
  if (!isNaN(page)) goToPage(page);
});
reloadBtn.addEventListener('click', () => {
  displayPage(currentPage);
});
pageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    goBtn.click();
  }
});

// Touch gesture support
let touchStartX = null;
let touchEndX = null;
contentContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
  }
}, { passive: true });
contentContainer.addEventListener('touchend', (e) => {
  if (touchStartX !== null) {
    touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX;
    if (dx > 50 && currentPage > minPage) {
      goToPage(currentPage - 1);
    } else if (dx < -50 && currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
    touchStartX = null;
    touchEndX = null;
  }
}, { passive: true });

// Initial load
displayPage(currentPage);
