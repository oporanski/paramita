// @ts-check

/**
 * API Velory oddaje nazwy ras WYŁĄCZNIE po polsku — to jest kanoniczny klucz
 * dopasowania. Mapa tłumaczy te pięć ras hodowli Paramita na angielski dla
 * wersji /en/.
 * @type {Record<string, string>}
 */
const BREED_NAMES_EN = {
  Egzotyczny: 'Exotic Shorthair',
  Perski: 'Persian',
  'Maine Coon': 'Maine Coon',
  'Seter Angielski': 'English Setter',
  'Cocker Spaniel Amerykański': 'American Cocker Spaniel',
};

/**
 * Zwraca nazwę rasy w bieżącym języku strony.
 *
 * Brak wpisu w mapie (nowa rasa w hodowli, jeszcze nieprzetłumaczona) NIE
 * wywala listy — zwraca polską nazwę i zostawia ślad w konsoli, żeby ktoś
 * dopisał tłumaczenie.
 *
 * @param {string} namePl nazwa rasy po polsku, tak jak oddaje ją API
 * @param {'pl'|'en'} lang bieżący język strony
 * @returns {string}
 */
export function getBreedName(namePl, lang) {
  if (lang !== 'en') {
    return namePl;
  }

  const nameEn = BREED_NAMES_EN[namePl];
  if (nameEn === undefined) {
    console.warn(`[breeds] Brak angielskiego tłumaczenia rasy "${namePl}" — dopisz wpis w js/breeds.js.`);
    return namePl;
  }

  return nameEn;
}
