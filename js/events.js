// @ts-check

import { API_BASE, BREEDER_SLUGS } from './config.js';
import { fetchJson } from './api.js';
import { currentLang, formatDate, t } from './i18n.js';

/**
 * @typedef {Object} NormalizedEvent
 * @property {string} title
 * @property {string} startDate ISO 8601
 * @property {string} [endDate] ISO 8601 — wystawy dwudniowe maja date konca
 * @property {string} city
 * @property {string} country
 */

/**
 * Usuwa z DOM-u pozycje `li.event`, których data (`time.event__date[datetime]`)
 * już minęła. Działa NIEZALEŻNIE od wyniku pobrania — dotyczy też zapisu
 * z HTML, żeby strona nie ogłaszała wystawy sprzed roku jako nadchodzącej.
 *
 * @param {HTMLElement} listEl
 */
/**
 * Czy wystawa jest nadal aktualna, liczac DNIAMI KALENDARZOWYMI, nie chwilami.
 *
 * Velora podaje daty wystaw jako polnoc UTC (`2026-09-26T00:00:00.000Z`).
 * Porownanie `startDate < Date.now()` uznawalo wiec wystawe odbywajaca sie DZIS
 * za przeszla juz o 00:01 — impreza znikala ze strony w dniu, w ktorym sie
 * odbywa. Wylapane w przegladarce: HTML mial 5 wystaw, strona pokazywala 4.
 *
 * Wystawa jest aktualna, dopoki nie minal jej OSTATNI dzien: `endDate` gdy
 * istnieje (wystawy w Gdyni sa dwudniowe), w przeciwnym razie `startDate`.
 *
 * @param {string} startDate ISO 8601
 * @param {string} [endDate] ISO 8601, gdy wystawa trwa kilka dni
 * @returns {boolean}
 */
function isStillUpcoming(startDate, endDate) {
  const last = new Date(endDate || startDate);
  if (Number.isNaN(last.getTime())) return true; // nieczytelna data — nie ukrywamy
  const today = new Date();
  const todayMidnight = Date.UTC(
    today.getFullYear(), today.getMonth(), today.getDate(),
  );
  const lastMidnight = Date.UTC(
    last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate(),
  );
  return lastMidnight >= todayMidnight;
}

function removePastEventsFromDom(listEl) {
  listEl.querySelectorAll('li.event').forEach((li) => {
    const time = li.querySelector('time.event__date');
    const iso = time?.getAttribute('datetime');
    const end = li.getAttribute('data-end-date') || undefined;
    if (iso && !isStillUpcoming(iso, end)) {
      li.remove();
    }
  });
}

/**
 * @param {any} response
 * @returns {NormalizedEvent[] | null} null gdy odpowiedź ma nieoczekiwany kształt
 */
function normalizeEvents(response) {
  if (!response || !Array.isArray(response.data)) {
    return null;
  }

  return response.data.map((event) => ({
    title: String(event.title ?? ''),
    startDate: String(event.startDate ?? ''),
    endDate: event.endDate ? String(event.endDate) : undefined,
    city: String(event.city ?? ''),
    country: String(event.country ?? ''),
  }));
}

/**
 * Filtruje przeszłe wystawy i sortuje pozostałe po dacie rosnąco.
 * @param {NormalizedEvent[]} events
 * @returns {NormalizedEvent[]}
 */
function filterAndSortUpcoming(events) {
  return events
    .filter((event) => isStillUpcoming(event.startDate, event.endDate))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

/**
 * Buduje kartę wystawy w kształcie zgodnym z CONTRACT.md.
 * @param {NormalizedEvent} event
 * @returns {HTMLLIElement}
 */
function buildEventCard(event) {
  const li = document.createElement('li');
  li.className = 'event';
  // Filtr `removePastEventsFromDom` czyta te date z DOM, wiec musi tu byc.
  if (event.endDate) li.setAttribute('data-end-date', event.endDate);

  const time = document.createElement('time');
  time.className = 'event__date';
  time.setAttribute('datetime', event.startDate);
  time.textContent = formatDate(event.startDate);
  li.appendChild(time);

  const title = document.createElement('span');
  title.className = 'event__title';
  title.textContent = event.title;
  li.appendChild(title);

  const place = document.createElement('span');
  place.className = 'event__place';
  place.textContent = `${event.city}, ${event.country}`;
  li.appendChild(place);

  return li;
}

/**
 * Karta zastępcza, gdy po filtrze nie zostaje żadna nadchodząca wystawa.
 * @returns {HTMLLIElement}
 */
function buildEmptyState() {
  const li = document.createElement('li');
  li.className = 'event event--empty';
  li.textContent = t('events.empty');
  return li;
}

/**
 * Wypełnia kontener `events-list` nadchodzącymi wystawami, posortowanymi
 * po dacie rosnąco. Usuwa przeszłe pozycje z zapisu w HTML niezależnie od
 * wyniku pobrania. Cicha porażka: gdy pobranie zawiedzie, zapis w HTML
 * (już oczyszczony z przeszłych dat) zostaje bez zmian.
 */
export async function initEvents() {
  const listEl = document.getElementById('events-list');
  if (!(listEl instanceof HTMLElement)) {
    return;
  }

  removePastEventsFromDom(listEl);

  const [catsResponse, dogsResponse] = await Promise.all([
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.CAT}/events?when=upcoming`),
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.DOG}/events?when=upcoming`),
  ]);

  const catEvents = normalizeEvents(catsResponse);
  const dogEvents = normalizeEvents(dogsResponse);
  if (catEvents === null && dogEvents === null) {
    return;
  }

  const events = [...(catEvents ?? []), ...(dogEvents ?? [])];
  const upcoming = filterAndSortUpcoming(events);
  if (upcoming.length === 0) {
    listEl.replaceChildren(buildEmptyState());
    return;
  }

  listEl.replaceChildren(...upcoming.map((event) => buildEventCard(event)));
}

initEvents();
