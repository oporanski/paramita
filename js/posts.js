// @ts-check

import { API_BASE, BREEDER_SLUGS } from './config.js';
import { fetchJson } from './api.js';
import { formatDate, t } from './i18n.js';
import { imgSrc } from './img.js';

/**
 * @typedef {Object} NormalizedPost
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string[]} mediaUrls
 * @property {string} publishedAt ISO 8601
 * @property {string} createdAt ISO 8601
 */

/**
 * @param {any} response
 * @returns {NormalizedPost[] | null} null gdy odpowiedź ma nieoczekiwany kształt
 */
function normalizePosts(response) {
  if (!response || !Array.isArray(response.data)) {
    return null;
  }

  return response.data.map((post) => ({
    id: String(post.id ?? ''),
    title: String(post.title ?? ''),
    content: String(post.content ?? ''),
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls.map((url) => String(url)) : [],
    publishedAt: String(post.publishedAt ?? post.createdAt ?? ''),
    createdAt: String(post.createdAt ?? ''),
  }));
}

/**
 * Sortuje wpisy malejąco po dacie publikacji — najnowsze na górze.
 * @param {NormalizedPost[]} posts
 * @returns {NormalizedPost[]}
 */
function sortByPublishedDesc(posts) {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/**
 * Buduje kartę wpisu w kształcie zgodnym z CONTRACT.md. Brak tytułu → bez
 * `h2.post__title`. Brak zdjęć → bez `div.post__media`.
 * @param {NormalizedPost} post
 * @returns {HTMLElement}
 */
function buildPostCard(post) {
  const article = document.createElement('article');
  article.className = 'post';

  const time = document.createElement('time');
  time.className = 'post__date';
  time.setAttribute('datetime', post.publishedAt);
  time.textContent = formatDate(post.publishedAt);
  article.appendChild(time);

  if (post.title) {
    const title = document.createElement('h2');
    title.className = 'post__title';
    title.textContent = post.title;
    article.appendChild(title);
  }

  const body = document.createElement('p');
  body.className = 'post__body';
  body.textContent = post.content;
  article.appendChild(body);

  if (post.mediaUrls.length > 0) {
    const media = document.createElement('div');
    media.className = 'post__media';

    post.mediaUrls.forEach((url) => {
      const src = imgSrc(url, 'md');
      if (!src) {
        return;
      }
      const img = document.createElement('img');
      img.className = 'post__photo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = src;
      img.alt = post.title || t('posts.photoAlt');
      media.appendChild(img);
    });

    if (media.children.length > 0) {
      article.appendChild(media);
    }
  }

  return article;
}

/**
 * Zachęcający pusty stan — identyczny z zapisem w HTML (patrz
 * aktualnosci/index.html), tak żeby podmiana po nieudanym/pustym pobraniu
 * niczego nie zmieniała wizualnie.
 * @returns {HTMLElement}
 */
function buildEmptyState() {
  const wrapper = document.createElement('div');
  wrapper.className = 'posts-empty';

  const intro = document.createElement('p');
  intro.textContent = t('posts.empty');
  wrapper.appendChild(intro);

  const links = document.createElement('p');
  links.className = 'posts-empty__links';

  const catsLink = document.createElement('a');
  catsLink.href = 'https://velora.pet/breeders/paramitapl';
  catsLink.target = '_blank';
  catsLink.rel = 'noopener';
  catsLink.textContent = t('posts.catsProfile');
  links.appendChild(catsLink);

  links.appendChild(document.createTextNode(' · '));

  const dogsLink = document.createElement('a');
  dogsLink.href = 'https://velora.pet/breeders/paramita-fci';
  dogsLink.target = '_blank';
  dogsLink.rel = 'noopener';
  dogsLink.textContent = t('posts.dogsProfile');
  links.appendChild(dogsLink);

  wrapper.appendChild(links);

  return wrapper;
}

/**
 * Wypełnia kontener `posts-list` wpisami obu hodowli, scalonymi i
 * posortowanymi malejąco po dacie publikacji. Cicha porażka: gdy oba
 * pobrania zawiodą, zapis w HTML zostaje bez zmian. Gdy pobranie się uda,
 * ale lista jest pusta (dziś: zawsze), pokazuje zachęcający pusty stan
 * — patrz CONTRACT.md, sekcja o wyjątku dla tej strony.
 */
export async function initPosts() {
  const listEl = document.getElementById('posts-list');
  if (!(listEl instanceof HTMLElement)) {
    return;
  }

  const [catsResponse, dogsResponse] = await Promise.all([
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.CAT}/posts?limit=20`),
    fetchJson(`${API_BASE}/breeders/${BREEDER_SLUGS.DOG}/posts?limit=20`),
  ]);

  const catPosts = normalizePosts(catsResponse);
  const dogPosts = normalizePosts(dogsResponse);
  if (catPosts === null && dogPosts === null) {
    return;
  }

  const posts = sortByPublishedDesc([...(catPosts ?? []), ...(dogPosts ?? [])]);
  if (posts.length === 0) {
    listEl.replaceChildren(buildEmptyState());
    return;
  }

  listEl.replaceChildren(...posts.map((post) => buildPostCard(post)));
}

initPosts();
