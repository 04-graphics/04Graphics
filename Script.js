// ===== Modal & Page Functionality =====
const cards = document.querySelectorAll('.project-card');
const modal = document.getElementById('modal');
const nav = document.querySelector('.nav');
const yearNode = document.getElementById('year');

let modalImage = document.getElementById('modalImage') || document.querySelector('.modal-media img');
let modalTitle = document.getElementById('modalTitle');
let modalDesc = document.getElementById('modalDesc');
let currentGallery = []; // array of { src, title, desc }
let currentIndex = 0;
let lastFocusedElement = null; // store element that opened modal for focus restore

/* internal state */
let handlersInitialized = false;
let imageLoadTimer = null;
const IMAGE_LOAD_TIMEOUT = 6000; // ms

/* --- Utility: set CSS var for nav height so hero can be perfectly centered --- */
function setNavHeightVar() {
  if (!nav) return;
  const h = nav.offsetHeight || 0;
  document.documentElement.style.setProperty('--nav-height', `${h}px`);
}
window.addEventListener('load', setNavHeightVar);
window.addEventListener('resize', setNavHeightVar);

/* set footer year */
if (yearNode) yearNode.textContent = new Date().getFullYear();

/* Helper: build an item object for a card */
function buildItemFromCard(card) {
  const dataImage = (card.getAttribute('data-image') || '').trim();
  const thumbImg = card.querySelector('img')?.src || '';
  const src = dataImage || thumbImg || '';
  const title = card.getAttribute('data-title') || card.querySelector('.meta')?.textContent?.trim() || 'Project';
  const desc = card.getAttribute('data-desc') || 'A closer look at this design work — simple, elegant, and creative.';
  return { src, title, desc };
}

/* Helper: parse data-images attribute (supports JSON array or comma-separated list)
   Returns an array (possibly empty). */
