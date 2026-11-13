<script setup lang="ts">
import { Check, Send } from 'lucide-vue-next'
import { FriendAvatar, useFriends } from '@/entities/friend'
import { UiButton, UiCover, UiDialog, UiInput, useToast } from '@/shared/ui'

/** «Отправить другу»: выбрать друзей и (по желанию) подписать — трек появится у них в «Вам прислали». */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ track: Track | null }>()
const toast = useToast()
const { data: friends, refresh } = useFriends()
const picked = ref(new Set<string>())
const note = ref('')
const sending = ref(false)

watch(open, (o) => {
  if (!o) return
  picked.value = new Set()
  note.value = ''
  refresh()
})

function toggle(id: string) {
  const s = new Set(picked.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  picked.value = s
}

async function send() {
  if (!props.track || !picked.value.size) return
  sending.value = true
  try {
    await Promise.all([...picked.value].map(id =>
      $fetch(`/api/friends/${id}/share`, { method: 'POST', body: { track: props.track, note: note.value } })))
    const names = friends.value.filter(f => picked.value.has(f.id)).map(f => f.name)
    toast.show(`Отправлено: ${names.join(', ')}`)
    open.value = false
  }
  catch {
    toast.error('Не удалось отправить')
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <UiDialog v-model:open="open" title="Отправить другу">
    <div v-if="track" class="share__track">
      <UiCover :src="track.coverUrl" :size="44" />
      <span class="share__text">
        <span class="share__title">{{ track.title }}</span>
        <span class="share__artists">{{ track.artists.join(', ') }}</span>
      </span>
    </div>

    <p v-if="!friends.length" class="share__empty">
      Пока здесь никого нет. Пригласите друзей ссылкой из настроек.
    </p>
    <div v-else class="share__friends" role="group" aria-label="Кому отправить">
      <button
        v-for="f in friends"
        :key="f.id"
        type="button"
        class="share__friend"
        :class="{ 'is-on': picked.has(f.id) }"
        :aria-pressed="picked.has(f.id)"
        @click="toggle(f.id)"
      >
        <span class="share__avatar">
          <FriendAvatar :name="f.name" :src="f.avatarUrl" :size="52" />
          <span v-if="picked.has(f.id)" class="share__check"><Check /></span>
        </span>
        <span class="share__name">{{ f.name }}</span>
      </button>
    </div>

    <UiInput v-if="friends.length" v-model="note" placeholder="Подпись (по желанию): «послушай припев»" />
    <UiButton v-if="friends.length" variant="primary" block :loading="sending" :disabled="!picked.size" @click="send">
      <template #icon>
        <Send />
      </template>
      {{ picked.size ? 'Отправить' : 'Выберите друзей' }}
    </UiButton>
  </UiDialog>
</template>

<style lang="scss" scoped>
.share {
  &__track {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  &__text {
    display: grid;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__empty {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__friends {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: var(--space-2);
  }

  &__friend {
    @include reset-button;
    @include focus-ring;

    display: grid;
    justify-items: center;
    gap: 6px;
    min-width: 0;
    padding: var(--space-2) 2px;
    border-radius: var(--radius-md);

    @include hover {
      background: var(--c-surface);
    }
  }

  &__avatar {
    position: relative;
  }

  &__check {
    position: absolute;
    right: -2px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--c-bg-elevated);
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-on-accent);

    svg {
      width: 12px;
      height: 12px;
    }
  }

  &__name {
    @include truncate;

    max-width: 100%;
    font-size: var(--fs-xs);
    font-weight: 600;
  }
}
</style>
