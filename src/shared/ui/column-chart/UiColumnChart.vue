<script setup lang="ts">
/**
 * Столбчатая диаграмма одной серии (без легенды — что показано, говорит заголовок).
 * Столбики ≤ 24px, скругление 4px сверху и прямой угол у основания, зазор между столбиками,
 * тонкая сетка; подсказка при наведении и фокусе; переключатель «Таблица» для доступности.
 */
const props = withDefaults(defineProps<{
  data: { label: string, full: string, value: number }[]
  /** Название для скринридеров и таблицы, например «Прослушивания по месяцам» */
  title: string
  unit?: (v: number) => string
  height?: number
  /** Показывать подпись на оси X через каждые N столбиков */
  labelEvery?: number
}>(), {
  unit: (v: number) => String(v),
  height: 180,
  labelEvery: 1,
})

const max = computed(() => Math.max(0, ...props.data.map(d => d.value)))

// «Круглые» деления оси: 1, 2, 5 × 10^n, три деления.
const ticks = computed(() => {
  const m = max.value
  if (m <= 0) return [0]
  const raw = m / 3
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map(k => k * p).find(s => s >= raw) ?? raw
  const top = Math.ceil(m / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
})
const top = computed(() => ticks.value.at(-1) || 1)

const hover = ref<number | null>(null)
const showTable = ref(false)
// Самый высокий столбик подписываем прямо на графике (выборочная подпись).
const peak = computed(() => (max.value > 0 ? props.data.findIndex(d => d.value === max.value) : -1))
</script>

<template>
  <figure class="chart">
    <div class="chart__toolbar">
      <button type="button" class="chart__toggle" :aria-pressed="showTable" @click="showTable = !showTable">
        {{ showTable ? 'График' : 'Таблица' }}
      </button>
    </div>

    <div v-if="!showTable" class="chart__plot" :style="{ height: `${height}px` }">
      <!-- Сетка и подписи оси Y -->
      <div class="chart__grid" aria-hidden="true">
        <div v-for="t in ticks" :key="t" class="chart__gridline" :style="{ bottom: `${(t / top) * 100}%` }">
          <span>{{ t }}</span>
        </div>
      </div>

      <div class="chart__bars" role="list" :aria-label="title">
        <div
          v-for="(d, i) in data"
          :key="i"
          class="chart__slot"
          role="listitem"
          tabindex="0"
          :aria-label="`${d.full}: ${unit(d.value)}`"
          @mouseenter="hover = i"
          @mouseleave="hover = null"
          @focus="hover = i"
          @blur="hover = null"
        >
          <span
            class="chart__bar"
            :class="{ 'is-hover': hover === i, 'is-zero': !d.value }"
            :style="{ height: d.value ? `max(2px, ${(d.value / top) * 100}%)` : '0' }"
          >
            <span v-if="i === peak && hover === null" class="chart__peak">{{ d.value }}</span>
          </span>
          <span v-if="hover === i" class="chart__tip" role="tooltip">
            <b>{{ unit(d.value) }}</b>
            <span>{{ d.full }}</span>
          </span>
        </div>
      </div>
    </div>

    <div v-if="!showTable" class="chart__xaxis" aria-hidden="true">
      <span v-for="(d, i) in data" :key="i">{{ i % labelEvery === 0 ? d.label : '' }}</span>
    </div>

    <table v-else class="chart__table">
      <caption class="sr-only">
        {{ title }}
      </caption>
      <tbody>
        <tr v-for="(d, i) in data" :key="i">
          <th scope="row">
            {{ d.full }}
          </th>
          <td>{{ unit(d.value) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style lang="scss" scoped>
$axis: 32px;

.chart {
  min-width: 0;
  margin: 0;

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--space-2);
  }

  &__toggle {
    @include reset-button;
    @include focus-ring;

    padding: 2px 10px;
    border-radius: var(--radius-full);

    @media (pointer: coarse) {
      min-height: 32px;
      padding-inline: 14px;
    }
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;

    @include hover {
      background: var(--c-surface);
      color: var(--c-text);
    }
  }

  &__plot {
    position: relative;
    margin-left: $axis;
  }

  &__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  // Сетка — тонкая и тихая; данные — единственное «громкое».
  &__gridline {
    position: absolute;
    right: 0;
    left: 0;
    border-top: 1px solid var(--c-border);

    span {
      position: absolute;
      right: calc(100% + 8px);
      transform: translateY(-50%);
      color: var(--c-text-subtle);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
  }

  &__bars {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: stretch;
    gap: 2px;
  }

  &__slot {
    position: relative;
    display: flex;
    flex: 1;
    align-items: flex-end;
    justify-content: center;
    min-width: 0;
    outline: none;
    cursor: default;

    &:focus-visible .chart__bar {
      outline: 2px solid var(--c-text);
      outline-offset: 2px;
    }
  }

  &__bar {
    position: relative;
    width: min(24px, 100%);
    border-radius: 4px 4px 0 0;
    background: var(--c-accent);
    transition: height 0.4s var(--ease), filter var(--dur-fast);

    &.is-hover {
      filter: brightness(1.12);
    }
  }

  &__peak {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    color: var(--c-text-muted);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  &__tip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    z-index: 2;
    display: grid;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: var(--c-text);
    color: var(--c-bg);
    font-size: var(--fs-xs);
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: var(--shadow-lg);

    b {
      font-size: var(--fs-sm);
    }
  }

  // Подсказка у верхнего края слота, а не у столбика — не уезжает за пределы графика.
  &__slot &__tip {
    bottom: auto;
    top: -8px;
    transform: translate(-50%, -100%);
  }

  &__xaxis {
    display: flex;
    gap: 2px;
    margin: 6px 0 0 $axis;

    span {
      flex: 1;
      min-width: 0;
      overflow: visible;
      color: var(--c-text-subtle);
      font-size: 11px;
      text-align: center;
      white-space: nowrap;
    }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-sm);

    th,
    td {
      padding: 6px var(--space-2);
      border-bottom: 1px solid var(--c-border);
      text-align: left;
    }

    th {
      color: var(--c-text-muted);
      font-weight: 500;
    }

    td {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
  }
}

.sr-only {
  @include visually-hidden;
}
</style>
