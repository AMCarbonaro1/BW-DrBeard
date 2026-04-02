// ========== INTERSECTION OBSERVER (Scroll Animations) ==========
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

// ========== NAVBAR (show on scroll) ==========
const navbar = document.getElementById('navbar');
const hero = document.getElementById('hero');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  const heroHeight = hero.offsetHeight;

  if (currentScroll > heroHeight * 0.6) {
    navbar.classList.add('visible');
  } else {
    navbar.classList.remove('visible');
  }

  lastScroll = currentScroll;
}, { passive: true });

// ========== MOBILE STICKY CTA ==========
const mobileCta = document.getElementById('mobile-cta');

const ctaObserver = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting) {
      mobileCta.classList.add('visible');
    } else {
      mobileCta.classList.remove('visible');
    }
  },
  { threshold: 0.3 }
);

ctaObserver.observe(hero);

// ========== LIGHTBOX ==========
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const galleryItems = document.querySelectorAll('.gallery-item');
let currentImageIndex = 0;

function getGalleryImages() {
  return Array.from(galleryItems).map((item) => {
    const img = item.querySelector('img');
    return { src: img.src, alt: img.alt };
  });
}

function openLightbox(element) {
  const images = getGalleryImages();
  const clickedImg = element.querySelector('img');
  currentImageIndex = images.findIndex((img) => img.src === clickedImg.src);

  lightboxImg.src = clickedImg.src;
  lightboxImg.alt = clickedImg.alt;
  lightbox.classList.remove('hidden');

  requestAnimationFrame(() => {
    lightbox.classList.add('active');
  });

  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  if (event) event.stopPropagation();
  lightbox.classList.remove('active');

  setTimeout(() => {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }, 300);
}

function nextImage(event) {
  event.stopPropagation();
  const images = getGalleryImages();
  currentImageIndex = (currentImageIndex + 1) % images.length;
  lightboxImg.src = images[currentImageIndex].src;
  lightboxImg.alt = images[currentImageIndex].alt;
}

function prevImage(event) {
  event.stopPropagation();
  const images = getGalleryImages();
  currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
  lightboxImg.src = images[currentImageIndex].src;
  lightboxImg.alt = images[currentImageIndex].alt;
}

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;

  if (e.key === 'Escape') closeLightbox(e);
  if (e.key === 'ArrowRight') nextImage(e);
  if (e.key === 'ArrowLeft') prevImage(e);
});

// ========== REVIEWS CAROUSEL (duplicate for infinite scroll) ==========
const slider = document.querySelector('.reviews-slider');
if (slider) {
  const cards = slider.innerHTML;
  slider.innerHTML = cards + cards;
}

// ========== SMOOTH SCROLL FOR NAV LINKS ==========
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
