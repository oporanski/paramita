// @ts-check

import { API_BASE, BREEDER_SLUGS, API_KEYS } from './config.js';
import { t } from './i18n.js';

/** @typedef {'CAT'|'DOG'} Species */

/** Najdłuższe dopuszczalne imię i nazwisko (zmierzone na serwerze na żywo). */
const NAME_MAX_LENGTH = 200;
/** Najkrótsza dopuszczalna wiadomość (zmierzone na serwerze na żywo). */
const MESSAGE_MIN_LENGTH = 10;
/** Najdłuższa dopuszczalna wiadomość (zmierzone na serwerze na żywo). */
const MESSAGE_MAX_LENGTH = 2000;
/** Limit czasu na odpowiedź serwera przy wysyłce, w milisekundach. */
const SUBMIT_TIMEOUT_MS = 10000;
/** Adres zapasowy, pokazywany gdy wysyłka z formularza się nie udaje. */
const FALLBACK_EMAIL = 'paramita@wp.pl';

/** Pola, które rozpoznajemy w komunikatach walidacji 400 z serwera. */
const KNOWN_FIELD_NAMES = ['name', 'email', 'message', 'phone', 'subject', 'consent'];

/**
 * @typedef {Object} ContactElements
 * @property {HTMLFormElement} form
 * @property {HTMLSelectElement} species
 * @property {HTMLInputElement} fullName
 * @property {HTMLInputElement} email
 * @property {HTMLInputElement} phone
 * @property {HTMLInputElement} subject
 * @property {HTMLTextAreaElement} message
 * @property {HTMLInputElement} consent
 * @property {HTMLButtonElement} submitButton
 * @property {HTMLElement} status
 * @property {HTMLElement} captchaHint
 * @property {HTMLElement & { reset?: () => void }} captchaWidget
 */

/**
 * @typedef {Object} ValidationError
 * @property {HTMLElement} field
 * @property {string} message
 */

/**
 * @typedef {Object} FieldMessage
 * @property {string} fieldName
 * @property {string} message
 */

/** Token ostatniej rozwiązanej zagadki Cap.js — jednorazowy, zerowany po każdej wysyłce. */
let captchaToken = null;
/** Czy wysyłka jest w toku — blokuje ponowne kliknięcie. */
let isSubmitting = false;

/**
 * Zbiera i typuje elementy formularza. Zwraca `null`, gdy struktura HTML nie
 * odpowiada oczekiwanej — skrypt wtedy nic nie robi (cicha porażka, jak
 * pozostałe moduły w tym projekcie).
 * @param {HTMLFormElement} form
 * @returns {ContactElements | null}
 */
function collectElements(form) {
  const species = form.elements.namedItem('species');
  const fullName = form.elements.namedItem('fullName');
  const email = form.elements.namedItem('email');
  const phone = form.elements.namedItem('phone');
  const subject = form.elements.namedItem('subject');
  const message = form.elements.namedItem('message');
  const consent = form.elements.namedItem('consent');
  const submitButton = document.getElementById('contact-submit');
  const status = document.getElementById('form-status');
  const captchaHint = document.getElementById('captcha-hint');
  const captchaWidget = document.getElementById('captcha-widget');

  if (
    !(species instanceof HTMLSelectElement) ||
    !(fullName instanceof HTMLInputElement) ||
    !(email instanceof HTMLInputElement) ||
    !(phone instanceof HTMLInputElement) ||
    !(subject instanceof HTMLInputElement) ||
    !(message instanceof HTMLTextAreaElement) ||
    !(consent instanceof HTMLInputElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement) ||
    !(captchaHint instanceof HTMLElement) ||
    !(captchaWidget instanceof HTMLElement)
  ) {
    return null;
  }

  return {
    form,
    species,
    fullName,
    email,
    phone,
    subject,
    message,
    consent,
    submitButton,
    status,
    captchaHint,
    captchaWidget,
  };
}

