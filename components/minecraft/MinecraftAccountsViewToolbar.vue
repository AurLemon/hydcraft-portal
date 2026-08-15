<template>
	<div
		class="relative z-40 flex w-fit max-w-[calc(100vw-1.5rem)] flex-nowrap items-center gap-1.5 rounded-xl border p-1.5 transition-colors sm:gap-2"
		:class="
			viewMode === 'immersive'
				? 'border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur-xl'
				: 'border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white'
		"
	>
		<div
			class="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-lg p-0.5"
			role="group"
			:aria-label="t('minecraftAccounts.toolbar.tabsLabel')"
		>
			<button
				v-for="tab in tabs"
				:key="tab.key"
				type="button"
				class="shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors"
				:class="resolveOptionClass(activeTab === tab.key)"
				:aria-pressed="activeTab === tab.key"
				@click="emit('update:activeTab', tab.key)"
			>
				{{ tab.label }}
			</button>
		</div>

		<div class="flex shrink-0 items-center gap-1 sm:gap-2">
			<MinecraftAccountsActions
				:accounts="accounts"
				:selected-account="selectedAccount"
				:saving-id="savingId"
				:unbinding-id="unbindingId"
				:unbind-success-token="unbindSuccessToken"
				:immersive="viewMode === 'immersive'"
				@bind="emit('bind')"
				@save="emit('save', $event)"
				@unbind="emit('unbind', $event)"
			/>

			<div
				class="flex shrink-0 items-center border-l pl-1 sm:pl-2"
				:class="
					viewMode === 'immersive'
						? 'border-white/15'
						: 'border-slate-200 dark:border-slate-800'
				"
				role="group"
				:aria-label="t('minecraftAccounts.toolbar.viewModeLabel')"
			>
				<UTooltip :text="viewModeToggle.tooltip">
					<button
						type="button"
						class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-sm transition-colors"
						:class="resolveOptionClass(false)"
						:aria-label="viewModeToggle.tooltip"
						@click="emit('update:viewMode', viewModeToggle.value)"
					>
						<UIcon
							:name="viewModeToggle.icon"
							class="size-4"
							aria-hidden="true"
						/>
					</button>
				</UTooltip>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

type MinecraftAccountsTab = 'official' | 'historical' | 'all'
type MinecraftAccountsViewMode = 'immersive' | 'list'

interface MinecraftAccountsViewToolbarProps {
	tabs: Array<{
		key: MinecraftAccountsTab
		label: string
	}>
	activeTab: MinecraftAccountsTab
	viewMode: MinecraftAccountsViewMode
	accounts: MinecraftAccountForm[]
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
	unbindingId: string | null
	unbindSuccessToken: number
}

interface MinecraftAccountUnbindPayload {
	account: MinecraftAccountForm
	captchaToken: string
}

const props = defineProps<MinecraftAccountsViewToolbarProps>()

const emit = defineEmits<{
	'update:activeTab': [value: MinecraftAccountsTab]
	'update:viewMode': [value: MinecraftAccountsViewMode]
	bind: []
	save: [account: MinecraftAccountForm]
	unbind: [payload: MinecraftAccountUnbindPayload]
}>()

const { t } = useI18n()

const viewModeToggle = computed<{
	value: MinecraftAccountsViewMode
	tooltip: string
	icon: string
}>(() =>
	props.viewMode === 'immersive'
		? {
				value: 'list',
				tooltip: t('minecraftAccounts.toolbar.listViewTip'),
				icon: 'i-lucide-list',
			}
		: {
				value: 'immersive',
				tooltip: t('minecraftAccounts.toolbar.immersiveViewTip'),
				icon: 'i-lucide-map',
			},
)

const resolveOptionClass = (active: boolean): string => {
	if (props.viewMode === 'immersive') {
		return active
			? 'bg-white text-slate-950 shadow-sm'
			: 'text-white/75 hover:bg-white/10 hover:text-white'
	}

	return active
		? 'bg-primary-500 text-white shadow-sm dark:bg-white dark:text-slate-950'
		: 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
}
</script>
