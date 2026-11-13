<script setup lang="ts">
import { Link2, Users } from 'lucide-vue-next'
import { ListenTogetherButton } from '@/features/listen-together'
import { IncomingShares } from '@/features/share-with-friend'
import { FriendAvatar, lastSeenLabel, useFriends } from '@/entities/friend'
import { useCachedFetch } from '@/shared/lib'
import { UiButton, UiCover, UiEmptyState, UiPageHeader, UiSkeletonRows, useToast } from '@/shared/ui'

/** Друзья: кто что слушает прямо сейчас, «Слушать вместе», переход в профиль. */
const { data: friends, status, refresh } = useFriends()
const toast = useToast()

// Обновляем «сейчас играет», пока страница открыта и видна
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (!document.hidden) refresh()
  }, 15_000)
})
onBeforeUnmount(() => clearInterval(timer))

const { data: invite } = useCachedFetch<{ owner: boolean, code?: string | null }>('/api/me/invite', { key: 'me:invite', ttl: 30 * 60_000 })
async function copyInvite() {
  if (!invite.value?.code) return
  await navigator.clipboard?.writeText(`${location.origin}/login?invite=${encodeURIComponent(invite.value.code)}`).catch(() => {})
  toast.show('Ссылка-приглашение скопирована')
}
</script>

<template>
  <div class="friends">
    <UiPageHeader title="Друзья" subtitle="Что слушают прямо сейчас — можно подключиться и слушать вместе" />

    <IncomingShares mark-seen :limit="10" class="friends__shares">
      <template #title>
        <h2 class="friends__heading">
          Вам прислали
        </h2>
      </template>
    </IncomingShares>

    <UiSkeletonRows v-if="status === 'pending' && !friends.length" :count="6" />

    <UiEmptyState v-else-if="!friends.length" title="Пока никого" text="Пригласите друзей — здесь будет видно, что они слушают, их плейлисты и любимые треки.">
      <template #icon>
        <Users />
      </template>
      <UiButton v-if="invite?.code" variant="primary" @click="copyInvite">
        <template #icon>
          <Link2 />
        </template>
        Скопировать приглашение
      </UiButton>
    </UiEmptyState>

    <ul v-else class="friends__list">
      <li v-for="f in friends" :key="f.id">
        <NuxtLink :to="`/friends/${f.id}`" class="friend">
          <FriendAvatar :name="f.name" :src="f.avatarUrl" :size="52" :live="!!f.nowPlaying?.isPlaying" />
          <span class="friend__info">
            <span class="friend__name">{{ f.name }}</span>
            <span v-if="f.nowPlaying" class="friend__track">
              <UiCover :src="f.nowPlaying.track.coverUrl" :size="20" />
              <span class="friend__track-text">{{ f.nowPlaying.track.title }} — {{ f.nowPlaying.track.artists.join(', ') }}</span>
            </span>
            <span v-else class="friend__status">{{ lastSeenLabel(f) }}</span>
          </span>
          <ListenTogetherButton class="friend__listen" :friend="f" :now-playing="f.nowPlaying?.isPlaying ? f.nowPlaying : null" size="sm" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.friends {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  max-width: 820px;

  &__shares {
    margin-bottom: var(--space-6);
  }

  &__heading {
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__loading {
    display: grid;
    place-items: center;
    padding: var(--space-7);
    font-size: 24px;
  }

  &__list {
    @include glass;

    display: grid;
    gap: 2px;
    padding: var(--space-2);
    border-radius: var(--radius-lg);
    list-style: none;
  }
}

.friend {
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface);
  }

  &__info {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    @include truncate;

    font-weight: 600;
  }

  &__track {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__track-text {
    @include truncate;
  }

  &__status {
    color: var(--c-text-subtle);
    font-size: var(--fs-sm);
  }

  &__listen {
    flex: none;
  }

  @include down(sm) {
    &__listen :deep(.ui-button__label) {
      display: none;
    }
  }
}
</style>
