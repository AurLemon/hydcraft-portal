<template>
	<form class="grid gap-8" @submit.prevent="submit">
		<div :class="sectionsContainerClass">
			<section
				v-if="visibleSections.core"
				class="grid w-full gap-3 break-inside-avoid"
			>
				<div v-if="showSectionHeading" :class="profileSectionTitleClass">
					{{ t('admin.serverConfig.sections.basic') }}
				</div>
				<div :class="cardClass" class="grid gap-4 md:grid-cols-2">
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.serverId') }}</span>
						<UInput v-model="form.serverId" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.code') }}</span>
						<UInput v-model="form.code" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.shortCode') }}</span>
						<UInput v-model="form.shortCode" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.nameZhCn') }}</span>
						<UInput v-model="form.nameZhCn" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.nameZhTw') }}</span>
						<UInput v-model="form.nameZhTw" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.nameEnUs') }}</span>
						<UInput v-model="form.nameEnUs" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.nameJaJp') }}</span>
						<UInput v-model="form.nameJaJp" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.sortOrder') }}</span>
						<UInput
							v-model.number="form.sortOrder"
							class="w-full"
							type="number"
							min="0"
							required
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.status') }}</span>
						<USelect
							v-model="form.status"
							:items="serverStatusItems"
							value-key="value"
							label-key="label"
							class="w-full"
						/>
					</label>
					<label v-if="showAddressFields" :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.mcHost') }}</span>
						<UInput v-model="form.host" class="w-full" />
					</label>
					<label v-if="showAddressFields" :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.mcPort') }}</span>
						<UInput
							v-model.number="form.port"
							class="w-full"
							type="number"
							min="1"
							max="65535"
						/>
					</label>
				</div>
			</section>

			<section
				v-if="visibleSections.map"
				class="grid w-full gap-3 break-inside-avoid"
			>
				<div v-if="showSectionHeading" :class="profileSectionTitleClass">
					{{ t('admin.serverConfig.sections.mapConfig') }}
				</div>
				<div :class="cardClass" class="grid gap-4 md:grid-cols-2">
					<label :class="[fieldClass, 'md:col-span-2']">
						<div class="flex items-center justify-between gap-3">
							<span>{{ t('admin.serverConfig.fields.mapEnabled') }}</span>
							<USwitch v-model="form.mapConfig.enabled" />
						</div>
					</label>
					<label :class="[fieldClass, 'md:col-span-2']">
						<div class="flex items-center justify-between gap-3">
							<span>{{ t('admin.serverConfig.fields.hasTiles') }}</span>
							<USwitch v-model="form.mapConfig.hasTiles" />
						</div>
					</label>
					<label :class="[fieldClass, 'md:col-span-2']">
						<span>{{ t('admin.serverConfig.fields.tileBaseUrl') }}</span>
						<UInput v-model="form.mapConfig.tileBaseUrl" class="w-full" />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.worldName') }}</span>
						<UInput v-model="form.mapConfig.worldName" class="w-full" />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.mapName') }}</span>
						<UInput v-model="form.mapConfig.mapName" class="w-full" />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.tileExtension') }}</span>
						<USelect
							v-model="form.mapConfig.tileExtension"
							:items="tileExtensionItems"
							value-key="value"
							label-key="label"
							class="w-full"
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.defaultZoom') }}</span>
						<UInput
							v-model.number="form.mapConfig.defaultZoom"
							class="w-full"
							type="number"
							min="0"
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.defaultCenterX') }}</span>
						<UInput
							v-model.number="form.mapConfig.defaultCenterX"
							class="w-full"
							type="number"
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.defaultCenterZ') }}</span>
						<UInput
							v-model.number="form.mapConfig.defaultCenterZ"
							class="w-full"
							type="number"
						/>
					</label>
				</div>
			</section>

			<section
				v-if="visibleSections.periods"
				class="grid w-full gap-3 break-inside-avoid"
			>
				<div
					class="mx-1 flex items-center justify-between gap-3"
					:class="showSectionHeading ? '' : 'min-h-0'"
				>
					<div v-if="showSectionHeading" :class="profileSectionTitleClass">
						{{ t('admin.serverConfig.sections.periods') }}
					</div>
					<UButton
						type="button"
						size="xs"
						color="neutral"
						variant="soft"
						icon="i-lucide-plus"
						@click="addPeriod"
					>
						{{ t('admin.serverConfig.actions.addPeriod') }}
					</UButton>
				</div>
				<div :class="cardClass" class="grid gap-4">
					<div
						v-if="form.periods.length === 0"
						class="mx-1 text-sm text-slate-500 dark:text-slate-400"
					>
						{{ t('admin.serverConfig.empty.periods') }}
					</div>
					<div
						v-for="(period, index) in form.periods"
						:key="period.localId"
						class="grid gap-4 md:grid-cols-2"
					>
						<div class="md:col-span-2 flex items-center justify-between gap-3">
							<p class="text-sm font-medium text-slate-900 dark:text-white">
								{{ t('admin.serverConfig.periodLabel', { index: index + 1 }) }}
							</p>
							<UButton
								type="button"
								size="xs"
								color="error"
								variant="ghost"
								icon="i-lucide-trash-2"
								@click="removePeriod(index)"
							>
								{{ t('admin.actions.delete') }}
							</UButton>
						</div>
						<label :class="fieldClass">
							<span>{{ t('admin.serverConfig.fields.periodKind') }}</span>
							<USelect
								v-model="period.kind"
								:items="periodKindItems"
								value-key="value"
								label-key="label"
								class="w-full"
							/>
						</label>
						<label :class="fieldClass">
							<span>{{ t('admin.serverConfig.fields.periodSortOrder') }}</span>
							<UInput
								v-model.number="period.sortOrder"
								class="w-full"
								type="number"
							/>
						</label>
						<label :class="fieldClass">
							<span>{{ t('admin.serverConfig.fields.startedAt') }}</span>
							<UInput
								v-model="period.startedAt"
								class="w-full"
								type="datetime-local"
							/>
						</label>
						<label :class="fieldClass">
							<span>{{ t('admin.serverConfig.fields.endedAt') }}</span>
							<UInput
								v-model="period.endedAt"
								class="w-full"
								type="datetime-local"
							/>
						</label>
						<label :class="[fieldClass, 'md:col-span-2']">
							<span>{{ t('admin.serverConfig.fields.periodNote') }}</span>
							<UTextarea v-model="period.note" :rows="2" class="w-full" />
						</label>
					</div>
				</div>
			</section>

			<section
				v-if="visibleSections.portalBridge && form.status === 'ONLINE'"
				class="grid w-full gap-3 break-inside-avoid"
			>
				<div v-if="showSectionHeading" :class="profileSectionTitleClass">
					{{ t('admin.serverConfig.sections.portalBridge') }}
				</div>
				<div :class="cardClass" class="grid gap-4">
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.bridgeId') }}</span>
						<UInput
							v-model="form.portalBridge.bridgeId"
							class="w-full"
							required
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.module') }}</span>
						<UInput
							v-model="form.portalBridge.module"
							class="w-full"
							required
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.wsUrl') }}</span>
						<UInput v-model="form.portalBridge.wsUrl" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.secret') }}</span>
						<UInput
							v-model="form.portalBridge.secret"
							class="w-full"
							type="password"
							:placeholder="
								server?.portalBridge?.hasSecret
									? t('admin.serverConfig.placeholders.keepSecret')
									: ''
							"
						/>
					</label>
				</div>
			</section>

			<section
				v-if="visibleSections.sync"
				class="grid w-full gap-3 break-inside-avoid"
			>
				<div v-if="showSectionHeading" :class="profileSectionTitleClass">
					{{ t('admin.serverConfig.sections.sync') }}
				</div>
				<div :class="cardClass" class="grid gap-4 md:grid-cols-2">
					<label :class="fieldClass">
						<span
							>{{ t('admin.serverConfig.sections.portalBridge') }}
							{{ t('admin.serverConfig.fields.syncInterval') }}</span
						>
						<UInput
							v-model.number="form.portalBridge.coreSyncIntervalMinutes"
							class="w-full"
							type="number"
							min="1"
							step="1"
						/>
					</label>
				</div>
			</section>
		</div>

		<div class="flex justify-end gap-3">
			<UButton
				v-if="showCancel"
				type="button"
				color="neutral"
				variant="ghost"
				@click="$emit('cancel')"
			>
				{{ t('admin.serverConfig.actions.cancel') }}
			</UButton>
			<UButton type="submit" icon="i-lucide-save" :loading="saving">
				{{ t('admin.serverConfig.actions.save') }}
			</UButton>
		</div>
	</form>
