// @ts-check

import { API_BASE, BREEDER_SLUGS } from './config.js';
import { fetchJson } from './api.js';
import { imgSrc } from './img.js';
import { t } from './i18n.js';

/**
 * @typedef {Object} NormalizedPhoto
 * @property {string|null} thumb
 * @property {string|null} lg
 * @property {number|null} width
 * @property {number|null} height
 * @property {string|null} title
 */

/**
 * @typedef {Object} NormalizedAlbum
 * @property {string} name
 * @property {NormalizedPhoto[]} photos
 */

/**
 * @param {any} response
 * @returns {NormalizedAlbum[]}
 */
function normalizeAlbums(response) {
  if (!response || !Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((album) => ({
    name: String(album.name ?? ''),
    photos: Array.isArray(album.photos)
      ? album.photos.map((photo) => ({
          thumb: imgSrc(photo.fileUrl ?? null, 'thumb'),
          lg: imgSrc(photo.fileUrl ?? null, 'lg'),
          width: typeof photo.width === 'number' ? photo.width : null,
          height: typeof photo.height === 'number' ? photo.height : null,
          title: photo.title ?? null,
        }))
      : [],
  }));
}

/**
 * Buduje jeden album jako siatkę przycisków-miniatur otwierających lightbox.
 * @param {NormalizedAlbum} album
 * @returns {HTMLElement}
 */
function buildAlbum(album) {
  const section = document.createElement('div');
  section.className = 'gallery-album';

  const heading = document.createElement('h3');
  heading.className = 'gallery-album__name';
  heading.textContent = album.name;
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'gallery-album__grid';

  album.photos.forEach((photo) => {
    if (!photo.thumb || !photo.lg) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-album__thumb-button';
    button.dataset.lg = photo.lg;
    button.setAttribute('aria-label', t('gallery.openPhoto'));

    const img = document.createElement('img');
    img.className = 'gallery-album__thumb';
    img.src = photo.thumb;
    img.alt = photo.title ?? `${album.name} — ${t('gallery.photoAlt')}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (photo.width) {
      img.width = photo.width;
    }
    if (photo.height) {
      img.height = photo.height;
    }
    button.appendChild(img);

    grid.appendChild(button);
  });

  section.appendChild(grid);
  return section;
}

/**
 * Tworzy natywny `<dialog>` powiększenia i podpina pod nim delegowany
 * listener kliknięć na miniatury. Esc zamyka natywnie (zdarzenie `close`
 * dialogu), po zamknięciu ostrość wraca na miniaturę, z której otwarto.
 *
 * @param {HTMLElement} containerEl
 */
function setupLightbox(containerEl) {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'gallery-lightbox__close';
  closeButton.textContent = t('gallery.close');
  closeButton.addEventListener('click', () => dialog.close());
  dialog.appendChild(closeButton);

  const photo = document.createElement('img');
  photo.className = 'gallery-lightbox__photo';
  dialog.appendChild(photo);

  document.body.appendChild(dialog);

  /** @type {HTMLElement | null} */
  let lastTrigger = null;

  containerEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button.gallery-album__thumb-button');
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const lgUrl = button.dataset.lg;
    if (!lgUrl) {
      return;
    }

    const img = button.querySelector('img');
    photo.src = lgUrl;
    photo.alt = img instanceof HTMLImageElement ? img.alt : '';

    lastTrigger = button;
    dialog.showModal();
  });

  dialog.addEventListener('close', () => {
    photo.src = '';
    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  });
}

/**
 * Pobiera galerie kotów i psów (jedno zapytanie na gatunek), scala albumy
 * i wypełnia kontener `gallery-albums`, jeśli jest na stronie. Cicha porażka:
 * gdy oba zapytania zawiodą, kontener zostaje nietknięty.
 */
export async function initGallery() {
  const containerEl = document.getElementById('gallery-albums');
  if (!(containerEl instanceof HTMLElement)) {
    return;
  }

  const [catsResponse, dogsResponse] = await Promise.all([
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.CAT}/gallery?photosPerAlbum=50`),
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.DOG}/gallery?photosPerAlbum=50`),
  ]);

  const albums = [...normalizeAlbums(catsResponse), ...normalizeAlbums(dogsResponse)].filter(
    (album) => album.photos.length > 0,
  );

  if (albums.length === 0) {
    return;
  }

  containerEl.replaceChildren(...albums.map((album) => buildAlbum(album)));
  setupLightbox(containerEl);
}

initGallery();
