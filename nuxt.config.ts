import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Версия приложения: номер из package.json + коммит (Vercel проставляет VERCEL_GIT_COMMIT_SHA при сборке)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string }

const scssAbstracts = fileURLToPath(new URL('./src/shared/styles/abstracts', import.meta.url))

export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  srcDir: 'src',
  dir: {
    pages: 'app/routes',
    layouts: 'app/layouts',
    middleware: 'app/middleware',
    plugins: 'app/plugins',
  },
  components: { dirs: [] },

  css: ['@fontsource-variable/inter', '@/app/styles/index.scss'],
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        'lucide-vue-next',
      ]
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${scssAbstracts}" as *;\n`,
        },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      titleTemplate: '%s · Audio',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0e0e12' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Audio' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
    },
  },

  devServer: { host: '127.0.0.1' },

  // Новая сборка на сервере проверяется каждые 5 минут (по умолчанию — раз в час); см. plugins/update.client.ts
  experimental: {
    checkOutdatedBuildInterval: 5 * 60_000,
    // Плавные переходы между страницами (View Transitions; при «уменьшить движение» — без них)
    viewTransition: true,
  },

  runtimeConfig: {
    public: {
      appVersion: pkg.version ?? '0.0.0',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
      builtAt: Date.now(),
    },
    inviteCode: '',
    session: {
      password: '',
      maxAge: 60 * 60 * 24 * 365,
    },
    spotify: {
      clientId: '',
      clientSecret: '',
    },
    db: {
      url: '',
    },
    lastfm: {
      apiKey: '',
      secret: '',
    },
    genius: {
      token: '',
    },
  },
})
