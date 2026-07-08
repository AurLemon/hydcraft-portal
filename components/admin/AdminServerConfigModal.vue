<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-4xl', body: 'p-0' }"
		@update:open="$emit('update:open', $event)"
	>
		<template #content>
			<div class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6">
				<div class="mb-2 flex justify-end">
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						:aria-label="t('admin.serverConfig.actions.close')"
						@click="$emit('update:open', false)"
					/>
				</div>

				<AdminServerConfigForm
					:key="`${mode ?? 'all'}-${server?.serverId ?? 'create'}-${open}`"
					:server="server"
					:mode="mode"
					@saved="handleSaved"
					@cancel="$emit('update:open', false)"
				/>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import AdminServerConfigForm from './AdminServerConfigForm.vue'
import type { MinecraftServerSummary } from './types'

interface AdminServerConfigModalProps {
	open: boolean
	server: MinecraftServerSummary | null
	mode?: 'all' | 'basic' | 'portalBridge' | 'authMe' | 'luckPerms' | 'sync'
}

const props = defineProps<AdminServerConfigModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [server: MinecraftServerSummary]
}>()
const { t } = useI18n()

const handleSaved = (server: MinecraftServerSummary): void => {
	emit('saved', server)
	emit('update:open', false)
}
</script>
