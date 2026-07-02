<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.minecraftAccounts') }}
			</div>
		</div>
		<div :class="profileCardClass" class="grid gap-4">
			<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
				<UFormField
					:label="t('admin.users.minecraft.fields.bindIdentity')"
					name="minecraft-bind-username"
				>
					<UInput
						v-model="username"
						:placeholder="t('admin.users.minecraft.placeholders.bindUsername')"
						autocomplete="off"
						:disabled="binding || unbindingAccountId !== null"
					/>
				</UFormField>
				<UButton
					type="button"
					color="primary"
					icon="i-lucide-link"
					:loading="binding"
					:disabled="!username.trim() || unbindingAccountId !== null"
					@click="submitBind"
				>
					{{ t('admin.users.minecraft.actions.bind') }}
				</UButton>
			</div>

			<div v-if="accounts.length" class="grid gap-3">
				<div
					v-for="account in accounts"
					:key="account.id"
					class="grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
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
							<p class="mt-1 break-all font-mono text-xs text-slate-500">
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
								:disabled="binding || unbindingAccountId !== null"
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
								:disabled="binding || primaryAccountId !== null"
								@click="$emit('unbind', account.id)"
							>
								{{ t('admin.users.minecraft.actions.unbind') }}
							</UButton>
						</div>
					</div>

					<div
						class="grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2"
					>
						<div>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.uuid') }}
							</span>
							<p class="mt-1 break-all font-mono text-xs">
								{{ describeUuid(account) }}
							</p>
						</div>
						<div>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.source') }}
							</span>
							<p class="mt-1">{{ account.source }}</p>
						</div>
						<div>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.authmeName') }}
							</span>
							<p class="mt-1">
								{{
									account.authmeName || t('admin.users.minecraft.empty.none')
								}}
							</p>
						</div>
						<div>
							<span class="text-slate-500 dark:text-slate-400">
								{{ t('admin.users.minecraft.fields.verifiedAt') }}
							</span>
							<p class="mt-1">
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
</template>

<script setup lang="ts">
import type { AdminUser } from '~/components/admin/types'
import dayjs from 'dayjs'
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'

interface AdminUserMinecraftSectionProps {
	accounts: AdminUser['minecraftAccounts']
	binding: boolean
	unbindingAccountId: string | null
	primaryAccountId: string | null
}

const props = defineProps<AdminUserMinecraftSectionProps>()
const emit = defineEmits<{
	bind: [username: string]
	unbind: [accountId: string]
	'set-primary': [accountId: string]
}>()

const { t } = useI18n()
const username = ref('')

const submitBind = (): void => {
	const value = username.value.trim()

	if (!value) {
		return
	}

	emit('bind', value)
	username.value = ''
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

watch(
	() => props.binding,
	(binding) => {
		if (binding) {
			return
		}

		username.value = ''
	},
)
</script>
