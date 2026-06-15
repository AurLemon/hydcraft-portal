<template>
	<form class="grid gap-6" @submit.prevent="submit">
		<div
			class="grid grid-cols-1 gap-4"
			:class="formMode === 'all' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'"
		>
			<section v-if="visibleSections.basic" class="grid gap-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.serverId') }}</span>
						<UInput v-model="form.serverId" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.code') }}</span>
						<UInput v-model="form.code" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.name') }}</span>
						<UInput v-model="form.name" class="w-full" required />
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.sortOrder') }}</span>
						<UInput
							v-model.number="form.sortOrder"
							class="w-full"
							type="number"
						/>
					</label>
					<label :class="fieldClass">
						<span>{{ t('admin.serverConfig.fields.mcHost') }}</span>
						<UInput v-model="form.host" class="w-full" required />
					</label>
					<label :class="fieldClass">
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
				<div class="flex items-center justify-between gap-3 px-1 py-1">
					<span class="text-sm font-medium text-slate-700 dark:text-slate-200">
						{{ t('admin.serverConfig.fields.enabled') }}
					</span>
					<USwitch v-model="form.enabled" />
				</div>
			</section>

			<section v-if="visibleSections.portalBridge" class="grid gap-4">
				<label :class="fieldClass">
					<span>{{ t('admin.serverConfig.fields.bridgeId') }}</span>
					<UInput v-model="form.portalBridge.bridgeId" class="w-full" />
				</label>
				<label :class="fieldClass">
					<span>{{ t('admin.serverConfig.fields.module') }}</span>
					<UInput v-model="form.portalBridge.module" class="w-full" />
				</label>
				<label :class="fieldClass">
					<span>{{ t('admin.serverConfig.fields.wsUrl') }}</span>
					<UInput v-model="form.portalBridge.wsUrl" class="w-full" />
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
				<div class="flex items-center justify-between gap-3 px-1 py-1">
					<span class="text-sm font-medium text-slate-700 dark:text-slate-200">
						{{ t('admin.serverConfig.fields.bridgeEnabled') }}
					</span>
					<USwitch v-model="form.portalBridge.enabled" />
				</div>
			</section>

			<section v-if="visibleSections.authMe" class="grid gap-4">
				<AdminMysqlFields
					v-model:host="form.authMe.host"
					v-model:port="form.authMe.port"
					v-model:database="form.authMe.database"
					v-model:username="form.authMe.username"
					v-model:password="form.authMe.password"
					v-model:enabled="form.authMe.enabled"
					:has-password="server?.authMe?.hasPassword ?? false"
				/>
			</section>

			<section v-if="visibleSections.luckPerms" class="grid gap-4">
				<AdminMysqlFields
					v-model:host="form.luckPerms.host"
					v-model:port="form.luckPerms.port"
					v-model:database="form.luckPerms.database"
					v-model:username="form.luckPerms.username"
					v-model:password="form.luckPerms.password"
					v-model:enabled="form.luckPerms.enabled"
					:has-password="server?.luckPerms?.hasPassword ?? false"
				/>
			</section>
		</div>

		<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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

interface MysqlForm {
	host: string
	port: number
	database: string
	username: string
	password: string
	enabled: boolean
}

interface PortalBridgeForm {
	bridgeId: string
	module: string
	wsUrl: string
	secret: string
	enabled: boolean
}

interface ServerForm {
	serverId: string
	code: string
	name: string
	host: string
	port: number
	enabled: boolean
	sortOrder: number
	portalBridge: PortalBridgeForm
	authMe: MysqlForm
	luckPerms: MysqlForm
}

interface AdminServerConfigFormProps {
	server: MinecraftServerSummary | null
	mode?: 'all' | 'basic' | 'portalBridge' | 'authMe' | 'luckPerms'
	showCancel?: boolean
}

const props = withDefaults(defineProps<AdminServerConfigFormProps>(), {
	mode: 'all',
	showCancel: true,
})
const emit = defineEmits<{
	cancel: []
	saved: [server: MinecraftServerSummary]
}>()

