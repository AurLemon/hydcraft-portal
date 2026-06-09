<template>
	<ProfileField
		:label="label"
		:field-class="fieldClass"
		:label-class="labelClass"
		:control-wrapper-class="controlWrapperClass"
	>
		<span :class="['inline-flex pt-1.5', controlClass ?? 'w-full']">
			<slot />
		</span>
	</ProfileField>
</template>

<script setup lang="ts">
import ProfileField from '~/components/profile/ProfileField.vue'

interface ProfileSwitchFieldProps {
	label: string
	fieldClass?: string
	labelClass?: string
	controlWrapperClass?: string
	controlClass?: string
}

defineProps<ProfileSwitchFieldProps>()
</script>
