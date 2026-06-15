<template>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
	>
		<span>{{ t('admin.mysqlFields.host') }}</span>
		<UInput
			:model-value="host"
			class="w-full"
			@update:model-value="emitString('host', $event)"
		/>
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
	>
		<span>{{ t('admin.mysqlFields.port') }}</span>
		<UInput
			:model-value="port"
			class="w-full"
			type="number"
			min="1"
			max="65535"
			@update:model-value="emitNumber('port', $event)"
		/>
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
	>
		<span>{{ t('admin.mysqlFields.database') }}</span>
		<UInput
			:model-value="database"
			class="w-full"
			@update:model-value="emitString('database', $event)"
		/>
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
	>
		<span>{{ t('admin.mysqlFields.username') }}</span>
		<UInput
			:model-value="username"
			class="w-full"
			@update:model-value="emitString('username', $event)"
		/>
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
	>
		<span>{{ t('admin.mysqlFields.password') }}</span>
		<UInput
			:model-value="password"
			class="w-full"
			type="password"
			:placeholder="
				hasPassword ? t('admin.serverConfig.placeholders.keepSecret') : ''
			"
			@update:model-value="emitString('password', $event)"
		/>
	</label>
	<div class="flex items-center justify-between gap-3 px-1 py-1">
		<span class="text-sm font-medium text-slate-700 dark:text-slate-200">
			{{ t('admin.mysqlFields.enabled') }}
		</span>
		<USwitch
			:model-value="enabled"
			@update:model-value="emit('update:enabled', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
interface AdminMysqlFieldsProps {
	host: string
	port: number
	database: string
	username: string
	password: string
	enabled: boolean
	hasPassword: boolean
}

defineProps<AdminMysqlFieldsProps>()

const emit = defineEmits<{
	'update:host': [value: string]
	'update:port': [value: number]
	'update:database': [value: string]
	'update:username': [value: string]
	'update:password': [value: string]
	'update:enabled': [value: boolean]
}>()

const emitString = (
	key: 'host' | 'database' | 'username' | 'password',
	value: string | number,
): void => {
	const normalized = String(value)

	if (key === 'host') {
		emit('update:host', normalized)
		return
	}

	if (key === 'database') {
		emit('update:database', normalized)
		return
	}

	if (key === 'username') {
		emit('update:username', normalized)
		return
	}

	emit('update:password', normalized)
}

const emitNumber = (key: 'port', value: string | number): void => {
	if (key === 'port') {
		emit('update:port', Number(value))
	}
}
</script>
