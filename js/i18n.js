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
    'posts.empty': 'Nic tu jeszcze nie ma — wkrótce zaczniemy pisać o naszych zwierzętach.',
    'posts.catsProfile': 'Paramita*PL (koty)',
    'posts.dogsProfile': 'Paramita FCI (psy)',
    'posts.photoAlt': 'Zdjęcie z wpisu',
    'form.name': 'Imię i nazwisko',
    'form.email': 'E-mail',
    'form.message': 'Wiadomość',
    'form.send': 'Wyślij',
    'form.sending': 'Wysyłanie…',
    'form.success': 'Wiadomość została wysłana.',
    'form.error': 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.',
    'form.required': 'To pole jest wymagane.',
    'form.invalidEmail': 'Podaj prawidłowy adres e-mail.',
    'form.tooManyRequests': 'Wysłano zbyt wiele wiadomości (limit to 10 na minutę). Spróbuj ponownie za chwilę.',
    'form.nameTooLong': 'Imię i nazwisko może mieć najwyżej 200 znaków.',
    'form.messageTooShort': 'Wiadomość musi mieć co najmniej 10 znaków.',
    'form.messageTooLong': 'Wiadomość może mieć najwyżej 2000 znaków.',
    'form.captchaRequired': 'Rozwiąż zagadkę antyspamową powyżej, aby wysłać wiadomość.',
    'form.captchaSolved': 'Zweryfikowano — możesz wysłać wiadomość.',
    'form.captchaError': 'Nie udało się zweryfikować. Odśwież stronę i spróbuj ponownie.',
    'form.originError': 'Nie można teraz wysłać wiadomości z tej strony — to błąd konfiguracji po naszej stronie, nie Twoja wina. Napisz do nas bezpośrednio:',
    'form.badRequestIntro': 'Formularz zawiera błąd — sprawdź wypełnione pola.',
    'form.networkErrorIntro': 'Nie udało się wysłać wiadomości — sprawdź połączenie z internetem i spróbuj ponownie. Możesz też napisać bezpośrednio:',
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
    'posts.empty': "There's nothing here yet — we'll soon start writing about our animals.",
    'posts.catsProfile': 'Paramita*PL (cats)',
    'posts.dogsProfile': 'Paramita FCI (dogs)',
    'posts.photoAlt': 'Photo from post',
    'form.name': 'Full name',
    'form.email': 'Email',
    'form.message': 'Message',
    'form.send': 'Send',
    'form.sending': 'Sending…',
    'form.success': 'Your message has been sent.',
    'form.error': 'Could not send the message. Please try again later.',
    'form.required': 'This field is required.',
    'form.invalidEmail': 'Please enter a valid email address.',
    'form.tooManyRequests': 'Too many messages sent (limit is 10 per minute). Please try again shortly.',
    'form.nameTooLong': 'Full name can be at most 200 characters.',
    'form.messageTooShort': 'Message must be at least 10 characters long.',
    'form.messageTooLong': 'Message can be at most 2000 characters long.',
    'form.captchaRequired': 'Solve the anti-spam puzzle above to send your message.',
    'form.captchaSolved': 'Verified — you can send your message.',
    'form.captchaError': 'Verification failed. Refresh the page and try again.',
    'form.originError': "We can't send messages from this page right now — this is a configuration issue on our side, not yours. Please write to us directly:",
    'form.badRequestIntro': 'The form has an error — please check the fields below.',
    'form.networkErrorIntro': "Could not send the message — check your internet connection and try again. You can also write to us directly:",
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
