// @ts-check

/**
 * Słownik PL/EN dla etykiet generowanych przez skrypty (płeć, komunikaty
 * formularza, puste stany, itp.). Jedyne źródło prawdy o języku strony to
 * `document.documentElement.lang` — nic inne (nie URL, nie nagłówek Accept-Language).
 *
 * @typedef {'pl'|'en'} Lang
 */

/** @type {Record<Lang, Record<string, string>>} */
const DICT = {
  pl: {
    'sex.male': 'Samiec',
    'sex.female': 'Samica',
    'species.all': 'Wszystkie',
    'species.cat': 'Koty',
    'species.dog': 'Psy',
    'events.empty': 'Brak nadchodzących wystaw',
    'gallery.albumsEmpty': 'Brak albumów',
    'gallery.albumEmpty': 'Brak zdjęć w tym albumie',
    'gallery.openPhoto': 'Powiększ zdjęcie',
    'gallery.close': 'Zamknij',
    'gallery.photoAlt': 'Zdjęcie z albumu',
    'animal.placeholderAlt': 'Zdjęcie niedostępne',
    'animal.viewProfile': 'Zobacz profil w portalu Velora',
    'form.name': 'Imię i nazwisko',
    'form.email': 'E-mail',
    'form.message': 'Wiadomość',
    'form.send': 'Wyślij',
    'form.sending': 'Wysyłanie…',
    'form.success': 'Wiadomość została wysłana.',
    'form.error': 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.',
    'form.required': 'To pole jest wymagane.',
    'form.invalidEmail': 'Podaj prawidłowy adres e-mail.',
    'form.tooManyRequests': 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  },
  en: {
    'sex.male': 'Male',
    'sex.female': 'Female',
    'species.all': 'All',
    'species.cat': 'Cats',
    'species.dog': 'Dogs',
    'events.empty': 'No upcoming shows',
    'gallery.albumsEmpty': 'No albums',
    'gallery.albumEmpty': 'No photos in this album',
    'gallery.openPhoto': 'Enlarge photo',
    'gallery.close': 'Close',
    'gallery.photoAlt': 'Photo from album',
    'animal.placeholderAlt': 'Photo unavailable',
    'animal.viewProfile': 'View profile on Velora',
    'form.name': 'Full name',
    'form.email': 'Email',
    'form.message': 'Message',
    'form.send': 'Send',
    'form.sending': 'Sending…',
    'form.success': 'Your message has been sent.',
    'form.error': 'Could not send the message. Please try again later.',
    'form.required': 'This field is required.',
    'form.invalidEmail': 'Please enter a valid email address.',
    'form.tooManyRequests': 'Too many attempts. Please try again shortly.',
  },
};

/**
 * Odczytuje bieżący język strony. `document.documentElement.lang` jest
 * jedynym źródłem prawdy — każda inna wartość niż 'en' traktowana jest jako 'pl'.
 * @returns {Lang}
 */
export function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'pl';
}

/**
 * Tłumaczy klucz słownika na etykietę w bieżącym języku strony.
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const lang = currentLang();
  return DICT[lang][key] ?? DICT.pl[key] ?? key;
}

/**
 * Formatuje datę ISO na czytelną datę w bieżącym języku strony.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  const lang = currentLang();
  const locale = lang === 'en' ? 'en-GB' : 'pl-PL';
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
