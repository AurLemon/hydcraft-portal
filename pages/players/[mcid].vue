<template>
	<div>
		<div v-if="initialLoading" class="h-dvh bg-slate-950">
			<USkeleton class="h-full w-full rounded-none" />
		</div>
		<div
			v-else-if="hasError"
			class="immersive-site-shell flex h-dvh items-center justify-center pt-24 lg:pt-36"
		>
			<PageInlineException :icon="errorIcon" :title="errorTitle" />
		</div>
		<PlayerImmersiveHero v-else-if="account" :account="account" />
	</div>
</template>

<script setup lang="ts">
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'

definePageMeta({
	headerVariant: 'hero',
	pageContainerVariant: 'immersive',
	pageTransition: {
		name: 'immersive-page',
		mode: 'out-in',
	},
})

const route = useRoute()
const { t } = useI18n()

const mcid = computed(() => String(route.params.mcid ?? ''))

const { data, error, refresh } = await useFetch<{
	account: MinecraftAccountForm
}>(() => `/api/public/players/${encodeURIComponent(mcid.value)}`)
const accountState = ref<MinecraftAccountForm | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const initialLoading = ref(true)
watch(
	[data, error],
	() => {
		if (initialLoading.value && (data.value || error.value)) {
			initialLoading.value = false
		}
	},
	{ immediate: true },
)

watch(
	data,
	(value) => {
		const nextAccount = value?.account ?? null

		if (!nextAccount) {
			accountState.value = null
			return
		}

		if (!accountState.value || accountState.value.id !== nextAccount.id) {
			accountState.value = nextAccount
			return
		}

		Object.assign(accountState.value, nextAccount)
	},
	{ immediate: true },
)

watch(mcid, () => {
	accountState.value = null
	initialLoading.value = true
})

const account = computed<MinecraftAccountForm | null>(() => accountState.value)
const pageTitle = computed(() =>
	t('players.pageTitle', {
		name: account.value?.username || mcid.value,
	}),
)

const hasError = computed(() => Boolean(error.value) || !account.value)

const errorCode = computed(() => {
	const serverCode = (error.value?.data as { code?: string } | null)?.code
	if (serverCode) {
		return serverCode
	}

	return error.value?.statusCode === 404 ? 'PLAYER_NOT_FOUND' : 'LOAD_FAILED'
})

const errorIcon = computed(() => {
	switch (errorCode.value) {
		case 'MINECRAFT_PROFILE_NOT_PUBLIC':
			return 'i-lucide-eye-off'
		case 'PLAYER_NOT_FOUND':
			return 'i-lucide-user-x'
		default:
			return 'i-lucide-cloud-off'
	}
})

const errorTitle = computed(() => {
	switch (errorCode.value) {
		case 'MINECRAFT_PROFILE_NOT_PUBLIC':
			return t('players.notPublic')
		case 'PLAYER_NOT_FOUND':
			return t('players.notFound')
		default:
			return t('players.loadFailed')
	}
})
useExplicitRouteTitle(pageTitle)

onMounted(() => {
	refreshTimer = setInterval(() => {
		void refresh()
	}, 60_000)
})

onBeforeUnmount(() => {
	if (!refreshTimer) {
		return
	}

	clearInterval(refreshTimer)
	refreshTimer = null
})
</script>
