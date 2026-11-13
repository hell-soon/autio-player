export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value && to.path !== '/login') return navigateTo('/login')
  if (loggedIn.value && to.path === '/login') return navigateTo('/')
  // Новый пользователь сначала один раз выбирает, чем пользуется; прошедшему приветствие оно не нужно
  const onboarded = user.value?.onboarded !== false
  if (loggedIn.value && !onboarded && to.path !== '/welcome') return navigateTo('/welcome')
  if (loggedIn.value && onboarded && to.path === '/welcome') return navigateTo('/')
})
