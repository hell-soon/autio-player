<script setup lang="ts">
import { Radio } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'

/** «Станции для вас» (жанры, настроения, занятия) из радио Яндекса. */
defineProps<{ stations: StationInfo[] }>()
const p = usePlayer()
const activeId = computed(() => (p.radioSource.value?.station === 'id' ? p.radioSource.value.id : null))
</script>

<template>
  <div class="stations">
    <button
      v-for="s in stations"
      :key="s.id"
      type="button"
      class="station"
      :class="{ 'is-active': activeId === s.id }"
      :style="s.color ? { '--station': s.color } : undefined"
      @click="p.startRadio({ station: 'id', id: s.id, name: s.name })"
    >
      <span class="station__icon">
        <img v-if="s.iconUrl" :src="s.iconUrl" alt="" loading="lazy">
        <Radio v-else />
      </span>
      {{ s.name }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.stations {
  display: flex;
  gap: var(--space-2);
  margin: 0 calc(var(--space-2) * -1);
  padding: 2px var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.station {
  @include reset-button;
  @include focus-ring;
  @include glass;

  --station: var(--c-accent);

  display: inline-flex;
  align-items: center;
  flex: none;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-4) 0 6px;
  border-radius: var(--radius-full);
  font-size: var(--fs-sm);
  font-weight: 600;
  white-space: nowrap;
  transition: background-color var(--dur-fast) var(--ease), transform var(--dur-fast);

  @include hover {
    background: var(--c-panel-strong);
  }

  &:active {
    transform: scale(0.97);
  }

  &.is-active {
    border-color: var(--station);
    box-shadow: inset 0 0 0 1px var(--station);
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border-radius: 50%;
    background: var(--station);
    color: #fff;

    img {
      width: 70%;
      height: 70%;
      object-fit: contain;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }
}
</style>