/**
 * Znajduje element błędu powiązany z polem przez `aria-describedby`.
 * @param {HTMLElement} input
 * @returns {HTMLElement | null}
 */
function findErrorElement(input) {
  const describedBy = input.getAttribute('aria-describedby');
  if (!describedBy) {
    return null;
  }
  const el = document.getElementById(describedBy);
  return el instanceof HTMLElement ? el : null;
}

/**
 * @param {HTMLElement} input
 * @param {string} message
 */
function showFieldError(input, message) {
  const errorEl = findErrorElement(input);
  if (errorEl) {
    errorEl.textContent = message;
  }
  input.setAttribute('aria-invalid', 'true');
}

/**
 * @param {HTMLElement} input
 */
function clearFieldError(input) {
  const errorEl = findErrorElement(input);
  if (errorEl) {
    errorEl.textContent = '';
  }
  input.removeAttribute('aria-invalid');
}

/**
 * @param {ContactElements} els
 */
function clearAllFieldErrors(els) {
  [els.fullName, els.email, els.subject, els.message, els.consent].forEach(clearFieldError);
}

/**
 * Prosta walidacja formatu adresu e-mail — wystarczająca do złapania
 * ewidentnych literówek przed wysyłką. Ostateczna walidacja jest po stronie
 * serwera.
 * @param {string} value
 * @returns {boolean}
 */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Waliduje pola formularza wg reguł zmierzonych na serwerze na żywo. Zwraca
 * listę błędów w kolejności pól w formularzu.
 * @param {ContactElements} els
 * @returns {ValidationError[]}
 */
function validate(els) {
  /** @type {ValidationError[]} */
  const errors = [];

  const name = els.fullName.value.trim();
  if (name.length === 0) {
    errors.push({ field: els.fullName, message: t('form.required') });
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.push({ field: els.fullName, message: t('form.nameTooLong') });
  }

  const email = els.email.value.trim();
  if (email.length === 0) {
    errors.push({ field: els.email, message: t('form.required') });
  } else if (!isValidEmail(email)) {
    errors.push({ field: els.email, message: t('form.invalidEmail') });
  }

  const subject = els.subject.value.trim();
  if (subject.length === 0) {
    errors.push({ field: els.subject, message: t('form.required') });
  }

  const message = els.message.value.trim();
  if (message.length === 0) {
    errors.push({ field: els.message, message: t('form.required') });
  } else if (message.length < MESSAGE_MIN_LENGTH) {
    errors.push({ field: els.message, message: t('form.messageTooShort') });
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.push({ field: els.message, message: t('form.messageTooLong') });
  }

  if (!els.consent.checked) {
    errors.push({ field: els.consent, message: t('form.required') });
  }

  return errors;
}

/**
 * @param {ContactElements} els
 */
function updateSubmitAvailability(els) {
  els.submitButton.disabled = isSubmitting || captchaToken === null;
}

/**
 * @param {ContactElements} els
 * @param {'initial'|'solved'|'error'} state
 */
function updateCaptchaHint(els, state) {
  if (state === 'solved') {
    els.captchaHint.textContent = t('form.captchaSolved');
  } else if (state === 'error') {
    els.captchaHint.textContent = t('form.captchaError');
  } else {
    els.captchaHint.textContent = t('form.captchaRequired');
  }
}

/**
 * Resetuje widget Cap.js — token jest jednorazowy, więc trzeba to zrobić po
 * każdej wysyłce, udanej albo nie.
 * @param {ContactElements} els
 */
function resetCaptcha(els) {
  captchaToken = null;
  els.captchaWidget.reset?.();
  updateCaptchaHint(els, 'initial');
  updateSubmitAvailability(els);
}

/**
 * Podłącza nasłuch zdarzeń widgetu antyspamowego. Token przychodzi w
 * `event.detail.token` przy zdarzeniu `solve`; widget może też zgłosić
 * `error` (nieudana weryfikacja) albo `reset`.
 * @param {ContactElements} els
 */
