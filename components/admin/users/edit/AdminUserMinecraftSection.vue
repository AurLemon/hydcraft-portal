<template>
	<section class="grid gap-4 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.minecraftAccounts') }}
			</div>
		</div>

		<div class="grid gap-4">
			<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
				<USelectMenu
					v-model="minecraftLookupValue"
					v-model:search-term="minecraftSearchTerm"
					:items="minecraftCandidateItems"
					value-key="value"
					label-key="label"
					:loading="minecraftCandidatesPending"
					:disabled="isMutating"
					:placeholder="t('admin.users.minecraft.placeholders.bindUsername')"
					:search-input="{
						placeholder: t('admin.users.minecraft.placeholders.bindUsername'),
					}"
					ignore-filter
				>
					<template #item-leading="{ item }">
						<UAvatar
							:src="resolveMinecraftAvatarUrl(item)"
							:alt="item.label"
							size="xs"
						/>
					</template>
					<template #item-label="{ item }">
						<div class="min-w-0">
							<p class="truncate">{{ item.label }}</p>
							<p class="truncate text-xs text-slate-500">
								{{ item.description }}
							</p>
						</div>
					</template>
				</USelectMenu>
				<UButton
					type="button"
					color="primary"
					icon="i-lucide-link"
					:loading="binding"
					:disabled="!minecraftLookupValue || isMutating"
					@click="submitBind"
				>
					{{ t('admin.users.minecraft.actions.bind') }}
				</UButton>
			</div>

			<div v-if="accounts.length" class="grid gap-3">
				<div
					v-for="account in accounts"
					:key="account.id"
					class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
				>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<strong class="text-sm text-slate-950 dark:text-slate-100">
									{{ account.username }}
								</strong>
								<UBadge
									v-if="account.isPrimary"
									color="primary"
									variant="subtle"
								>
									{{ t('admin.users.minecraft.states.primary') }}
								</UBadge>
								<UBadge color="neutral" variant="soft">
									{{ account.status }}
								</UBadge>
							</div>
							<p class="mt-1 break-all text-xs text-slate-500">
								{{ account.id }}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<UButton
								v-if="!account.isPrimary"
								type="button"
								color="primary"
								variant="soft"
								icon="i-lucide-star"
								:loading="primaryAccountId === account.id"
								:disabled="isMutating"
								@click="$emit('set-primary', account.id)"
							>
								{{ t('admin.users.minecraft.actions.setPrimary') }}
							</UButton>
							<UButton
								type="button"
								color="error"
								variant="soft"
								icon="i-lucide-unlink"
								:loading="unbindingAccountId === account.id"
								:disabled="isMutating"
								@click="$emit('unbind', account.id)"
							>
								{{ t('admin.users.minecraft.actions.unbind') }}
							</UButton>
						</div>
					</div>

					<div class="grid gap-3 md:grid-cols-2">
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.uuid') }}
							</span>
							<p class="break-all text-sm text-slate-700 dark:text-slate-200">
								{{ describeUuid(account) }}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.source') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{ account.source }}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.authmeName') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{
									account.authmeName || t('admin.users.minecraft.empty.none')
								}}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.verifiedAt') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{ formatDateTime(account.verifiedAt) }}
							</p>
						</div>
					</div>
				</div>
			</div>

			<UAlert
				v-else
				color="neutral"
				variant="soft"
				icon="i-lucide-gamepad-2"
				:title="t('admin.users.minecraft.empty.title')"
				:description="t('admin.users.minecraft.empty.description')"
			/>
		</div>
	</section>

	<section class="grid gap-4 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.historicalMinecraftAccounts') }}
			</div>
		</div>

		<div class="grid gap-4">
			<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
				<USelectMenu
					v-model="historicalAccountId"
					v-model:search-term="historicalSearchTerm"
					:items="historicalCandidateItems"
					value-key="value"
					label-key="label"
					:loading="historicalCandidatesPending"
					:disabled="isMutating"
					:placeholder="
						t('admin.users.historicalMinecraft.placeholders.bindAccount')
					"
					:search-input="{
						placeholder: t(
							'admin.users.historicalMinecraft.placeholders.bindAccount',
						),
					}"
					ignore-filter
				>
					<template #item-leading="{ item }">
						<UAvatar
							v-if="item.avatarUrl"
							:src="item.avatarUrl"
							:alt="item.label"
							size="xs"
						/>
						<div
							v-else
							class="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
						>
							<UIcon name="i-lucide-user" class="size-3.5" />
						</div>
					</template>
					<template #item-label="{ item }">
						<div class="min-w-0">
							<p class="truncate">{{ item.label }}</p>
							<p class="truncate text-xs text-slate-500">
								{{ item.description }}
							</p>
						</div>
					</template>
				</USelectMenu>
				<UButton
					type="button"
					color="primary"
					icon="i-lucide-link"
					:loading="historicalBinding"
					:disabled="!historicalAccountId || isMutating"
					@click="submitHistoricalBind"
				>
					{{ t('admin.users.minecraft.actions.bind') }}
				</UButton>
			</div>

			<div v-if="historicalAccounts.length" class="grid gap-3">
				<div
					v-for="account in historicalAccounts"
					:key="account.id"
					class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
				>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<strong class="text-sm text-slate-950 dark:text-slate-100">
									{{ account.playerIdentity.playerId || account.username }}
								</strong>
								<UBadge color="neutral" variant="soft">
									{{ account.status }}
								</UBadge>
							</div>
							<p class="mt-1 break-all text-xs text-slate-500">
								{{ account.id }}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<UButton
								type="button"
								color="error"
								variant="soft"
								icon="i-lucide-unlink"
								:loading="historicalUnbindingAccountId === account.id"
								:disabled="isMutating"
								@click="$emit('unbind-historical', account.id)"
							>
								{{ t('admin.users.minecraft.actions.unbind') }}
							</UButton>
						</div>
					</div>

					<div class="grid gap-3 md:grid-cols-2">
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.uuid') }}
							</span>
							<p class="break-all text-sm text-slate-700 dark:text-slate-200">
								{{ describeUuid(account) }}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.source') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{ account.source }}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.authmeName') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{
									account.authmeName || t('admin.users.minecraft.empty.none')
								}}
							</p>
						</div>
						<div
							class="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300"
						>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.verifiedAt') }}
							</span>
							<p class="text-sm text-slate-700 dark:text-slate-200">
								{{ formatDateTime(account.verifiedAt) }}
							</p>
						</div>
					</div>
				</div>
			</div>

			<UAlert
				v-else
				color="neutral"
				variant="soft"
				icon="i-lucide-history"
				:title="t('admin.users.historicalMinecraft.empty.title')"
				:description="t('admin.users.historicalMinecraft.empty.description')"
			/>
		</div>
	</section>