function parseDataImagesAttr(attrVal) {
  if (!attrVal) return [];
  const value = String(attrVal).trim();
  if (!value) return [];
  // JSON array?
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
    } catch (e) {
      // fall through to CSV parse
    }
  }
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/* Helper: generate 4-image gallery by appending -2, -3, -4 to base filename.
   Example: images/Project1-thumb.jpg -> images/Project1-thumb.jpg, images/Project1-thumb-2.jpg, ...
*/
function generateGalleryFromThumb(src) {
  if (!src) return [];
  try {
    const url = src.trim();
    // preserve query/hash if present
    const urlParts = url.split(/[?#]/);
    const main = urlParts[0];
    const suffix = url.slice(main.length); // includes query/hash if any
    const lastSlash = main.lastIndexOf('/');
    const filename = lastSlash >= 0 ? main.slice(lastSlash + 1) : main;
    const path = lastSlash >= 0 ? main.slice(0, lastSlash + 1) : '';
    const dot = filename.lastIndexOf('.');
    if (dot === -1) return [src];
    const name = filename.slice(0, dot);
    const ext = filename.slice(dot + 1);
    const gallery = [
      `${path}${name}.${ext}${suffix}`,
      `${path}${name}-2.${ext}${suffix}`,
      `${path}${name}-3.${ext}${suffix}`,
      `${path}${name}-4.${ext}${suffix}`
    ];
    return gallery;
  } catch (e) {
    return [src];
  }
}

/* ----- Image load / error handlers (bound once) ----- */
function onModalImageLoad() {
  clearImageLoadTimer();
  try {
    const w = modalImage.naturalWidth || modalImage.width;
    const h = modalImage.naturalHeight || modalImage.height;
    if (h > w) modal.classList.add('portrait');
    else modal.classList.remove('portrait');
    modalImage.removeAttribute('aria-busy');
    modalImage.classList.remove('loading');
    modalImage.classList.remove('error');
  } catch (err) {
    modal.classList.remove('portrait');
  }
}

function onModalImageError() {
  clearImageLoadTimer();
  modalImage.classList.remove('loading');
  modalImage.classList.add('error');
  modalImage.alt = 'Failed to load image';
  modal.classList.remove('portrait');
  // Do not block UI: allow user to navigate or close modal.
}

function startImageLoadTimer() {
  clearImageLoadTimer();
  imageLoadTimer = setTimeout(() => {
    // If image hasn't fired load yet, treat as error so UI remains responsive
    onModalImageError();
  }, IMAGE_LOAD_TIMEOUT);
}

function clearImageLoadTimer() {
  if (imageLoadTimer) {
    clearTimeout(imageLoadTimer);
    imageLoadTimer = null;
  }
}

/* Ensure modalImage exists and has handlers bound (idempotent) */
function ensureModalImageHandlers() {
  modalImage = document.getElementById('modalImage') || document.querySelector('.modal-media img');
  if (!modalImage) return;
  // avoid double-binding: remove then add (safe)
  modalImage.removeEventListener('load', onModalImageLoad);
  modalImage.removeEventListener('error', onModalImageError);
  modalImage.addEventListener('load', onModalImageLoad);
  modalImage.addEventListener('error', onModalImageError);
}

/* Populate and open modal with a gallery and starting index */
function openModalWithGallery(gallery, startIndex = 0) {
  ensureModalImageHandlers();

  if (!modal || !modalImage || !Array.isArray(gallery) || gallery.length === 0) return;
  currentGallery = gallery.slice(); // clone
  currentIndex = Math.max(0, Math.min(startIndex, currentGallery.length - 1));

  const item = currentGallery[currentIndex];

  // Mark image as loading; start timeout fallback
  modalImage.classList.remove('error');
  modalImage.classList.add('loading');
  modalImage.setAttribute('aria-busy', 'true');

  modalImage.alt = item.title || 'Project Preview';
  modalImage.src = item.src;
  startImageLoadTimer();

  if (modalTitle) modalTitle.textContent = item.title || '';
  if (modalDesc) modalDesc.textContent = item.desc || '';

  // show modal & lock scroll, set aria before focus transfer
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // store opener: the last focused element (if available)
  try {
    const active = document.activeElement;
    if (active && active !== document.body) lastFocusedElement = active;
  } catch (e) {
    lastFocusedElement = null;
  }

  // focus modal close for accessibility
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn && typeof closeBtn.focus === 'function') setTimeout(() => closeBtn.focus(), 10);

  // ensure handlers (only binds once)
  ensureCloseHandlers();
}

/* Update modal to show item at index (wraps around) */
function showIndex(index) {
  if (!currentGallery || currentGallery.length === 0) return;
  currentIndex = ((index % currentGallery.length) + currentGallery.length) % currentGallery.length; // wrap
  const item = currentGallery[currentIndex];

  ensureModalImageHandlers();

  if (modalImage) {
    modalImage.classList.remove('error');
    modalImage.classList.add('loading');
    modalImage.setAttribute('aria-busy', 'true');

    modalImage.alt = item.title || 'Project Preview';
    modalImage.src = item.src;
    startImageLoadTimer();
  }

  if (modalTitle) modalTitle.textContent = item.title || '';
  if (modalDesc) modalDesc.textContent = item.desc || '';
}

/* Modal navigation handlers */
function goNext() { showIndex(currentIndex + 1); }
function goPrev() { showIndex(currentIndex - 1); }

/* Modal close behavior */
function closeModal() {
  if (!modal) return;

  // If a focusable element inside modal currently has focus, move focus back first
  try {
    const active = document.activeElement;
    if (modal.contains(active)) {
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      } else {
        try {
          if (active && typeof active.blur === 'function') active.blur();
        } catch (e) {
          const fallback = document.querySelector('.nav a') || document.querySelector('a') || document.body;
          if (fallback && typeof fallback.focus === 'function') fallback.focus();
        }
      }
    }
  } catch (e) {
    // ignore focus errors
  }

  clearImageLoadTimer();

  // Hide and reset modal after a tiny delay to ensure focus has moved
  setTimeout(() => {
    modal.classList.remove('active');
    modal.classList.remove('portrait');
    modal.setAttribute('aria-hidden', 'true');

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    if (modalImage) {
      // do not set src to '' forcibly; clearing alt and letting browser handle caching
      modalImage.removeAttribute('aria-busy');
      modalImage.classList.remove('loading');
      modalImage.classList.remove('error');
      // optional: keep src to leverage browser cache; do not null it to avoid broken refs
    }
    if (modalTitle) modalTitle.textContent = '';
    if (modalDesc) modalDesc.textContent = '';
    currentGallery = [];
    currentIndex = 0;

    // clear stored opener
    lastFocusedElement = null;
  }, 16);
}