function wireCaptcha(els) {
  updateCaptchaHint(els, 'initial');

  els.captchaWidget.addEventListener('solve', (event) => {
    const detail = /** @type {CustomEvent<{ token?: string }>} */ (event).detail;
    captchaToken = typeof detail?.token === 'string' ? detail.token : null;
    updateCaptchaHint(els, captchaToken ? 'solved' : 'error');
    updateSubmitAvailability(els);
  });

  els.captchaWidget.addEventListener('error', () => {
    captchaToken = null;
    updateCaptchaHint(els, 'error');
    updateSubmitAvailability(els);
  });

  els.captchaWidget.addEventListener('reset', () => {
    captchaToken = null;
    updateCaptchaHint(els, 'initial');
    updateSubmitAvailability(els);
  });
}

/**
 * Czyści błąd pola w chwili, gdy gość zaczyna je poprawiać — nie trzeba
 * czekać do ponownej wysyłki, żeby zniknął nieaktualny komunikat.
 * @param {ContactElements} els
 */
function wireLiveErrorClearing(els) {
  [els.fullName, els.email, els.subject, els.message].forEach((input) => {
    input.addEventListener('input', () => clearFieldError(input));
  });
  els.consent.addEventListener('change', () => clearFieldError(els.consent));
}

/**
 * @param {ContactElements} els
 * @param {'idle'|'success'|'error'} kind
 * @param {(string | Node)[]} content
 */
function setStatus(els, kind, content) {
  els.status.classList.remove('form-status--success', 'form-status--error');
  if (kind === 'success') {
    els.status.classList.add('form-status--success');
  } else if (kind === 'error') {
    els.status.classList.add('form-status--error');
  }

  els.status.replaceChildren(
    ...content.map((item) => (typeof item === 'string' ? document.createTextNode(item) : item)),
  );

  if (kind !== 'idle') {
    els.status.focus();
  }
}

/**
 * Budowa komunikatu z zapasowym adresem e-mail jako klikalnym linkiem —
 * pokazywana, gdy wysyłka nie dochodzi do skutku z przyczyn poza kontrolą
 * gościa (origin, sieć, błąd serwera).
 * @param {string} introKey klucz i18n z wstępem przed adresem
 * @returns {Node[]}
 */
function buildFallbackEmailStatus(introKey) {
  const intro = document.createTextNode(`${t(introKey)} `);
  const link = document.createElement('a');
  link.href = `mailto:${FALLBACK_EMAIL}`;
  link.textContent = FALLBACK_EMAIL;
  return [intro, link];
}

/**
 * @param {Species} species
 * @returns {{ slug: string, apiKey: string }}
 */
function resolveTarget(species) {
  return { slug: BREEDER_SLUGS[species], apiKey: API_KEYS[species] };
}

/**
 * @param {any} body
 * @returns {FieldMessage[]}
 */
function extractFieldMessages(body) {
  const rawMessages = Array.isArray(body?.message)
    ? body.message
    : typeof body?.message === 'string'
      ? [body.message]
      : [];

  /** @type {FieldMessage[]} */
  const result = [];
  rawMessages.forEach((raw) => {
    if (typeof raw !== 'string') {
      return;
    }
    const fieldName = KNOWN_FIELD_NAMES.find((name) => raw.toLowerCase().startsWith(name));
    if (fieldName) {
      result.push({ fieldName, message: raw });
    }
  });

  return result;
}

/**
 * @param {ContactElements} els
 * @param {string} fieldName
 * @returns {HTMLElement | null}
 */
function findFieldByName(els, fieldName) {
  switch (fieldName) {
    case 'name':
      return els.fullName;
    case 'email':
      return els.email;
    case 'message':
      return els.message;
    case 'phone':
      return els.phone;
    case 'subject':
      return els.subject;
    case 'consent':
      return els.consent;
    default:
      return null;
  }
}