</template>

<script setup lang="ts">
import type { MinecraftServerResponse, MinecraftServerSummary } from './types'
import { adminFieldClass } from '~/utils/admin/users/edit'
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'

interface PortalBridgeForm {
	bridgeId: string
	module: string
	wsUrl: string
	secret: string
	coreSyncIntervalMinutes: number
}

interface ServerMapConfigForm {
	enabled: boolean
	hasTiles: boolean
	tileBaseUrl: string
	worldName: string
	mapName: string
	tileExtension: 'jpg' | 'png'
	defaultCenterX: number
	defaultCenterZ: number
	defaultZoom: number
}

interface ServerPeriodForm {
	id?: string
	localId: string
	kind: string
	startedAt: string
	endedAt: string
	note: string
	sortOrder: number
}

interface ServerForm {
	serverId: string
	code: string
	shortCode: string
	nameZhCn: string
	nameZhTw: string
	nameEnUs: string
	nameJaJp: string
	host: string
	port: number
	status: string
	isDefault: boolean
	sortOrder: number
	mapConfig: ServerMapConfigForm
	periods: ServerPeriodForm[]
	portalBridge: PortalBridgeForm
}

interface AdminServerConfigFormProps {
	server: MinecraftServerSummary | null
	mode?:
		| 'all'
		| 'create'
		| 'basic'
		| 'map'
		| 'periods'
		| 'portalBridge'
		| 'sync'
	showCancel?: boolean
	surface?: 'card' | 'plain'
}

