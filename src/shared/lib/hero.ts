/**
 * «Перелёт» обложки при переходе на страницу (View Transitions, включены в nuxt.config):
 * обложке нажатой карточки на мгновение даём имя cover-hero — такое же стоит у обложки
 * в шапке страницы коллекции, и браузер плавно переносит одну в другую.
 * Имя живёт недолго: двух элементов с одним именем на странице быть не должно.
 */
export function heroCover(e: Event) {
  const card = e.currentTarget as HTMLElement | null
  const cover = card?.querySelector<HTMLElement>('.playlist-cover, .ui-cover, .mix__cover')
  if (!cover) return
  cover.style.viewTransitionName = 'cover-hero'
  setTimeout(() => (cover.style.viewTransitionName = ''), 1200)
}
