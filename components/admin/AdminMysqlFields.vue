<template>
	<label class="admin-field">
		<span>{{ t('admin.mysqlFields.host') }}</span>
		<input :value="host" @input="emitValue('host', $event)" />
	</label>
	<label class="admin-field">
		<span>{{ t('admin.mysqlFields.port') }}</span>
		<input
			:value="port"
			type="number"
			min="1"
			max="65535"
			@input="emitNumber('port', $event)"
		/>
	</label>
	<label class="admin-field">
		<span>{{ t('admin.mysqlFields.database') }}</span>
		<input :value="database" @input="emitValue('database', $event)" />
	</label>
	<label class="admin-field">
		<span>{{ t('admin.mysqlFields.username') }}</span>
		<input :value="username" @input="emitValue('username', $event)" />
	</label>
	<label class="admin-field">
		<span>{{ t('admin.mysqlFields.password') }}</span>
		<input
			:value="password"
			type="password"
			:placeholder="
				hasPassword ? t('admin.serverConfig.placeholders.keepSecret') : ''
			"
			@input="emitValue('password', $event)"
		/>
	</label>
	<label class="admin-check">
		<input
			:checked="enabled"
			type="checkbox"
			@change="emitBoolean('enabled', $event)"
		/>
		<span>{{ t('admin.mysqlFields.enabled') }}</span>
	</label>
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

const getInput = (event: Event): HTMLInputElement =>
	event.target as HTMLInputElement

const emitValue = (
	key: 'host' | 'database' | 'username' | 'password',
	event: Event,
): void => {
	const value = getInput(event).value

	if (key === 'host') {
		emit('update:host', value)
		return
	}

	if (key === 'database') {
		emit('update:database', value)
		return
	}

	if (key === 'username') {
		emit('update:username', value)
		return
	}

	emit('update:password', value)
}

const emitNumber = (key: 'port', event: Event): void => {
	if (key === 'port') {
		emit('update:port', Number(getInput(event).value))
	}
}

const emitBoolean = (key: 'enabled', event: Event): void => {
	if (key === 'enabled') {
		emit('update:enabled', getInput(event).checked)
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

.admin-field input {
	border-radius: 0.5rem;
	border: 1px solid rgb(203 213 225);
	background: rgb(255 255 255 / 0.88);
	padding: 0.625rem 0.75rem;
	font-size: 0.875rem;
	font-weight: 400;
	color: rgb(15 23 42);
	outline: none;
}

.dark .admin-field input {
	border-color: rgb(51 65 85);
	background: rgb(15 23 42 / 0.8);
	color: white;
}

.admin-field input:focus {
	border-color: rgb(14 165 233);
	box-shadow: 0 0 0 3px rgb(14 165 233 / 0.16);
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
