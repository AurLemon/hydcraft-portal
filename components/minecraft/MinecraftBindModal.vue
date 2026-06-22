<template>
	<UModal v-model:open="open" :title="t('minecraftAccounts.bind.title')">
		<template #body>
			<div class="space-y-4">
				<div
					class="flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300/80"
				>
					<UIcon
						name="i-lucide-info"
						class="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500"
					/>
					<div>
						<p
							v-for="(line, index) in bindDescriptionLines"
							:key="`minecraft-bind-description-${index}`"
						>
							{{ line }}
						</p>
					</div>
				</div>

				<form class="grid gap-4" @submit.prevent="submit">
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftAccounts.bind.fields.username') }}</span>
						<UInput v-model="form.username" required size="lg" />
					</label>
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftAccounts.bind.fields.password') }}</span>
						<UInput
							v-model="form.password"
							:type="passwordVisible ? 'text' : 'password'"
							required
							size="lg"
						>
							<template #trailing>
								<UButton
									type="button"
									color="neutral"
									variant="ghost"
									size="xs"
									:icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
									:aria-label="t('auth.actions.togglePassword')"
									@click="passwordVisible = !passwordVisible"
								/>
							</template>
						</UInput>
					</label>

					<div class="flex justify-end">
						<UButton
							type="submit"
							icon="i-lucide-link"
							:loading="binding"
							:disabled="submitDisabled"
							size="lg"
						>
							{{ t('minecraftAccounts.bind.actions.submit') }}
						</UButton>
					</div>
				</form>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { BindMinecraftAccountBody } from '~/utils/minecraft/accounts'

interface MinecraftBindModalProps {
	binding: boolean
	successToken: number
}

const props = defineProps<MinecraftBindModalProps>()

const emit = defineEmits<{
	submit: [payload: BindMinecraftAccountBody]
}>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })
const passwordVisible = ref(false)
const form = reactive<BindMinecraftAccountBody>({
	username: '',
	password: '',
})
const bindDescriptionLines = computed(() => [
	t('minecraftAccounts.bind.descriptionLine1'),
	t('minecraftAccounts.bind.descriptionLine2'),
	t('minecraftAccounts.bind.descriptionLine3'),
])

const submitDisabled = computed(
	() => !form.username || !form.password || props.binding,
)

const resetForm = (): void => {
	form.username = ''
	form.password = ''
	passwordVisible.value = false
}

const submit = (): void => {
	if (submitDisabled.value) {
		return
	}

	emit('submit', {
		username: form.username,
		password: form.password,
	})
}

watch(
	() => props.successToken,
	() => {
		open.value = false
		resetForm()
	},
)
</script>
