// @ts-check

/** Limit czasu pojedynczej próby zapytania, w milisekundach. */
const TIMEOUT_MS = 6000;

/** Odstęp przed jedyną ponowną próbą, w milisekundach. */
const RETRY_DELAY_MS = 2000;

/**
 * Wykonuje jedną próbę GET z limitem czasu. Nigdy nie rzuca — każdy błąd
 * (sieć, timeout, status spoza 2xx, JSON się nie parsuje) kończy się `null`.
 *
 * Celowo BEZ nagłówka Authorization: to zapytanie odczytu, a klucz API przy
 * GET wymusza zgodność sluga z organizacją klucza (klucz kotów -> 403 na
 * slugu psów, zmierzone). Odczyt ma zostać otwarty.
 *
 * @param {string} url
 * @returns {Promise<any | null>}
 */
async function attemptFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Pobiera JSON spod adresu, z jedną ponowną próbą po ~2 s i cichą porażką.
 * Nigdy nie rzuca — wołający zawsze dostaje albo dane, albo `null`.
 *
 * @param {string} url
 * @returns {Promise<any | null>}
 */
export async function fetchJson(url) {
  const first = await attemptFetch(url);
  if (first !== null) {
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return attemptFetch(url);
}
