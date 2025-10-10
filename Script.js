// ===== Modal Functionality =====
const cards = document.querySelectorAll('.project-card');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage') || document.querySelector('.modal-media img');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalClose = document.querySelector('.modal-close');

cards.forEach(card => {
  card.addEventListener('click', () => {
    // prefer data-image attribute; fallback to the thumbnail img src
    const dataImage = card.getAttribute('data-image');
    const thumbImg = card.querySelector('img')?.src || '';
    const source = dataImage || thumbImg || '';

    const dataTitle = card.getAttribute('data-title') || card.querySelector('.meta')?.textContent?.trim() || 'Project';
    const dataDesc = card.getAttribute('data-desc') || 'A closer look at this design work — simple, elegant, and creative.';

    // set image (defensive)
    if (modalImage) {
      modalImage.src = source;
      modalImage.alt = dataTitle;
    }

    if (modalTitle) modalTitle.textContent = dataTitle;
    if (modalDesc) modalDesc.textContent = dataDesc;

    // show modal & lock scroll
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // focus on close for accessibility
    if (modalClose) modalClose.focus();
  });
});

// close modal
function closeModal() {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  if (modalImage) modalImage.src = '';
  if (modalTitle) modalTitle.textContent = '';
  if (modalDesc) modalDesc.textContent = '';
}

// close handlers
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) {
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

// Smooth scroll for nav links and buttons
document.querySelectorAll('.nav a, .btn').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
