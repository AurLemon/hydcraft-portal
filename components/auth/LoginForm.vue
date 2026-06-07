<template>
	<form class="space-y-5" @submit.prevent="submit">
		<div>
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('login.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('login.description') }}
			</p>
		</div>

		<div class="space-y-4">
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('login.fields.handleOrEmail') }}</span>
				<UInput
					v-model="form.handleOrEmail"
					required
					autocomplete="username"
					:placeholder="t('login.placeholders.handleOrEmail')"
					size="lg"
					variant="outline"
				/>
			</label>
			<label
				class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
			>
				<span>{{ t('login.fields.password') }}</span>
				<UInput
					v-model="form.password"
					:type="passwordVisible ? 'text' : 'password'"
					required
					autocomplete="current-password"
					:placeholder="t('login.placeholders.password')"
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

		<div class="flex items-center justify-between gap-4 text-sm">
			<UCheckbox v-model="rememberMe" :label="t('login.fields.rememberMe')" />
			<NuxtLink
				:to="localePath('/forgot-password')"
				class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
			>
				{{ t('login.actions.forgotPassword') }}
			</NuxtLink>
		</div>

		<UButton
			type="submit"
			icon="i-lucide-log-in"
			:loading="submitting"
			size="lg"
			class="w-full justify-center"
		>
			{{ t('login.actions.submit') }}
		</UButton>

		<p class="text-center text-sm text-slate-600 dark:text-slate-300/80">
			{{ t('login.registerPrompt.text') }}
			<NuxtLink
				:to="registerRoute"
				class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
			>
				{{ t('login.registerPrompt.action') }}
			</NuxtLink>
		</p>

		<AuthProviderList />
	</form>
</template>

<script setup lang="ts">
import { normalizePortalRedirectPath } from '~/utils/auth/redirect'

interface LoginFormState {
	handleOrEmail: string
	password: string
}

const route = useRoute()
const localePath = useLocalePath()
const { login } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const rememberMe = ref(true)
const passwordVisible = ref(false)
const form = reactive<LoginFormState>({
	handleOrEmail: '',
	password: '',
})

const registerRoute = computed(() => ({
	path: localePath('/register'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/'),
		loginPath: localePath('/login'),
	})
}

const submit = async (): Promise<void> => {
	submitting.value = true

	try {
		await login(form)
		notifySuccess({
			title: t('login.notifications.successTitle'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		notifyError(error, {
			title: t('login.notifications.failedTitle'),
			description: t('login.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
