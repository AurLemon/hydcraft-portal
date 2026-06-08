<template>
	<form class="space-y-5" @submit.prevent="submit">
		<div>
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('register.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('register.description') }}
			</p>
		</div>

		<div class="space-y-4">
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('register.fields.handle') }}</span>
				<UInput
					v-model="form.handle"
					required
					autocomplete="username"
					:placeholder="t('register.placeholders.handle')"
					size="lg"
					variant="outline"
				/>
			</label>
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('register.fields.email') }}</span>
				<UInput
					v-model="form.email"
					type="email"
					autocomplete="email"
					:placeholder="t('register.placeholders.email')"
					size="lg"
					variant="outline"
				/>
			</label>
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('register.fields.displayName') }}</span>
				<UInput
					v-model="form.displayName"
					autocomplete="nickname"
					:placeholder="t('register.placeholders.displayName')"
					size="lg"
					variant="outline"
				/>
			</label>
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('register.fields.password') }}</span>
				<UInput
					v-model="form.password"
					:type="passwordVisible ? 'text' : 'password'"
					required
					autocomplete="new-password"
					:placeholder="t('register.placeholders.password')"
					size="lg"
					variant="outline"
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
		</div>

		<UButton
			type="submit"
			icon="i-lucide-user-plus"
			:loading="submitting"
			size="lg"
			class="w-full justify-center"
		>
			{{ t('register.actions.submit') }}
		</UButton>

		<p class="text-center text-sm text-slate-600 dark:text-slate-300/80">
			{{ t('register.loginPrompt.text') }}
			<NuxtLink
				:to="loginRoute"
				class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
			>
				{{ t('register.loginPrompt.action') }}
			</NuxtLink>
		</p>

		<AuthProviderList />
	</form>
</template>

<script setup lang="ts">
import { normalizePortalRedirectPath } from '~/utils/auth/redirect'

interface RegisterFormState {
	handle: string
	email: string
	displayName: string
	password: string
}

const route = useRoute()
const localePath = useLocalePath()
const { register } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const passwordVisible = ref(false)
const form = reactive<RegisterFormState>({
	handle: '',
	email: '',
	displayName: '',
	password: '',
})

const loginRoute = computed(() => ({
	path: localePath('/login'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/me/profile'),
		loginPath: localePath('/login'),
	})
}

const submit = async (): Promise<void> => {
	submitting.value = true

	try {
		await register({
			handle: form.handle,
			email: form.email || undefined,
			displayName: form.displayName || undefined,
			password: form.password,
		})
		notifySuccess({
			title: t('register.notifications.successTitle'),
			description: t('register.notifications.successDescription'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		notifyError(error, {
			title: t('register.notifications.failedTitle'),
			description: t('register.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
