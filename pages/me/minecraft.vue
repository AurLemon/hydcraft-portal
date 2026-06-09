<template>
	<div class="site-shell mx-auto -mt-2 pb-16">
		<section>
			<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
				{{ t('minecraftAccounts.title') }}
			</h1>

			<div v-if="pending" class="mt-6 grid gap-3">
				<USkeleton v-for="index in 3" :key="index" class="h-28 rounded-lg" />
			</div>
			<UAlert
				v-else-if="error"
				class="mt-6"
				color="error"
				icon="i-lucide-circle-alert"
				:title="t('minecraftAccounts.empty.loadFailed')"
			/>
			<UAlert
				v-else-if="!accounts.length"
				class="mt-6"
				color="neutral"
				icon="i-lucide-box"
				:title="t('minecraftAccounts.empty.title')"
				:description="t('minecraftAccounts.empty.description')"
			/>
			<div v-else class="mt-6 grid gap-3">
				<article
					v-for="account in accounts"
					:key="account.id"
					class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
				>
					<div class="flex flex-col gap-4 md:flex-row md:items-start">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h2
									class="truncate text-lg font-semibold text-slate-950 dark:text-white"
								>
									{{ account.username }}
								</h2>
								<UBadge v-if="account.isPrimary" color="primary" variant="soft">
									{{ t('minecraftAccounts.badges.primary') }}
								</UBadge>
								<UBadge color="neutral" variant="soft">
									{{ account.status }}
								</UBadge>
							</div>
							<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
								{{ account.uuid ?? t('minecraftAccounts.fields.noUuid') }}
							</p>
						</div>

						<div class="flex w-full flex-col gap-3 md:w-80">
							<UTextarea
								v-model="account.noteDraft"
								:rows="3"
								:placeholder="t('minecraftAccounts.fields.note')"
							/>
							<UCheckbox
								v-model="account.isPrimaryDraft"
								:label="t('minecraftAccounts.fields.primary')"
							/>
							<UButton
								icon="i-lucide-save"
								:loading="savingId === account.id"
								class="justify-center"
								@click="saveAccount(account)"
							>
								{{ t('minecraftAccounts.actions.save') }}
							</UButton>
						</div>
					</div>
				</article>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

interface MinecraftAccountSummary {
	id: string
	username: string
	normalizedUsername: string
	uuid: string | null
	status: string
	source: string
	authmeName: string | null
	authmeId: number | null
	firstJoinedAt: string | null
	lastSeenAt: string | null
	isPrimary: boolean
	verifiedAt: string | null
	unlinkedAt: string | null
	note: string | null
	createdAt: string
	updatedAt: string
}

interface MinecraftAccountForm extends MinecraftAccountSummary {
	noteDraft: string
	isPrimaryDraft: boolean
}

interface MinecraftAccountsResponse {
	accounts: MinecraftAccountSummary[]
}

const { notifyError, notifySuccess } = useAdminToast()
const savingId = ref<string | null>(null)
const { data, pending, error, refresh } =
	await useFetch<MinecraftAccountsResponse>('/api/users/me/minecraft-accounts')

const accounts = computed<MinecraftAccountForm[]>(() =>
	(data.value?.accounts ?? []).map((account) => ({
		...account,
		noteDraft: account.note ?? '',
		isPrimaryDraft: account.isPrimary,
	})),
)

const saveAccount = async (account: MinecraftAccountForm): Promise<void> => {
	savingId.value = account.id

	try {
		await $fetch(`/api/users/me/minecraft-accounts/${account.id}`, {
			method: 'PATCH',
			body: {
				note: account.noteDraft,
				isPrimary: account.isPrimaryDraft,
			},
		})
		await refresh()
		notifySuccess({
			title: t('minecraftAccounts.notifications.saved'),
			description: t('minecraftAccounts.notifications.savedDescription'),
		})
	} catch (saveError) {
		notifyError(saveError, {
			title: t('minecraftAccounts.notifications.saveFailed'),
			description: t('minecraftAccounts.notifications.saveFailedDescription'),
		})
	} finally {
		savingId.value = null
	}
}
</script>
