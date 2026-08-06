<template>
	<UModal
		:open="open"
		:title="modalTitle"
		:ui="{ content: 'max-w-2xl', body: 'overflow-y-auto' }"
		@update:open="$emit('update:open', $event)"
	>
		<template #body>
			<AdminServerConfigForm
				:key="`${mode ?? 'all'}-${server?.serverId ?? 'create'}-${open}`"
				:server="server"
				:mode="mode"
				surface="plain"
				@saved="handleSaved"
				@cancel="$emit('update:open', false)"
			/>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import AdminServerConfigForm from './AdminServerConfigForm.vue'
import type { MinecraftServerSummary } from './types'

interface AdminServerConfigModalProps {
	open: boolean
	server: MinecraftServerSummary | null
	mode?:
		| 'all'
		| 'create'
		| 'basic'
		| 'map'
		| 'periods'
		| 'portalBridge'
		| 'sync'
}

const props = defineProps<AdminServerConfigModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [server: MinecraftServerSummary]
}>()
const { t } = useI18n()
const modalTitle = computed(() => {
	switch (props.mode) {
		case 'basic':
			return t('admin.serverConfig.sections.basic')
		case 'map':
			return t('admin.serverConfig.sections.blueMapConfig')
		case 'periods':
			return t('admin.serverConfig.sections.periods')
		case 'portalBridge':
			return t('admin.serverConfig.sections.portalBridge')
		case 'sync':
			return t('admin.serverConfig.sections.sync')
		case 'create':
			return t('admin.serverCreate.title')
		default:
			return t('admin.serverConfig.title')
	}
})

const handleSaved = (server: MinecraftServerSummary): void => {
	emit('saved', server)
	emit('update:open', false)
}
</script>
