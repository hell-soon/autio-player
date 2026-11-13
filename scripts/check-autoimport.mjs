/**
 * Проверка ловушки автоимпорта (Nitro/Nuxt, unimport): имя, за которым сразу идёт приведение типа
 * `(NAME as Type)`, автоимпорт не распознаёт — в рантайме будет «NAME is not defined», а typecheck молчит.
 * Так дважды ломался сервер (YANDEX_QUALITIES, SMART_KINDS). Запуск: npm run check:autoimport
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['server', 'src']
const bad = []

// Что подставляет автоимпорт: экспорты server/utils, composables use*, API Vue/Nuxt
const AUTO = new Set(['ref', 'computed', 'reactive', 'readonly', 'watch', 'shallowRef', 'toRef', 'unref', 'nextTick', 'navigateTo', 'createError', 'schema'])
for (const name of readdirSync('server/utils')) {
  const src = readFileSync(join('server/utils', name), 'utf8')
  for (const m of src.matchAll(/^export (?:const|let|function|async function|class) ([A-Za-z_$][\w$]*)/gm)) AUTO.add(m[1])
}
const isAuto = n => AUTO.has(n) || /^use[A-Z]/.test(n)

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|vue)$/.test(name)) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return // комментарии
        for (const m of line.matchAll(/\(\s*([A-Za-z_$][\w$]*) as /g)) {
          if (isAuto(m[1])) bad.push(`${p}:${i + 1}  (${m[1]} as …)`)
        }
      })
    }
  }
}

ROOTS.forEach(walk)
if (bad.length) {
  console.error('Приведение типа сразу после имени — автоимпорт его не увидит. Используйте функцию-проверку или явный import:\n' + bad.join('\n'))
  process.exit(1)
}
console.log('check:autoimport — ок')
