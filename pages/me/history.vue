<template>
	<div class="site-shell pb-16">
		<div class="flex flex-col gap-6">
			<div class="flex justify-end">
				<div
					class="grid w-fit grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950 sm:self-end"
				>
					<button
						type="button"
						class="rounded-md px-2 py-1 text-sm transition-all duration-250 ease-out"
						:class="
							activeTab === 'players'
								? 'bg-primary-500 text-white shadow-sm translate-y-0 dark:bg-white dark:text-slate-950'
								: 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
						"
						@click="activeTab = 'players'"
					>
						{{ t('minecraftAccounts.history.tabs.byPlayer') }}
					</button>
					<button
						type="button"
						class="rounded-md px-2 py-1 text-sm transition-all duration-250 ease-out"
						:class="
							activeTab === 'servers'
								? 'bg-primary-500 text-white shadow-sm translate-y-0 dark:bg-white dark:text-slate-950'
								: 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
						"
						@click="activeTab = 'servers'"
					>
						{{ t('minecraftAccounts.history.tabs.byServer') }}
					</button>
				</div>
			</div>

			<div v-if="pending" class="grid gap-4">
				<USkeleton class="h-48 rounded-lg" />
				<USkeleton class="h-48 rounded-lg" />
			</div>

			<UAlert
				v-else-if="error"
				color="error"
				icon="i-lucide-circle-alert"
				:title="t('minecraftAccounts.history.loadFailed')"
			/>

			<template v-else>
				<Transition name="history-tab-switch" mode="out-in">
					<div
						v-if="activeTab === 'players' && accounts.length"
						key="players"
						class="grid gap-4"
					>
						<MinecraftPublicAccountsContent
							v-for="account in accounts"
							:key="account.id"
							:account="account"
						/>
					</div>

					<div
						v-else-if="activeTab === 'servers' && servers.length"
						key="servers"
						class="grid gap-6"
					>
						<section
							v-for="group in servers"
							:key="group.serverId"
							class="grid gap-3"
						>
							<div class="flex items-center gap-2 px-1">
								<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
									{{ group.serverName }}
								</h2>
								<UBadge color="neutral" variant="soft">
									{{
										t('minecraftAccounts.history.serverCount', {
											count: group.accounts.length,
										})
									}}
								</UBadge>
							</div>
							<div class="grid gap-4">
								<MinecraftPublicAccountsContent
									v-for="item in group.accounts"
									:key="`${group.serverId}-${item.account.id}-${item.serverViewId}`"
									:account="item.account"
									:fixed-server-view-id="item.serverViewId"
									:show-coordinates="true"
								/>
							</div>
						</section>
					</div>

					<PageInlineException
						v-else
						key="empty"
						icon="i-lucide-archive"
						:title="t('minecraftAccounts.history.emptyTitle')"
					>
						<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
							{{ t('minecraftAccounts.history.emptyDescription') }}
						</p>
					</PageInlineException>
				</Transition>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

interface HistoricalAccountsResponse {
	accounts: MinecraftAccountForm[]
	servers: Array<{
		serverId: string
		serverName: string
		accounts: Array<{
			account: MinecraftAccountForm
			serverViewId: string
		}>
	}>
}

const { t } = useI18n()
const activeTab = ref<'players' | 'servers'>('players')
const { data, pending, error } = await useFetch<HistoricalAccountsResponse>(
	'/api/users/me/history',
	{
		default: () => ({
			accounts: [],
			servers: [],
		}),
	},
)

const accounts = computed(() => data.value?.accounts ?? [])
const servers = computed(() => data.value?.servers ?? [])
</script>

<style scoped>
.history-tab-switch-enter-active,
.history-tab-switch-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.history-tab-switch-enter-from,
.history-tab-switch-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(8px);
}

.history-tab-switch-enter-to,
.history-tab-switch-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0);
}
</style>