const props = withDefaults(defineProps<AdminServerConfigFormProps>(), {
	mode: 'all',
	showCancel: true,
	surface: 'card',
})
const emit = defineEmits<{
	cancel: []
	saved: [server: MinecraftServerSummary]
}>()

const { t } = useI18n()
const { notifyError } = useAdminToast()
const saving = ref(false)
const originalServerId = ref('')
let periodCounter = 0
const submitMode = computed(() => (props.server ? 'edit' : 'create'))
const formMode = computed(() => props.mode)
const visibleSections = computed(() => ({
	core:
		formMode.value === 'all' ||
		formMode.value === 'create' ||
		formMode.value === 'basic',
	map: formMode.value === 'all' || formMode.value === 'map',
	periods: formMode.value === 'all' || formMode.value === 'periods',
	portalBridge: formMode.value === 'all' || formMode.value === 'portalBridge',
	sync: formMode.value === 'sync',
}))
const fieldClass = adminFieldClass
const showSectionHeading = computed(() => props.surface !== 'plain')
const cardClass = computed(() =>
	props.surface === 'plain' ? 'grid w-full gap-4' : profileCardClass,
)
const sectionsContainerClass = computed(() =>
	formMode.value === 'all'
		? 'w-full gap-6 lg:columns-2 [&>section]:mb-6'
		: 'grid w-full gap-6',
)

