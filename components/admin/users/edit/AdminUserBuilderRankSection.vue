<template>
	<section class="grid gap-3 break-inside-avoid">
		<div class="mx-1 flex items-center justify-between gap-3">
			<div :class="profileSectionTitleClass">
				{{ t('admin.users.sections.builderRank') }}
			</div>
			<UButton
				type="button"
				color="primary"
				size="sm"
				variant="link"
				icon="i-lucide-check"
				:loading="submitting"
				@click="$emit('submit')"
			>
				{{ t('admin.actions.save') }}
			</UButton>
		</div>
		<div :class="profileCardClass" class="grid gap-4">
			<label :class="adminFieldClass">
				<span>{{ t('admin.builderRanks.fields.rank') }}</span>
				<USelect v-model="form.builderRank" :items="rankItems" />
			</label>
			<div class="grid gap-4 md:grid-cols-2">
				<label :class="adminFieldClass">
					<span>简体中文</span>
					<UTextarea v-model="form.builderRankComments.zhCn" :rows="3" />
				</label>
				<label :class="adminFieldClass">
					<span>繁體中文</span>
					<UTextarea v-model="form.builderRankComments.zhTw" :rows="3" />
				</label>
				<label :class="adminFieldClass">
					<span>English</span>
					<UTextarea v-model="form.builderRankComments.enUs" :rows="3" />
				</label>
				<label :class="adminFieldClass">
					<span>日本語</span>
					<UTextarea v-model="form.builderRankComments.jaJp" :rows="3" />
				</label>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import { adminFieldClass, type AdminUserForm } from '~/utils/admin/users/edit'

interface AdminUserBuilderRankSectionProps {
	submitting: boolean
}

defineProps<AdminUserBuilderRankSectionProps>()
defineEmits<{
	submit: []
}>()

const { t } = useI18n()
const form = defineModel<AdminUserForm>('form', { required: true })
const rankItems = computed(() => [
	{ label: t('admin.builderRanks.ranks.NONE'), value: null },
	{ label: t('admin.builderRanks.ranks.CHIEF'), value: 'CHIEF' },
	{ label: t('admin.builderRanks.ranks.SENIOR'), value: 'SENIOR' },
	{ label: t('admin.builderRanks.ranks.PRACTICING'), value: 'PRACTICING' },
	{ label: t('admin.builderRanks.ranks.APPRENTICE'), value: 'APPRENTICE' },
])
</script>
