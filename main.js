'use strict';

const siteData = fetch('projects.json').then(response => {
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
});

// Animated 3D Perlin noise: time is the third coordinate, so the pattern flows.
(() => {
  const canvas = document.querySelector('#noise-background');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  // Continuous motion is intentional for this TV background. Pause only in hidden tabs.
  const permutation = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const p = [...permutation, ...permutation];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w,
      lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  }
  const photoCanvas = document.createElement('canvas');
  const photoContext = photoCanvas.getContext('2d', { willReadFrequently: true });
  let photoPixels = null;
  let photo = null;
  let currentPhoto = '';
  let loadingPhoto = false;
  let glitchUntil = 0;
  let photoPaths = ['images/balkon.jpeg'];
  function samplePhoto() {
    if (!photo || !photoContext) return;
    photoCanvas.width = canvas.width;
    photoCanvas.height = canvas.height;
    const scale = Math.max(canvas.width / photo.naturalWidth, canvas.height / photo.naturalHeight);
    const width = photo.naturalWidth * scale;
    const height = photo.naturalHeight * scale;
    photoContext.drawImage(photo, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    try {
      photoPixels = photoContext.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch { photoPixels = null; }
  }
  function loadPhoto(path, glitch = true) {
    loadingPhoto = true;
    const image = new Image();
    image.onload = () => {
      loadingPhoto = false;
      photo = image;
      currentPhoto = path;
      samplePhoto();
      if (glitch) glitchUntil = performance.now() + 480;
      draw(performance.now());
    };
    image.onerror = () => { loadingPhoto = false; };
    image.src = path;
  }
  siteData.then(data => {
    if (data && Array.isArray(data.backgrounds)) {
      const paths = data.backgrounds.filter(path => typeof path === 'string' && /^images\/[^?#]+\.(jpe?g|png|webp|gif)$/i.test(path));
      if (paths.length) photoPaths = [...new Set(paths)];
    }
  }).catch(() => {});
  window.setInterval(() => {
    if (document.hidden || loadingPhoto) return;
    const candidates = photoPaths.filter(path => path !== currentPhoto);
    if (candidates.length) loadPhoto(candidates[Math.floor(Math.random() * candidates.length)]);
  }, 6500);
  let pixels;
  let animation = 0;
  let lastFrame = -Infinity;
  // Small rendering surface keeps the effect light even on a large screen.
  function resize() {
    const aspect = Math.max(.25, Math.min(4, window.innerWidth / Math.max(1, window.innerHeight)));
    canvas.width = Math.min(480, Math.round(240 * aspect));
    canvas.height = 240;
    pixels = context.createImageData(canvas.width, canvas.height);
    samplePhoto();
    draw(performance.now());
  }
  function draw(now) {
    const time = now * .00065;
    const data = pixels.data;
    const glitching = now < glitchUntil;
    const width = canvas.width, height = canvas.height;
    const rollingBand = (now * .035) % (height + 60) - 30;
    for (let y = 0; y < height; y++) {
      // Gentle continuous warping plus short horizontal tears on photo changes.
      const drift = Math.round(noise(y * .018, time * 1.3, 3) * 9);
      const tear = glitching && Math.sin(Math.floor(y / 9) * 17 + Math.floor(now / 55)) > .35
        ? Math.round(noise(Math.floor(y / 9), now * .015, 9) * width * .22) : 0;
      for (let x = 0; x < width; x++) {
        const nx = x * .018 + time * 1.1;
        const ny = y * .018 - time * .7;
        const flow = noise(nx, ny, time * .75);
        const detail = noise(nx * 3, ny * 3, time * 1.8);
        const grain = (Math.random() - .5) * (glitching ? 115 : 36);
        const band = Math.max(0, 1 - Math.abs(y - rollingBand) / 16) * 13;
        const interference = flow * 72 + detail * 16 + grain + band;
        const scanline = y % 3 === 0 ? .89 : 1;
        const sx = ((x + drift + tear) % width + width) % width;
        const source = (y * width + sx) * 4;
        const splitX = (sx + (glitching ? 6 : 0)) % width;
        const redSource = (y * width + splitX) * 4;
        const i = (y * width + x) * 4;
        data[i] = ((photoPixels ? photoPixels[redSource] * .82 : 45) + interference) * scanline;
        data[i + 1] = ((photoPixels ? photoPixels[source + 1] * .82 : 40) + interference) * scanline;
        data[i + 2] = ((photoPixels ? photoPixels[source + 2] * .82 : 55) + interference) * scanline;
        data[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
  }
  function frame(now) {
    if (now - lastFrame >= 1000 / 24) {
      draw(now);
      lastFrame = now;
    }
    animation = window.requestAnimationFrame(frame);
  }
  function syncAnimation() {
    window.cancelAnimationFrame(animation);
    if (!document.hidden) {
      animation = window.requestAnimationFrame(frame);
    }
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncAnimation);
  resize();
  loadPhoto(photoPaths[0], false);
  syncAnimation();
})();

(() => {
  const grid = document.querySelector('#projects-grid');
  const status = document.querySelector('#projects-status');
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  function renderProjects(projects) {
    const entries = projects.filter(project => project && typeof project.title === 'string');
    entries.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
    for (const project of entries) {
      const card = document.createElement('article');
      card.className = 'project-card';
      if (project.featured === true) card.classList.add('is-featured');
      const imageUrl = safeUrl(project.image);
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = typeof project.imageAlt === 'string' ? project.imageAlt : project.title;
        image.loading = 'lazy';
        image.width = 640; image.height = 400;
        image.addEventListener('error', () => image.remove(), { once: true });
        card.append(image);
      }
      const content = document.createElement('div');
      content.className = 'project-content';
      if (project.featured === true) {
        const badge = document.createElement('span');
        badge.className = 'featured-badge';
        badge.textContent = '★ one of my favorites';
        content.append(badge);
      }
      const title = document.createElement('h3');
      const url = safeUrl(project.url);
      if (url) {
        const link = document.createElement('a');
        link.href = url; link.textContent = project.title;
        title.append(link);
      } else { title.textContent = project.title; }
      content.append(title);
      const description = document.createElement('p');
      description.textContent = typeof project.description === 'string' ? project.description : '';
      content.append(description);
      if (Array.isArray(project.tags)) {
        const tags = document.createElement('ul');
        tags.className = 'project-tags';
        for (const tag of project.tags.filter(tag => typeof tag === 'string')) {
          const item = document.createElement('li');
          item.textContent = tag; tags.append(item);
        }
        content.append(tags);
      }
      card.append(content); grid.append(card);
    }
    status.textContent = entries.length ? '' : 'More projects coming soon.';
    status.hidden = entries.length > 0;
  }
  async function loadProjects() {
    try {
      const data = await siteData;
      if (!data || !Array.isArray(data.projects)) throw new Error('Missing projects array');
      renderProjects(data.projects);
    } catch (error) {
      status.textContent = location.protocol === 'file:'
        ? 'Open this website through GitHub Pages or a local HTTP server to load projects.json.'
        : 'Projects could not be loaded. Please try again later.';
      console.error('Could not load projects.json:', error);
    }
  }
  loadProjects();
})();
