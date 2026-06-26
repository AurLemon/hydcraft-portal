<template>
	<div class="mx-auto flex w-full flex-col items-center pb-16">
		<div v-if="profilePending || connectionsPending" class="grid w-full gap-5">
			<USkeleton class="h-72 rounded-lg" />
			<USkeleton v-for="index in 3" :key="index" class="h-56 rounded-lg" />
		</div>

		<UAlert
			v-else-if="profileError || connectionsError"
			color="error"
			icon="i-lucide-circle-alert"
			:title="t('profile.connections.empty.loadFailed')"
		/>

		<div v-else-if="profile && connections" class="grid w-full gap-5">
			<div class="site-shell mx-auto w-full">
				<ProfileReadonlyHero :profile="profile" />
			</div>

			<div class="mx-auto mt-16 grid w-full max-w-3xl gap-16">
				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.connections.sections.oauth') }}
						</div>
					</div>
					<div class="grid gap-4">
						<div
							v-for="provider in connections.providers"
							:key="provider.provider"
							class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="flex min-w-0 items-center gap-4">
								<div
									class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
								>
									<img
										v-if="provider.logoUrl"
										:src="provider.logoUrl"
										:alt="provider.label"
										class="size-6 object-contain"
									/>
									<UIcon v-else :name="provider.icon" class="size-6" />
								</div>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<div class="font-semibold text-slate-950 dark:text-white">
											{{ provider.label }}
										</div>
										<UBadge
											:color="provider.connected ? 'primary' : 'neutral'"
											variant="soft"
											:class="
												provider.connected
													? 'inline-flex max-w-full items-center gap-1.5'
													: undefined
											"
										>
											<template v-if="!provider.configured">
												{{ t('profile.connections.status.unavailable') }}
											</template>
											<template v-else-if="provider.connected">
												<UIcon
													name="i-lucide-check"
													class="size-3.5 shrink-0"
												/>
												<UAvatar
													v-if="provider.account?.avatarUrl"
													:src="provider.account.avatarUrl"
													:alt="
														provider.account?.providerUsername || provider.label
													"
													size="3xs"
												/>
												<span class="truncate">
													{{
														provider.account?.providerUsername ||
														provider.account?.providerEmail ||
														t('profile.connections.status.connected')
													}}
												</span>
											</template>
											<template v-else>
												{{ t('profile.connections.status.disconnected') }}
											</template>
										</UBadge>
									</div>
								</div>
							</div>
							<div class="flex shrink-0 gap-2">
								<UButton
									v-if="!provider.connected"
									type="button"
									icon="i-lucide-link"
									:to="`/api/auth/oauth/${provider.provider.toLowerCase()}?locale=${locale}`"
									:disabled="!provider.configured"
									external
								>
									{{ t('profile.connections.actions.link') }}
								</UButton>
								<UButton
									v-else
									type="button"
									color="error"
									variant="soft"
									icon="i-lucide-unlink"
									:loading="unlinkingProvider === provider.provider"
									@click="unlinkProvider(provider.provider)"
								>
									{{ t('profile.connections.actions.unlink') }}
								</UButton>
							</div>
						</div>
					</div>
				</section>

				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.connections.sections.minecraft') }}
						</div>
					</div>
					<div class="grid gap-4">
						<div
							class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 p-5 dark:border-slate-800 bg-linear-to-br from-emerald-600 to-emerald-700"
						>
							<div class="flex min-w-0 items-center gap-4">
								<div
									class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-300"
								>
									<UIcon name="i-lucide-box" class="size-6" />
								</div>
								<div class="min-w-0">
									<div class="text-lg font-semibold text-white">
										{{
											t('profile.connections.minecraft.boundAccounts', {
												count: connections.minecraft.count,
											})
										}}
									</div>
								</div>
							</div>
							<UButton
								type="button"
								color="success"
								icon="i-lucide-arrow-right"
								:to="localePath('/me/minecraft')"
								class="justify-center"
							>
								{{ t('profile.connections.actions.openMinecraftProfile') }}
							</UButton>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	profileSectionTitleClass,
	type ProfileResponse,
} from '~/utils/profile-edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

type Provider = string

interface ExternalAccountSummary {
	id: string
	provider: Provider
	providerAccountId: string
	providerUsername: string | null
	providerEmail: string | null
	avatarUrl: string | null
	lastUsedAt: string | null
	createdAt: string
	updatedAt: string
}

interface ConnectionProvider {
	provider: Provider
	label: string
	icon: string
	logoUrl?: string
	configured: boolean
	connected: boolean
	account: ExternalAccountSummary | null
}

interface ConnectionsResponse {
	connections: {
		hasPassword: boolean
		providers: ConnectionProvider[]
		minecraft: {
			count: number
			href: string
		}
	}
}

const localePath = useLocalePath()
const { locale, t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const {
	data: profileData,
	pending: profilePending,
	error: profileError,
} = await useFetch<ProfileResponse>('/api/users/me/profile')
const {
	data: connectionsData,
	pending: connectionsPending,
	error: connectionsError,
	refresh: refreshConnections,
} = await useFetch<ConnectionsResponse>('/api/users/me/connections')

const profile = computed(() => profileData.value?.profile ?? null)
const connections = computed(() => connectionsData.value?.connections ?? null)
const unlinkingProvider = ref<Provider | null>(null)

const unlinkProvider = async (provider: Provider): Promise<void> => {
	unlinkingProvider.value = provider

	try {
		await $fetch(`/api/users/me/connections/${provider.toLowerCase()}`, {
			method: 'DELETE',
		})
		await refreshConnections()
		notifySuccess({
			title: t('profile.connections.notifications.unlinked', { provider }),
		})
	} catch (error) {
		notifyError(error, {
			title: t('profile.connections.notifications.unlinkFailed', { provider }),
		})
	} finally {
		unlinkingProvider.value = null
	}
}
</script>
