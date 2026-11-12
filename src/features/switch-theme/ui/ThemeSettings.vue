<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { UiSegmented } from '@/shared/ui'
import { ACCENTS, THEME_MODES, useTheme } from '../model/theme'

const { mode, accent } = useTheme()
</script>

<template>
  <div class="theme-settings">
    <div class="theme-settings__row">
      <span class="theme-settings__label">Тема</span>
      <UiSegmented v-model="mode" :options="THEME_MODES" label="Тема оформления" />
    </div>

    <div class="theme-settings__row">
      <span class="theme-settings__label">Акцент</span>
      <div class="theme-settings__swatches" role="radiogroup" aria-label="Акцентный цвет">
        <button
          v-for="a in ACCENTS"
          :key="a.value"
          type="button"
          role="radio"
          class="swatch"
          :data-accent="a.value"
          :aria-checked="accent === a.value"
          :aria-label="a.label"
          :title="a.label"
          @click="accent = a.value"
        >
          <Check v-if="accent === a.value" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:map';

.theme-settings {
  display: grid;
  gap: var(--space-4);

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  &__label {
    color: var(--c-text-muted);
  }

  &__swatches {
    display: flex;
    gap: var(--space-2);
  }
}

// Каждая плашка показывает свой акцент в варианте для текущей темы.
.swatch {
  @include reset-button;
  @include focus-ring;

  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--swatch);
  color: var(--c-on-accent);
  transition: transform var(--dur-fast) var(--ease);

  @include hover {
    transform: scale(1.08);
  }

  &[aria-checked='true'] {
    box-shadow: 0 0 0 2px var(--c-bg), 0 0 0 4px var(--swatch);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

@each $name, $c in $accents {
  .swatch[data-accent='#{$name}'] {
    --swatch: #{map.get($c, dark)};

    @include when-light {
      --swatch: #{map.get($c, light)};
    }
  }
}
</style>