/**
 * @param {Response} response
 * @returns {Promise<any | null>}
 */
async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Odpowiedź 400 — próbuje przypisać komunikaty walidacji do konkretnych pól.
 * Gdy się nie da rozpoznać żadnego pola, pokazuje ogólny baner.
 * @param {ContactElements} els
 * @param {Response} response
 */
async function handleBadRequest(els, response) {
  const body = await readJsonSafely(response);
  const fieldMessages = extractFieldMessages(body);

  if (fieldMessages.length === 0) {
    setStatus(els, 'error', [t('form.badRequestIntro')]);
    return;
  }

  fieldMessages.forEach(({ fieldName, message }) => {
    const input = findFieldByName(els, fieldName);
    if (input) {
      showFieldError(input, message);
    }
  });

  const first = findFieldByName(els, fieldMessages[0].fieldName);
  if (first) {
    first.focus();
  } else {
    setStatus(els, 'error', [t('form.badRequestIntro')]);
  }
}

/**
 * @param {ContactElements} els
 * @param {Response} response
 */
async function handleErrorResponse(els, response) {
  if (response.status === 403) {
    setStatus(els, 'error', buildFallbackEmailStatus('form.originError'));
  } else if (response.status === 429) {
    setStatus(els, 'error', [t('form.tooManyRequests')]);
  } else if (response.status === 400) {
    await handleBadRequest(els, response);
  } else {
    setStatus(els, 'error', buildFallbackEmailStatus('form.networkErrorIntro'));
  }
}

/**
 * @param {ContactElements} els
 */
function handleSuccess(els) {
  els.form.reset();
  clearAllFieldErrors(els);
  setStatus(els, 'success', [t('form.success')]);
}

/**
 * @param {ContactElements} els
 */
async function submitContact(els) {
  const species = /** @type {Species} */ (els.species.value === 'DOG' ? 'DOG' : 'CAT');
  const { slug, apiKey } = resolveTarget(species);

  const body = {
    name: els.fullName.value.trim(),
    email: els.email.value.trim(),
    phone: els.phone.value.trim(),
    subject: els.subject.value.trim(),
    message: els.message.value.trim(),
    consent: els.consent.checked,
    captchaToken,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/breeders/${slug}/contact`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      handleSuccess(els);
    } else {
      await handleErrorResponse(els, response);
    }
  } catch {
    setStatus(els, 'error', buildFallbackEmailStatus('form.networkErrorIntro'));
  } finally {
    clearTimeout(timeoutId);
    resetCaptcha(els);
  }
}

/**
 * @param {ContactElements} els
 */
async function handleSubmit(els) {
  if (isSubmitting) {
    return;
  }

  clearAllFieldErrors(els);
  const errors = validate(els);
  if (errors.length > 0) {
    errors.forEach((error) => showFieldError(error.field, error.message));
    errors[0].field.focus();
    return;
  }

  if (captchaToken === null) {
    updateCaptchaHint(els, 'error');
    return;
  }

  isSubmitting = true;
  updateSubmitAvailability(els);
  els.submitButton.textContent = t('form.sending');
  setStatus(els, 'idle', []);

  try {
    await submitContact(els);
  } finally {
    isSubmitting = false;
    els.submitButton.textContent = t('form.send');
    updateSubmitAvailability(els);
  }
}

/**
 * Inicjalizuje formularz kontaktowy: walidację, widget antyspamowy Cap.js
 * i wysyłkę. Cicha porażka — brak oczekiwanej struktury HTML kończy się bez
 * żadnej akcji (patrz CONTRACT.md).
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const els = collectElements(form);
  if (els === null) {
    return;
  }

  els.submitButton.textContent = t('form.send');
  wireCaptcha(els);
  wireLiveErrorClearing(els);
  updateSubmitAvailability(els);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit(els);
  });
}

initContactForm();