const { t } = useI18n()
const { notifyError } = useAdminToast()
const saving = ref(false)
const originalServerId = ref('')
const submitMode = computed(() => (props.server ? 'edit' : 'create'))
const formMode = computed(() => props.mode)
const visibleSections = computed(() => ({
	basic: formMode.value === 'all' || formMode.value === 'basic',
	portalBridge: formMode.value === 'all' || formMode.value === 'portalBridge',
	authMe: formMode.value === 'all' || formMode.value === 'authMe',
	luckPerms: formMode.value === 'all' || formMode.value === 'luckPerms',
}))
const fieldClass =
	'grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200'

const createEmptyForm = (): ServerForm => ({
	serverId: '',
	code: '',
	name: '',
	host: '',
	port: 25565,
	enabled: true,
	sortOrder: 0,
	portalBridge: {
		bridgeId: 'portalbridge-main',
		module: 'portalbridge-core',
		wsUrl: 'ws://127.0.0.1:28546',
		secret: '',
		enabled: false,
	},
	authMe: {
		host: '',
		port: 3306,
		database: '',
		username: '',
		password: '',
		enabled: false,
	},
	luckPerms: {
		host: '',
		port: 3306,
		database: '',
		username: '',
		password: '',
		enabled: false,
	},
})

const form = reactive<ServerForm>(createEmptyForm())

const resetForm = (): void => {
	const source = props.server
	const next = source
		? {
				serverId: source.serverId,
				code: source.code,
				name: source.name,
				host: source.host,
				port: source.port,
				enabled: source.enabled,
				sortOrder: source.sortOrder,
				portalBridge: {
					bridgeId: source.portalBridge?.bridgeId ?? '',
					module: source.portalBridge?.module ?? 'portalbridge-core',
					wsUrl: source.portalBridge?.wsUrl ?? '',
					secret: '',
					enabled: source.portalBridge?.enabled ?? false,
				},
				authMe: {
					host: source.authMe?.host ?? '',
					port: source.authMe?.port ?? 3306,
					database: source.authMe?.database ?? '',
					username: source.authMe?.username ?? '',
					password: '',
					enabled: source.authMe?.enabled ?? false,
				},
				luckPerms: {
					host: source.luckPerms?.host ?? '',
					port: source.luckPerms?.port ?? 3306,
					database: source.luckPerms?.database ?? '',
					username: source.luckPerms?.username ?? '',
					password: '',
					enabled: source.luckPerms?.enabled ?? false,
				},
			}
		: createEmptyForm()

	Object.assign(form, next)
	originalServerId.value = source?.serverId ?? ''
}

watch(() => props.server, resetForm, { immediate: true })

const buildPayload = () => ({
	...(visibleSections.value.basic
		? {
				serverId: form.serverId,
				code: form.code,
				name: form.name,
				host: form.host,
				port: form.port,
				enabled: form.enabled,
				sortOrder: form.sortOrder,
			}
		: {}),
	...(visibleSections.value.portalBridge
		? {
				portalBridge: {
					bridgeId: form.portalBridge.bridgeId,
					module: form.portalBridge.module,
					wsUrl: form.portalBridge.wsUrl,
					secret: form.portalBridge.secret || undefined,
					enabled: form.portalBridge.enabled,
				},
			}
		: {}),
	...(visibleSections.value.authMe
		? {
				authMe: {
					host: form.authMe.host,
					port: form.authMe.port,
					database: form.authMe.database,
					username: form.authMe.username,
					password: form.authMe.password || undefined,
					enabled: form.authMe.enabled,
				},
			}
		: {}),
	...(visibleSections.value.luckPerms
		? {
				luckPerms: {
					host: form.luckPerms.host,
					port: form.luckPerms.port,
					database: form.luckPerms.database,
					username: form.luckPerms.username,
					password: form.luckPerms.password || undefined,
					enabled: form.luckPerms.enabled,
				},
			}
		: {}),
})

const submit = async (): Promise<void> => {
	saving.value = true

	try {
		const response =
			submitMode.value === 'create'
				? await $fetch<MinecraftServerResponse>('/api/minecraft/servers', {
						method: 'POST',
						body: {
							serverId: form.serverId,
							...buildPayload(),
						},
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
