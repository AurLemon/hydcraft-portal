<template>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
	>
		<span>{{ t('admin.mysqlFields.host') }}</span>
		<input :value="host" @input="emitValue('host', $event)" />
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
	>
		<span>{{ t('admin.mysqlFields.port') }}</span>
		<input
			:value="port"
			type="number"
			min="1"
			max="65535"
			@input="emitNumber('port', $event)"
		/>
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
	>
		<span>{{ t('admin.mysqlFields.database') }}</span>
		<input :value="database" @input="emitValue('database', $event)" />
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
	>
		<span>{{ t('admin.mysqlFields.username') }}</span>
		<input :value="username" @input="emitValue('username', $event)" />
	</label>
	<label
		class="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 [&>strong]:text-slate-950 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:bg-slate-50/90 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:text-slate-950 [&>input]:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:bg-slate-50/90 [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>textarea]:text-slate-950 [&>textarea]:outline-none focus-within:[&>input]:border-sky-500 focus-within:[&>input]:ring-4 focus-within:[&>input]:ring-sky-500/15 focus-within:[&>textarea]:border-sky-500 focus-within:[&>textarea]:ring-4 focus-within:[&>textarea]:ring-sky-500/15 dark:[&>span]:text-slate-400 dark:[&>strong]:text-slate-100 dark:[&>input]:border-slate-700 dark:[&>input]:bg-slate-950/80 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:bg-slate-950/80 dark:[&>textarea]:text-white"
	>
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
	<label
		class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 [&>input]:h-4 [&>input]:w-4 [&>input]:accent-sky-500"
	>
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
