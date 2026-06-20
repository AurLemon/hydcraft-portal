<template>
	<div
		v-if="birthdayInfoText"
		class="text-xs text-slate-500 dark:text-slate-400"
	>
		{{ birthdayInfoText }}
	</div>
</template>

<script setup lang="ts">
import {
	formatBirthdaySummaryText,
	resolveBirthdaySummary,
} from '~/utils/profile-birthday'

interface ProfileBirthdayInfoProps {
	birthday: string
}

const props = defineProps<ProfileBirthdayInfoProps>()
const { t, locale } = useI18n()

const birthdayInfoText = computed(() => {
	if (!props.birthday) {
		return ''
	}

	const summary = resolveBirthdaySummary(props.birthday)

	if (!summary) {
		return ''
	}

	return formatBirthdaySummaryText(summary, t, locale.value)
})
</script>
