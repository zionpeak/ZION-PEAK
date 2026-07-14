(function () {
  'use strict';

  // Always start at the hero: the intro sequence assumes the viewer is at the
  // top, so browser scroll restoration on reload would play it off-screen.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header state ---------- */
  var header = document.getElementById('siteHeader');
  var headerSentinel = document.createElement('div');
  headerSentinel.setAttribute('aria-hidden', 'true');
  headerSentinel.style.cssText = 'position:absolute; top:0; left:0; width:1px; height:12px; pointer-events:none;';
  document.body.insertBefore(headerSentinel, document.body.firstChild);
  new IntersectionObserver(function (entries) {
    header.classList.toggle('scrolled', !entries[0].isIntersecting);
  }).observe(headerSentinel);

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mainNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Animated stat counters ---------- */
  var statEls = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }
    var start = 0;
    var duration = 1400;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(start + (target - start) * eased);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var heroStatEls = document.querySelectorAll('.hero-stats [data-count]');
  var deferredStatEls = Array.prototype.filter.call(statEls, function (el) {
    return !el.closest('.hero-stats');
  });
  if (heroStatEls.length) {
    if (prefersReducedMotion || typeof gsap === 'undefined') {
      heroStatEls.forEach(animateCount);
    } else {
      window.addEventListener('zp:hero-stats-visible', function () {
        heroStatEls.forEach(animateCount);
      }, { once: true });
    }
  }
  if (deferredStatEls.length) {
    var statIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    deferredStatEls.forEach(function (el) { statIo.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
  var triggers = document.querySelectorAll('.accordion-trigger');
  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------- Business-type autocomplete ---------- */
  var BUSINESS_TYPES = [
    // Food & beverage
    'Restaurant', 'Café', 'Coffee Shop', 'Bakery', 'Bar', 'Pub', 'Food Truck',
    'Catering', 'Pizzeria', 'Deli', 'Ice Cream Shop', 'Juice Bar', 'Smoothie Shop',
    'Brewery', 'Winery', 'Butcher Shop', 'Grocery Store', 'Dessert Shop', 'Tea House',
    // Personal care
    'Barbershop', 'Hair Salon', 'Nail Salon', 'Spa', 'Beauty Salon', 'Med Spa',
    'Tanning Salon', 'Massage Therapy', 'Tattoo Studio', 'Lash Studio', 'Esthetician',
    // Home services
    'Contractor', 'Plumber', 'Electrician', 'Landscaper', 'Lawn Care',
    'Cleaning Service', 'HVAC', 'Roofer', 'Painter', 'Handyman', 'Pest Control',
    'Moving Company', 'Locksmith', 'Carpet Cleaning', 'Window Cleaning',
    'Pool Service', 'Fencing', 'Flooring', 'Pressure Washing', 'Junk Removal',
    'Tree Service',
    // Automotive
    'Auto Repair', 'Car Wash', 'Auto Detailing', 'Tire Shop', 'Auto Body Shop',
    'Car Dealership', 'Towing Service', 'Mobile Mechanic',
    // Retail
    'Clothing Store', 'Boutique', 'Bookstore', 'Jewelry Store', 'Florist',
    'Gift Shop', 'Furniture Store', 'Thrift Store', 'Pet Store', 'Convenience Store',
    'Hardware Store', 'Toy Store', 'Sporting Goods Store',
    // Health & wellness
    'Gym', 'Yoga Studio', 'Pilates Studio', 'CrossFit Gym', 'Chiropractor',
    'Dentist', 'Physical Therapy', 'Optometrist', 'Counseling / Therapy',
    'Nutritionist', 'Personal Trainer', 'Martial Arts Studio', 'Dance Studio',
    // Professional services
    'Marketing Agency', 'Accounting Firm', 'Photography', 'Videography',
    'Real Estate Agency', 'Law Firm', 'Insurance Agency', 'Consulting',
    'Financial Advisor', 'Notary', 'Tax Preparation', 'IT Services',
    'Graphic Design', 'Staffing Agency', 'Travel Agency', 'Event Planning',
    'Printing Services', 'Tutoring', 'Music Lessons', 'Driving School',
    // Pets
    'Pet Grooming', 'Dog Walking', 'Pet Boarding', 'Veterinary Clinic', 'Dog Training',
    // Other local businesses
    'Daycare / Childcare', 'Laundromat', 'Dry Cleaning', 'Tailor / Alterations',
    'Storage Facility', 'Nonprofit', 'Church / Ministry', 'Coworking Space',
    'Art Gallery', 'Recording Studio', 'Barre Studio', 'Short-Term Rental'
  ].sort();

  var bizInput = document.getElementById('business');
  var bizList = document.getElementById('businessListbox');
  if (bizInput && bizList) {
    var bizActive = -1;
    var bizMatches = [];

    function bizNormalize(s) {
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Match from the start of any word: "ba" -> Barbershop/Bakery/Bar,
    // "food t" -> Food Truck.
    function bizFilter(query) {
      var q = bizNormalize(query.trim());
      if (!q) return [];
      return BUSINESS_TYPES.filter(function (type) {
        var words = bizNormalize(type).split(/[\s/]+/);
        return words.some(function (_, i) {
          return words.slice(i).join(' ').indexOf(q) === 0;
        });
      });
    }

    function bizClose() {
      bizList.hidden = true;
      bizList.innerHTML = '';
      bizInput.setAttribute('aria-expanded', 'false');
      bizInput.removeAttribute('aria-activedescendant');
      bizActive = -1;
      bizMatches = [];
    }

    function bizSelect(i) {
      if (i < 0 || i >= bizMatches.length) return;
      bizInput.value = bizMatches[i];
      bizClose();
    }

    function bizSetActive(i) {
      bizActive = i;
      var items = bizList.querySelectorAll('li');
      items.forEach(function (li, idx) {
        li.classList.toggle('is-active', idx === i);
      });
      if (i >= 0 && items[i]) {
        bizInput.setAttribute('aria-activedescendant', items[i].id);
        items[i].scrollIntoView({ block: 'nearest' });
      } else {
        bizInput.removeAttribute('aria-activedescendant');
      }
    }

    function bizRender() {
      bizMatches = bizFilter(bizInput.value);
      if (!bizMatches.length) { bizClose(); return; }
      bizList.innerHTML = '';
      bizMatches.forEach(function (type, i) {
        var li = document.createElement('li');
        li.id = 'business-opt-' + i;
        li.setAttribute('role', 'option');
        li.textContent = type;
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          bizSelect(i);
        });
        bizList.appendChild(li);
      });
      bizList.hidden = false;
      bizInput.setAttribute('aria-expanded', 'true');
      bizActive = -1;
    }

    bizInput.addEventListener('input', bizRender);
    bizInput.addEventListener('blur', bizClose);
    bizInput.addEventListener('keydown', function (e) {
      if (bizList.hidden) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        bizSetActive((bizActive + 1) % bizMatches.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        bizSetActive((bizActive - 1 + bizMatches.length) % bizMatches.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (bizActive >= 0) bizSelect(bizActive);
        else bizClose();
      } else if (e.key === 'Escape') {
        bizClose();
      }
    });
  }

  /* ---------- Contact form (Netlify Forms) ---------- */
  var form = document.getElementById('contactForm');
  var formNote = document.getElementById('formNote');
  var submitBtn = document.getElementById('submitBtn');
  var submitLabel = submitBtn.querySelector('.btn-label');
  var defaultLabelText = submitLabel.textContent;

  function showFormSuccess() {
    submitBtn.classList.add('is-success');
    submitLabel.textContent = 'Let’s Build Something Great.';

    var checkPath = submitBtn.querySelector('.btn-check path');
    var ripple = submitBtn.querySelector('.btn-success-ripple');
    if (prefersReducedMotion || typeof gsap === 'undefined' || !checkPath) return;

    var len = checkPath.getTotalLength();
    gsap.fromTo(checkPath,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', delay: 0.05 });

    if (ripple) {
      var checkRect = submitBtn.querySelector('.btn-check').getBoundingClientRect();
      var btnRect = submitBtn.getBoundingClientRect();
      gsap.set(ripple, {
        left: checkRect.left - btnRect.left + checkRect.width / 2,
        top: checkRect.top - btnRect.top + checkRect.height / 2,
        xPercent: -50,
        yPercent: -50
      });
      gsap.fromTo(ripple,
        { opacity: 0.7, scale: 0.3 },
        { opacity: 0, scale: 2.4, duration: 0.7, ease: 'power1.out', delay: 0.2 });
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    submitBtn.classList.remove('is-success');
    submitBtn.disabled = true;
    submitLabel.textContent = 'Sending…';
    formNote.textContent = '';

    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Formspree submission failed: ' + response.status);
        submitBtn.disabled = false;
        formNote.textContent = 'Message sent — I’ll reply within one business day.';
        form.reset();
        showFormSuccess();
      })
      .catch(function () {
        submitLabel.textContent = defaultLabelText;
        submitBtn.disabled = false;
        formNote.textContent = 'Something went wrong sending that — please email zionpeakstudio@gmail.com directly.';
      });
  });

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Back to top ---------- */
  document.getElementById('toTop').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
})();