const serverStatusItems = computed(() => [
	{
		label: t('admin.serverConfig.values.serverStatus.online'),
		value: 'ONLINE',
	},
	{
		label: t('admin.serverConfig.values.serverStatus.archived'),
		value: 'ARCHIVED',
	},
])
const tileExtensionItems = computed(() => [
	{ label: 'JPG', value: 'jpg' },
	{ label: 'PNG', value: 'png' },
])
const periodKindItems = computed(() => [
	{ label: t('admin.serverConfig.values.periodKind.live'), value: 'LIVE' },
	{
		label: t('admin.serverConfig.values.periodKind.archive'),
		value: 'ARCHIVE',
	},
	{ label: t('admin.serverConfig.values.periodKind.event'), value: 'EVENT' },
	{
		label: t('admin.serverConfig.values.periodKind.maintenance'),
		value: 'MAINTENANCE',
	},
	{ label: t('admin.serverConfig.values.periodKind.other'), value: 'OTHER' },
])

const toDatetimeLocal = (value: string | null | undefined): string => {
	if (!value) {
		return ''
	}

	const date = new Date(value)
	return Number.isNaN(date.getTime())
		? ''
		: new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
				.toISOString()
				.slice(0, 16)
}

const fromDatetimeLocal = (value: string): string | null =>
	value ? new Date(value).toISOString() : null

const createPeriodForm = (index = 0): ServerPeriodForm => ({
	localId: `period-${periodCounter++}`,
	kind: 'LIVE',
	startedAt: '',
	endedAt: '',
	note: '',
	sortOrder: index,
})

const createEmptyForm = (): ServerForm => ({
	serverId: '',
	code: '',
	shortCode: '',
	nameZhCn: '',
	nameZhTw: '',
	nameEnUs: '',
	nameJaJp: '',
	host: '',
	port: 25565,
	status: 'ONLINE',
	isDefault: false,
	sortOrder: 0,
	mapConfig: {
		enabled: false,
		hasTiles: false,
		tileBaseUrl: '',
		worldName: 'world',
		mapName: 'flat',
		tileExtension: 'jpg',
		defaultCenterX: 811,
		defaultCenterZ: 2933,
		defaultZoom: 0,
	},
	periods: [],
	portalBridge: {
		bridgeId: '',
		module: '',
		wsUrl: '',
		secret: '',
		coreSyncIntervalMinutes: 30,
	},
})

const form = reactive<ServerForm>(createEmptyForm())
const showAddressFields = computed(
	() => visibleSections.value.core && form.status === 'ONLINE',
)

const resetForm = (): void => {
	const source = props.server
	const next = source
		? {
				serverId: source.serverId,
				code: source.code,
				shortCode: source.shortCode,
				nameZhCn: source.nameZhCn,
				nameZhTw: source.nameZhTw ?? source.nameZhCn,
				nameEnUs: source.nameEnUs ?? source.nameZhCn,
				nameJaJp: source.nameJaJp ?? source.nameZhCn,
				host: source.host,
				port: source.port,
				status: source.status,
				isDefault: source.isDefault,
				sortOrder: source.sortOrder,
				mapConfig: {
					enabled: source.mapConfig?.enabled ?? false,
					hasTiles: source.mapConfig?.hasTiles ?? false,
					tileBaseUrl: source.mapConfig?.tileBaseUrl ?? '',
					worldName: source.mapConfig?.worldName ?? 'world',
					mapName: source.mapConfig?.mapName ?? 'flat',
					tileExtension:
						source.mapConfig?.tileExtension === 'png' ? 'png' : 'jpg',
					defaultCenterX: source.mapConfig?.defaultCenterX ?? 811,
					defaultCenterZ: source.mapConfig?.defaultCenterZ ?? 2933,
					defaultZoom: source.mapConfig?.defaultZoom ?? 0,
				},
				periods: source.periods.map((period, index) => ({
					id: period.id,
					localId: `period-${periodCounter++}`,
					kind: period.kind,
					startedAt: toDatetimeLocal(period.startedAt),
					endedAt: toDatetimeLocal(period.endedAt),
					note: period.note ?? '',
					sortOrder: period.sortOrder ?? index,
				})),
				portalBridge: {
					bridgeId: source.portalBridge?.bridgeId ?? '',
					module: source.portalBridge?.module ?? 'portalbridge-core',
					wsUrl: source.portalBridge?.wsUrl ?? '',
					secret: '',
					coreSyncIntervalMinutes:
						source.portalBridge?.coreSyncIntervalMinutes ?? 30,
				},
			}
		: createEmptyForm()

	Object.assign(form, next)
	originalServerId.value = source?.serverId ?? ''
}

