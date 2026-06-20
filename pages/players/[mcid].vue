<template>
	<div class="site-shell -mt-2 pb-16">
		<div class="flex flex-col gap-4">
			<div v-if="initialLoading" class="grid gap-4">
				<USkeleton class="h-160 rounded-3xl" />
			</div>
			<PageInlineException
				v-else-if="hasError"
				:icon="errorIcon"
				:title="errorTitle"
			/>
			<template v-else-if="account">
				<div class="flex flex-col gap-3">
					<div
						v-if="boundPortalUser"
						class="flex items-center gap-0.5 px-1 text-sm text-slate-600 dark:text-slate-300"
					>
						<UIcon
							name="i-lucide-arrow-right"
							class="size-4 shrink-0 text-slate-400 dark:text-slate-500 mr-1"
						/>
						<span>{{ t('players.boundToPrefix') }}</span>
						<NuxtLink
							:to="localePath(`/u/${boundPortalUser.username}`)"
							class="inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-white"
						>
							<UAvatar
								:src="boundPortalUser.avatarUrl || undefined"
								:alt="boundPortalUser.username"
								size="xs"
								:text="boundPortalUser.username.slice(0, 1).toUpperCase()"
							/>
							<span class="font-medium">
								{{ boundPortalUser.username }}
							</span>
						</NuxtLink>
						<span v-if="boundToSuffix">{{ boundToSuffix }}</span>
					</div>

					<MinecraftAccountsContent
						:accounts="[account]"
						:selected-account="account"
						:saving-id="null"
					/>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	useExplicitRouteTitle,
	useHeaderRouteBadge,
} from '~/utils/layout/route-display'

definePageMeta({
	headerVariant: 'solid',
})

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

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
const boundPortalUser = computed(() => account.value?.boundPortalUser ?? null)
const boundToSuffix = computed(() => t('players.boundToSuffix').trim())
const pageTitle = computed(() =>
	t('players.pageTitle', {
		name: account.value?.username || mcid.value,
	}),
)
const headerRouteBadge = computed(() => ({
	type: 'minecraft-player' as const,
	labelKey: 'routes.playerPage',
	avatarUrl: getMinecraftHeadRendererUrl(mcid.value),
	fallbackText: mcid.value.slice(0, 1).toUpperCase() || 'P',
}))

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
useHeaderRouteBadge(headerRouteBadge)
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
