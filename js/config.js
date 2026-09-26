// @ts-check

/**
 * Konfiguracja statycznej witryny Paramita — adres API Velory i identyfikatory
 * hodowli, wraz z gatunkiem które reprezentują.
 *
 * UWAGA — klucze API poniżej TO NIE SĄ SEKRETY. Ta strona jest statyczna
 * (bez backendu), więc każdy klucz widoczny w źródle jest widoczny z założenia.
 * Jedyna ochrona to lista dozwolonych domen skonfigurowana po stronie Velory —
 * a zakres tych kluczy (WRITE_CONTACT) nie pozwala na nic poza wysłaniem
 * wiadomości z formularza kontaktowego. Nie kodować ich, nie zaciemniać,
 * nie doczytywać osobnym zapytaniem w runtime — utrudniłoby to tylko rotację.
 */

/** Bazowy adres API Velory (bez końcowego ukośnika). */
export const API_BASE = 'https://api.velora.pet/v1';

/**
 * Slugi hodowli Paramita, po jednym na gatunek.
 * @type {{CAT: string, DOG: string}}
 */
export const BREEDER_SLUGS = {
  CAT: 'paramitapl',
  DOG: 'paramita-fci',
};

/**
 * Klucze API WRITE_CONTACT — używane WYŁĄCZNIE przez js/contact.js przy
 * wysyłce formularza (POST .../contact). Żadny inny moduł nie powinien ich
 * dołączać do zapytania — odczyty (GET) są otwarte i muszą zostać bez
 * nagłówka Authorization (patrz js/api.js).
 * @type {{CAT: string, DOG: string}}
 */
export const API_KEYS = {
  CAT: 'vk_live_0xEyucHtjbFW51cGqA_ghEXzP8KuzAQ1',
  DOG: 'vk_live_gfA4c48Al1D4lYIYPpl45ar8haKvOehv',
};