/* Attach click to cards: build gallery using rules:
   1) If clicked card has data-images attribute -> use it (JSON array or CSV)
   2) Else, attempt to gather related cards by matching .meta text (category)
   3) If no related group found or single item, fallback to all cards in DOM order
   4) If no data-images provided, auto-generate 4-image set by appending -2/-3/-4 to thumbnail base
*/
if (cards && cards.length) {
  cards.forEach(card => {
    card.addEventListener('click', (ev) => {
      // store opener for focus restore
      lastFocusedElement = ev.currentTarget || ev.target || document.activeElement;

      // Preferred data-images attribute on the clicked card
      const rawDataImages = card.getAttribute('data-images') || card.getAttribute('data-images-list') || '';
      const parsedImages = parseDataImagesAttr(rawDataImages);

      if (parsedImages && parsedImages.length) {
        const gallery = parsedImages.map(src => ({
          src,
          title: card.getAttribute('data-title') || card.querySelector('.meta')?.textContent?.trim() || '',
          desc: card.getAttribute('data-desc') || '',
        })).filter(item => item.src);
        if (gallery.length) {
          openModalWithGallery(gallery, 0);
        }
        return;
      }

      // No explicit list: generate from card's data-image or thumbnail
      const dataImage = (card.getAttribute('data-image') || '').trim();
      const thumbImg = card.querySelector('img')?.src || '';
      const baseSrc = dataImage || thumbImg || '';

      let generated = generateGalleryFromThumb(baseSrc).map(src => ({
        src,
        title: card.getAttribute('data-title') || card.querySelector('.meta')?.textContent?.trim() || '',
        desc: card.getAttribute('data-desc') || '',
      })).filter(item => item.src);

      // If generation produced multiple images but you prefer single, comment the above and use:
      // generated = [buildItemFromCard(card)].filter(item => item.src);

      // If generation failed produce single-item gallery fallback
      if (!generated || generated.length === 0) {
        generated = [buildItemFromCard(card)].filter(item => item.src);
      }

      openModalWithGallery(generated, 0);
    });
  });
}

/* close handlers and nav handlers binding helper (idempotent) */
function ensureCloseHandlers() {
  if (handlersInitialized) return;

  ensureModalImageHandlers();

  const closeBtn = document.querySelector('.modal-close');
  const prevBtn = document.querySelector('.modal-prev');
  const nextBtn = document.querySelector('.modal-next');

  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeModal(); });
  }

  if (modal) {
    modal.addEventListener('click', modalOverlayClick);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prevHandler(e); });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); nextHandler(e); });
  }

  handlersInitialized = true;
}

function modalOverlayClick(e) {
  if (e.target === modal) closeModal();
}

function prevHandler(e) { e.stopPropagation(); goPrev(); }
function nextHandler(e) { e.stopPropagation(); goNext(); }

/* Initialize handlers (safe to call multiple times) */
ensureCloseHandlers();

/* Keyboard handling: Escape closes, ArrowLeft/ArrowRight navigate */
document.addEventListener('keydown', (e) => {
  if (!modal || !modal.classList.contains('active')) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key === 'ArrowRight') { goNext(); return; }
  if (e.key === 'ArrowLeft') { goPrev(); return; }
});

/* Smooth scroll for nav links and buttons (preserve original behavior)
   Also protect .btn links from invalid hrefs that may cause unexpected navigation. */
document.querySelectorAll('.nav a, .btn').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href') || '';
    // safeguard: don't follow empty or invalid hrefs
    if (!href || href === '#') {
      e.preventDefault();
      return;
    }
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
