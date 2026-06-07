<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-4xl', body: 'p-0' }"
		@update:open="$emit('update:open', $event)"
	>
		<template #content>
			<form
				class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6"
				@submit.prevent="submit"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2
							class="mt-1 text-2xl font-semibold text-slate-950 dark:text-white"
						>
							{{ t('admin.serverConfig.title') }}
						</h2>
					</div>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						aria-label="关闭"
						@click="$emit('update:open', false)"
					/>
				</div>

				<div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<section class="admin-section">
						<div class="admin-section-title">
							<UIcon name="i-lucide-server" />
							<span>{{ t('admin.serverConfig.sections.basic') }}</span>
						</div>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.serverId') }}</span>
								<input
									v-model="form.serverId"
									:disabled="mode === 'edit'"
									required
								/>
							</label>
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.code') }}</span>
								<input v-model="form.code" required />
							</label>
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.name') }}</span>
								<input v-model="form.name" required />
							</label>
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.sortOrder') }}</span>
								<input v-model.number="form.sortOrder" type="number" />
							</label>
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.mcHost') }}</span>
								<input v-model="form.host" required />
							</label>
							<label class="admin-field">
								<span>{{ t('admin.serverConfig.fields.mcPort') }}</span>
								<input
									v-model.number="form.port"
									type="number"
									min="1"
									max="65535"
								/>
							</label>
							<label class="admin-field md:col-span-2">
								<span>{{ t('admin.serverConfig.fields.description') }}</span>
								<textarea v-model="form.description" rows="3" />
							</label>
						</div>
						<label class="admin-check">
							<input v-model="form.enabled" type="checkbox" />
							<span>{{ t('admin.serverConfig.fields.enabled') }}</span>
						</label>
					</section>

					<section class="admin-section">
						<div class="admin-section-title">
							<UIcon name="i-lucide-radio-tower" />
							<span>PortalBridge</span>
						</div>
						<label class="admin-field">
							<span>{{ t('admin.serverConfig.fields.bridgeId') }}</span>
							<input v-model="form.portalBridge.bridgeId" />
						</label>
						<label class="admin-field">
							<span>Module</span>
							<input v-model="form.portalBridge.module" />
						</label>
						<label class="admin-field">
							<span>WebSocket URL</span>
							<input v-model="form.portalBridge.wsUrl" />
						</label>
						<label class="admin-field">
							<span>{{ t('admin.serverConfig.fields.secret') }}</span>
							<input
								v-model="form.portalBridge.secret"
								type="password"
								:placeholder="
									server?.portalBridge?.hasSecret
										? t('admin.serverConfig.placeholders.keepSecret')
										: ''
								"
							/>
						</label>
						<label class="admin-check">
							<input v-model="form.portalBridge.enabled" type="checkbox" />
							<span>{{ t('admin.serverConfig.fields.bridgeEnabled') }}</span>
						</label>
					</section>

					<section class="admin-section">
						<div class="admin-section-title">
							<UIcon name="i-lucide-database" />
							<span>AuthMe MySQL</span>
						</div>
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

					<section class="admin-section">
						<div class="admin-section-title">
							<UIcon name="i-lucide-shield-check" />
							<span>LuckPerms MySQL</span>
						</div>
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

				<div
					class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
				>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						@click="$emit('update:open', false)"
					>
						{{ t('admin.serverConfig.actions.cancel') }}
					</UButton>
					<UButton type="submit" icon="i-lucide-save" :loading="saving">
						{{ t('admin.serverConfig.actions.save') }}
					</UButton>
				</div>
			</form>
		</template>
	</UModal>
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
	description: string
	host: string
	port: number
	enabled: boolean
	sortOrder: number
	portalBridge: PortalBridgeForm
	authMe: MysqlForm
	luckPerms: MysqlForm
}

interface AdminServerConfigModalProps {
	open: boolean
	server: MinecraftServerSummary | null
}

const props = defineProps<AdminServerConfigModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [server: MinecraftServerSummary]
}>()

const { notifyError } = useAdminToast()
const saving = ref(false)
const mode = computed(() => (props.server ? 'edit' : 'create'))

const createEmptyForm = (): ServerForm => ({
	serverId: '',
	code: '',
	name: '',
	description: '',
	host: '',
	port: 25565,
	enabled: true,
	sortOrder: 0,
	portalBridge: {
		bridgeId: '',
		module: 'portalbridge-core',
		wsUrl: '',
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
				description: source.description ?? '',
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
}

watch(
	() => props.open,
	(value) => {
		if (value) {
			resetForm()
		}
	},
)

const buildPayload = () => ({
	code: form.code,
	name: form.name,
	description: form.description || null,
	host: form.host,
	port: form.port,
	enabled: form.enabled,
	sortOrder: form.sortOrder,
	portalBridge: {
		bridgeId: form.portalBridge.bridgeId,
		module: form.portalBridge.module,
		wsUrl: form.portalBridge.wsUrl,
		secret: form.portalBridge.secret || undefined,
		enabled: form.portalBridge.enabled,
	},
	authMe: {
		host: form.authMe.host,
		port: form.authMe.port,
		database: form.authMe.database,
		username: form.authMe.username,
		password: form.authMe.password || undefined,
		enabled: form.authMe.enabled,
	},
	luckPerms: {
		host: form.luckPerms.host,
		port: form.luckPerms.port,
		database: form.luckPerms.database,
		username: form.luckPerms.username,
		password: form.luckPerms.password || undefined,
		enabled: form.luckPerms.enabled,
	},
})

const submit = async (): Promise<void> => {
	saving.value = true

	try {
		const response =
			mode.value === 'create'
				? await $fetch<MinecraftServerResponse>('/api/minecraft/servers', {
						method: 'POST',
						body: {
							serverId: form.serverId,
							...buildPayload(),
						},
					})
				: await $fetch<MinecraftServerResponse>(
						`/api/minecraft/servers/${form.serverId}`,
						{
							method: 'PATCH',
							body: buildPayload(),
						},
					)

		emit('saved', response.server)
		emit('update:open', false)
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

<style scoped>
.admin-field {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: rgb(51 65 85);
}

.dark .admin-field {
	color: rgb(226 232 240);
}

.admin-field input,
.admin-field textarea {
	border-radius: 0.5rem;
	border: 1px solid rgb(203 213 225);
	background: rgb(255 255 255 / 0.88);
	padding: 0.625rem 0.75rem;
	font-size: 0.875rem;
	font-weight: 400;
	color: rgb(15 23 42);
	outline: none;
}

.dark .admin-field input,
.dark .admin-field textarea {
	border-color: rgb(51 65 85);
	background: rgb(15 23 42 / 0.8);
	color: white;
}

.admin-field input:focus,
.admin-field textarea:focus {
	border-color: rgb(14 165 233);
	box-shadow: 0 0 0 3px rgb(14 165 233 / 0.16);
}

.admin-section {
	display: flex;
	flex-direction: column;
	gap: 0.875rem;
	border: 1px solid rgb(203 213 225);
	border-radius: 0.5rem;
	background: rgb(241 245 249 / 0.92);
	padding: 1rem;
}

.dark .admin-section {
	border-color: rgb(51 65 85);
	background: rgb(15 23 42 / 0.92);
}

.admin-section-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.95rem;
	font-weight: 700;
	color: rgb(15 23 42);
}

.dark .admin-section-title {
	color: white;
}

.admin-check {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: rgb(51 65 85);
}

.dark .admin-check {
	color: rgb(226 232 240);
}

.admin-check input {
	height: 1rem;
	width: 1rem;
	accent-color: rgb(14 165 233);
}
</style>
