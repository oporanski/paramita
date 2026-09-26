// @ts-check

/**
 * Warianty obrazków dostępne pod images.velora.pet.
 * @typedef {'original'|'lg'|'md'|'thumb'} ImageVariant
 */

/**
 * Jedyna droga do adresu obrazka w całym projekcie.
 *
 * API oddaje `https://velora.pet/uploads/{hash}` (bez rozszerzenia) — ten
 * adres przekierowuje (302) na `https://images.velora.pet/{hash}`, który
 * bez sufiksu wariantu kończy się 404 (zmierzone 11/11 obrazków z
 * data/snapshot.json). Działający adres to
 * `https://images.velora.pet/{hash}-{wariant}.webp`.
 *
 * Celowo NIE używamy `velora.pet/uploads/{hash}-{wariant}.webp` mimo że
 * działa: to dodatkowe przekierowanie (round-trip w obie strony), a na
 * odpowiedzi `velora.pet/uploads/...` siedzi nagłówek
 * `Cross-Origin-Resource-Policy: same-origin`, który psuje osadzanie na
 * domenie innej niż velora.pet. Zawsze wołamy images.velora.pet wprost.
 *
 * @param {string | null | undefined} url adres z API (pole `photoUrl`, `fileUrl`, `logo`, ...)
 * @param {ImageVariant} [variant] wariant rozmiaru, domyślnie 'md'
 * @returns {string | null} działający adres obrazka, albo null gdy brak wejścia
 */
export function imgSrc(url, variant = 'md') {
  if (!url) {
    return null;
  }

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // Adres niepoprawny — nie ma czego naprawiać, zwracamy jak jest.
    return url;
  }

  const isVeloraUpload = parsed.hostname === 'velora.pet' && parsed.pathname.startsWith('/uploads/');
  if (!isVeloraUpload) {
    // Adres zewnętrzny (np. już images.velora.pet, albo spoza Velory) — bez zmian.
    return url;
  }

  const lastSegment = parsed.pathname.split('/').pop() ?? '';
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment);

  if (hasExtension) {
    // Plik ma już rozszerzenie (np. PDF) — przenosimy na CDN bez dorabiania wariantu.
    return `https://images.velora.pet${parsed.pathname}`;
  }

  return `https://images.velora.pet/${lastSegment}-${variant}.webp`;
}