watch(() => props.server, resetForm, { immediate: true })

const buildPayload = () => ({
	...(visibleSections.value.core
		? {
				serverId: form.serverId,
				code: form.code,
				shortCode: form.shortCode,
				nameZhCn: form.nameZhCn,
				nameZhTw: form.nameZhTw,
				nameEnUs: form.nameEnUs,
				nameJaJp: form.nameJaJp,
				...(showAddressFields.value
					? {
							host: form.host,
							port: form.port,
						}
					: {}),
				status: form.status,
				isDefault: form.isDefault,
				sortOrder: form.sortOrder,
			}
		: {}),
	...(visibleSections.value.map
		? {
				mapConfig: {
					enabled: form.mapConfig.enabled,
					hasTiles: form.mapConfig.hasTiles,
					tileBaseUrl: form.mapConfig.tileBaseUrl || null,
					worldName: form.mapConfig.worldName,
					mapName: form.mapConfig.mapName,
					tileExtension: form.mapConfig.tileExtension,
					defaultCenterX: form.mapConfig.defaultCenterX,
					defaultCenterZ: form.mapConfig.defaultCenterZ,
					defaultZoom: form.mapConfig.defaultZoom,
				},
			}
		: {}),
	...(visibleSections.value.periods
		? {
				periods: form.periods
					.map((period) => ({
						id: period.id,
						kind: period.kind,
						startedAt: fromDatetimeLocal(period.startedAt),
						endedAt: fromDatetimeLocal(period.endedAt),
						note: period.note || null,
						sortOrder: period.sortOrder,
					}))
					.filter((period) => Boolean(period.startedAt)),
			}
		: {}),
	...(visibleSections.value.portalBridge && form.status === 'ONLINE'
		? {
				portalBridge: {
					bridgeId: form.portalBridge.bridgeId,
					module: form.portalBridge.module,
					wsUrl: form.portalBridge.wsUrl,
					secret: form.portalBridge.secret || undefined,
					coreSyncIntervalMinutes: form.portalBridge.coreSyncIntervalMinutes,
				},
			}
		: visibleSections.value.sync
			? {
					portalBridge: {
						coreSyncIntervalMinutes: form.portalBridge.coreSyncIntervalMinutes,
					},
				}
			: {}),
})

const addPeriod = (): void => {
	form.periods.push(createPeriodForm(form.periods.length))
}

const removePeriod = (index: number): void => {
	form.periods.splice(index, 1)
}

const submit = async (): Promise<void> => {
	saving.value = true

	try {
		const response =
			submitMode.value === 'create'
				? await $fetch<MinecraftServerResponse>('/api/minecraft/servers', {
						method: 'POST',
						body: buildPayload(),
					})
				: await $fetch<MinecraftServerResponse>(
						`/api/minecraft/servers/${originalServerId.value}`,
						{
							method: 'PATCH',
							body: buildPayload(),
						},
					)

		emit('saved', response.server)
	} catch (error) {
		notifyError(error, {
			title: t('admin.notifications.serverSaveFailed'),
			description: t('admin.notifications.serverSaveFailedDescription'),
		})
	} finally {
		saving.value = false
	}
}
</script>
