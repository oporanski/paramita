// @ts-check

import { API_BASE, BREEDER_SLUGS } from './config.js';
import { fetchJson } from './api.js';
import { imgSrc } from './img.js';
import { getBreedName } from './breeds.js';
import { currentLang, t } from './i18n.js';

/**
 * @typedef {Object} NormalizedAnimal
 * @property {'CAT'|'DOG'} species
 * @property {string} breederSlug
 * @property {string} name
 * @property {string} slug
 * @property {string} breedNamePl
 * @property {'MALE'|'FEMALE'|string} sex
 * @property {string|null} photoUrl
 * @property {string|null} colorNamePl
 * @property {string|null} colorNameEn
 */

/**
 * Ilość kart w sekcji wyróżnionych zwierząt (`animals-featured`).
 */
const FEATURED_COUNT = 3;

/**
 * Zamienia surową odpowiedź API `/breeders/{slug}/animals` na listę
 * znormalizowanych zwierząt. Brak odpowiedzi albo nieoczekiwany kształt
 * zwraca pustą listę — nigdy nie rzuca.
 *
 * @param {any} response
 * @param {'CAT'|'DOG'} species
 * @param {string} breederSlug
 * @returns {NormalizedAnimal[]}
 */
function normalizeAnimals(response, species, breederSlug) {
  if (!response || !Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((animal) => ({
    species,
    breederSlug,
    name: String(animal.name ?? ''),
    slug: String(animal.slug ?? ''),
    breedNamePl: animal.breedRef?.name ?? '',
    sex: animal.sex ?? '',
    photoUrl: animal.photoUrl ?? null,
    colorNamePl: animal.colorRef?.namePl ?? null,
    colorNameEn: animal.colorRef?.nameEn ?? null,
  }));
}

/**
 * Buduje tekst metadanych karty: "{płeć} · {kolor}", pomijając brakujące części.
 * @param {NormalizedAnimal} animal
 * @param {'pl'|'en'} lang
 * @returns {string}
 */
function buildMetaText(animal, lang) {
  const parts = [];

  if (animal.sex === 'MALE') {
    parts.push(t('sex.male'));
  } else if (animal.sex === 'FEMALE') {
    parts.push(t('sex.female'));
  }

  const colorLabel = lang === 'en' ? animal.colorNameEn : animal.colorNamePl;
  if (colorLabel) {
    parts.push(colorLabel);
  }

  return parts.join(' · ');
}

/**
 * Kafelek zastępczy dla zwierzęcia bez zdjęcia (albo gdy zdjęcie nie wczyta się).
 * @param {NormalizedAnimal} animal
 * @returns {HTMLDivElement}
 */
function buildPlaceholder(animal) {
  const placeholder = document.createElement('div');
  placeholder.className = 'animal-card__placeholder';
  placeholder.dataset.species = animal.species;
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', animal.name);
  placeholder.textContent = animal.name.trim().charAt(0).toUpperCase();
  return placeholder;
}

/**
 * Buduje kartę zwierzęcia w kształcie zgodnym z CONTRACT.md.
 * @param {NormalizedAnimal} animal
 * @param {'pl'|'en'} lang
 * @returns {HTMLElement}
 */
function buildAnimalCard(animal, lang) {
  const article = document.createElement('article');
  article.className = 'animal-card';
  article.dataset.species = animal.species;

  const link = document.createElement('a');
  link.className = 'animal-card__link';
  link.href = `https://velora.pet/breeders/${animal.breederSlug}/animals/${animal.slug}`;
  link.target = '_blank';
  link.rel = 'noopener';

  const photoSrc = imgSrc(animal.photoUrl, 'md');
  if (photoSrc) {
    const img = document.createElement('img');
    img.className = 'animal-card__photo';
    img.src = photoSrc;
    img.alt = animal.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 600;
    img.height = 600;
    img.addEventListener(
      'error',
      () => {
        link.replaceChild(buildPlaceholder(animal), img);
      },
      { once: true },
    );
    link.appendChild(img);
  } else {
    link.appendChild(buildPlaceholder(animal));
  }

  const name = document.createElement('h3');
  name.className = 'animal-card__name';
  name.textContent = animal.name;
  link.appendChild(name);

  const breed = document.createElement('p');
  breed.className = 'animal-card__breed';
  breed.textContent = getBreedName(animal.breedNamePl, lang);
  link.appendChild(breed);

  const meta = document.createElement('p');
  meta.className = 'animal-card__meta';
  meta.textContent = buildMetaText(animal, lang);
  link.appendChild(meta);

  article.appendChild(link);
  return article;
}

/**
 * @param {HTMLElement} container
 * @param {NormalizedAnimal[]} animals
 * @param {'pl'|'en'} lang
 */
function renderInto(container, animals, lang) {
  container.replaceChildren(...animals.map((animal) => buildAnimalCard(animal, lang)));
}

/**
 * Podpina przełącznik gatunku (`.species-filter button[data-species]`) —
 * filtruje siatkę BEZ ponownego pobierania danych.
 *
 * @param {HTMLElement} gridEl
 * @param {NormalizedAnimal[]} allAnimals
 * @param {'pl'|'en'} lang
 */
function setupSpeciesFilter(gridEl, allAnimals, lang) {
  const filterEl = document.querySelector('.species-filter');
  if (!filterEl) {
    return;
  }

  const buttons = Array.from(filterEl.querySelectorAll('button[data-species]'));
  if (buttons.length === 0) {
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const species = button.getAttribute('data-species');
      buttons.forEach((candidate) => {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      });

      const filtered = species === 'all' || !species ? allAnimals : allAnimals.filter((animal) => animal.species === species);

      renderInto(gridEl, filtered, lang);
    });
  });
}

/**
 * Pobiera zwierzęta kotów i psów (jedno zapytanie na gatunek), scala je
 * i wypełnia kontenery `animals-grid` / `animals-featured`, jeśli są na stronie.
 * Cicha porażka: gdy oba zapytania zawiodą, kontenery zostają nietknięte
 * (HTML jest już wypełniony zapisem).
 */
export async function initAnimals() {
  const gridEl = document.getElementById('animals-grid');
  const featuredEl = document.getElementById('animals-featured');
  if (!gridEl && !featuredEl) {
    return;
  }

  const lang = currentLang();

  const [catsResponse, dogsResponse] = await Promise.all([
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.CAT}/animals?limit=50`),
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.DOG}/animals?limit=50`),
  ]);

  const cats = normalizeAnimals(catsResponse, 'CAT', BREEDER_SLUGS.CAT);
  const dogs = normalizeAnimals(dogsResponse, 'DOG', BREEDER_SLUGS.DOG);
  const all = [...cats, ...dogs];

  if (all.length === 0) {
    return;
  }

  if (gridEl instanceof HTMLElement) {
    renderInto(gridEl, all, lang);
    setupSpeciesFilter(gridEl, all, lang);
  }

  if (featuredEl instanceof HTMLElement) {
    renderInto(featuredEl, all.slice(0, FEATURED_COUNT), lang);
  }
}

initAnimals();