</template>

<script setup lang="ts">
import type {
	AdminMinecraftAccountCandidate,
	AdminMinecraftAccountCandidatesResponse,
	AdminUser,
} from '~/components/admin/types'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'
import dayjs from 'dayjs'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import { resolveMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'
import { profileSectionTitleClass } from '~/utils/profile/edit'

interface HistoricalCandidateItem {
	value: string
	label: string
	description: string
	avatarUrl: string | null
}

interface HistoricalCandidatesResponse {
	items: MinecraftAccountForm[]
	page: number
	pageSize: number
	total: number
	pageCount: number
}

interface AdminUserMinecraftSectionProps {
	userId: string
	accounts: AdminUser['minecraftAccounts']
	historicalAccounts: AdminUser['historicalMinecraftAccounts']
	binding: boolean
	historicalBinding: boolean
	unbindingAccountId: string | null
	historicalUnbindingAccountId: string | null
	primaryAccountId: string | null
}

const props = defineProps<AdminUserMinecraftSectionProps>()
const emit = defineEmits<{
	bind: [lookupKey: string]
	'bind-historical': [accountId: string]
	unbind: [accountId: string]
	'unbind-historical': [accountId: string]
	'set-primary': [accountId: string]
}>()

const { locale, t } = useI18n()
const minecraftLookupValue = ref<string | undefined>(undefined)
const historicalAccountId = ref<string | undefined>(undefined)
const minecraftSearchTerm = ref('')
const historicalSearchTerm = ref('')
const isMutating = computed(
	() =>
		props.binding ||
		props.historicalBinding ||
		props.unbindingAccountId !== null ||
		props.historicalUnbindingAccountId !== null ||
		props.primaryAccountId !== null,
)

const minecraftCandidateQuery = computed(() => ({
	search: minecraftSearchTerm.value || undefined,
}))
const historicalCandidateQuery = computed(() => ({
	search: historicalSearchTerm.value || undefined,
	assigned: 'unassigned',
	page: 1,
	pageSize: 8,
	sortField: 'username',
	sortDirection: 'asc',
}))

const {
	data: minecraftCandidatesData,
	pending: minecraftCandidatesPending,
	refresh: refreshMinecraftCandidates,
} = await useFetch<AdminMinecraftAccountCandidatesResponse>(
	() => `/api/admin/users/${props.userId}/minecraft-accounts/candidates`,
	{
		query: minecraftCandidateQuery,
		default: () => ({
			items: [],
		}),
		immediate: false,
		server: false,
	},
)
const {
	data: historicalCandidatesData,
	pending: historicalCandidatesPending,
	refresh: refreshHistoricalCandidates,
} = await useFetch<HistoricalCandidatesResponse>(
	'/api/admin/historical-players',
	{
		query: historicalCandidateQuery,
		default: () => ({
			items: [],
			page: 1,
			pageSize: 8,
			total: 0,
			pageCount: 1,
		}),
		immediate: false,
		server: false,
	},
)

const minecraftCandidateItems = computed<AdminMinecraftAccountCandidate[]>(
	() => minecraftCandidatesData.value?.items ?? [],
)
const historicalCandidateItems = computed<HistoricalCandidateItem[]>(() =>
	(historicalCandidatesData.value?.items ?? []).map((account) => ({
		value: account.id,
		label: account.playerIdentity.playerId || account.username,
		description:
			account.serverViews
				.filter((view) => view.serverId)
				.map((view) =>
					view.serverNames
						? resolveMinecraftServerLocalizedName(
								view.serverNames,
								locale.value,
							)
						: view.label,
				)
				.join(' · ') || t('admin.users.historicalMinecraft.empty.noServerData'),
		avatarUrl: account.username
			? getMinecraftHeadRendererUrl(account.uuid ?? account.username)
			: null,
	})),
)

const submitBind = (): void => {
	if (!minecraftLookupValue.value) {
		return
	}

	emit('bind', minecraftLookupValue.value)
}

const submitHistoricalBind = (): void => {
	if (!historicalAccountId.value) {
		return
	}

	emit('bind-historical', historicalAccountId.value)
}

const formatDateTime = (value: string | null): string =>
	value
		? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
		: t('admin.users.minecraft.empty.none')

const describeUuid = (
	account: AdminUser['minecraftAccounts'][number],
): string => {
	if (account.uuid) {
		return account.uuid
	}

	if (account.playerIdentity.hasUuidConflict) {
		return t('admin.users.minecraft.empty.uuidConflict', {
			count: account.playerIdentity.observedUuidCount,
		})
	}

	return (
		account.playerIdentity.resolvedUuid ||
		t('admin.users.minecraft.empty.noUuid')
	)
}

const resolveMinecraftAvatarUrl = (
	item: Pick<AdminMinecraftAccountCandidate, 'uuid' | 'username'>,
): string => getMinecraftHeadRendererUrl(item.uuid ?? item.username)

onMounted(() => {
	void refreshMinecraftCandidates()
	void refreshHistoricalCandidates()
})

watch(minecraftSearchTerm, () => {
	void refreshMinecraftCandidates()
})

watch(historicalSearchTerm, () => {
	void refreshHistoricalCandidates()
})

watch(
	() => props.userId,
	() => {
		void refreshMinecraftCandidates()
		void refreshHistoricalCandidates()
	},
)

watch(
	() => props.binding,
	(binding) => {
		if (binding) {
			return
		}

		minecraftLookupValue.value = undefined
		minecraftSearchTerm.value = ''
	},
)

watch(
	() => props.historicalBinding,
	(binding) => {
		if (binding) {
			return
		}

		historicalAccountId.value = undefined
		historicalSearchTerm.value = ''
	},
)
</script>
