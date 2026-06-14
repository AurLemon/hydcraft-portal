<template>
	<div class="space-y-5">
		<Transition name="auth-back">
			<div v-if="authMode !== 'password'" class="auth-back-wrap">
				<button
					type="button"
					class="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
					@click="authMode = 'password'"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					{{ t('emailCodeLogin.actions.back') }}
				</button>
			</div>
		</Transition>

		<div>
			<Transition name="auth-title" mode="out-in">
				<div :key="authMode">
					<h1
						class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
					>
						{{ t(authTitleKey) }}
					</h1>
					<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
						{{ t(authDescriptionKey) }}
					</p>
				</div>
			</Transition>
		</div>

		<Transition name="auth-panel" mode="out-in">
			<form
				v-if="authMode === 'password'"
				key="password"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submit"
			>
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
					<UCheckbox
						v-model="rememberMe"
						:label="t('login.fields.rememberMe')"
					/>
					<div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
						<button
							type="button"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
							@click="authMode = 'email'"
						>
							{{ t('login.actions.emailCodeLogin') }}
						</button>
						<button
							type="button"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
							@click="authMode = 'forgotPassword'"
						>
							{{ t('login.actions.forgotPassword') }}
						</button>
					</div>
				</div>

				<CapWidget
					v-if="captcha.required.value"
					ref="captchaWidgetRef"
					v-model="captcha.token.value"
				/>

				<UButton
					type="submit"
					icon="i-lucide-log-in"
					:loading="submitting"
					:disabled="submitDisabled"
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
			<EmailCodeLoginForm v-else-if="authMode === 'email'" key="email" />
			<ForgotPasswordForm v-else key="forgot-password" embedded />
		</Transition>
	</div>
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
const { getErrorCode } = useApiError()
const submitting = ref(false)
const rememberMe = ref(true)
const passwordVisible = ref(false)
const authMode = ref<'password' | 'email' | 'forgotPassword'>('password')
const captcha = useCap(false)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<LoginFormState>({
	handleOrEmail: '',
	password: '',
})

const authTitleKey = computed(() =>
	authMode.value === 'email'
		? 'emailCodeLogin.title'
		: authMode.value === 'forgotPassword'
			? 'forgotPassword.title'
			: 'login.title',
)
const authDescriptionKey = computed(() =>
	authMode.value === 'email'
		? 'emailCodeLogin.description'
		: authMode.value === 'forgotPassword'
			? 'forgotPassword.description'
			: 'login.description',
)
const registerRoute = computed(() => ({
	path: localePath('/register'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))
const submitDisabled = computed(
	() =>
		!form.handleOrEmail ||
		!form.password ||
		submitting.value ||
		(captcha.required.value && !captcha.token.value),
)

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/'),
		loginPath: localePath('/login'),
	})
}

const resetCaptcha = (): void => {
	captcha.reset()
	captchaWidgetRef.value?.reset()
}

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	submitting.value = true

	try {
		await login({
			...form,
			captchaToken: captcha.consumeToken(),
		})
		notifySuccess({
			title: t('login.notifications.successTitle'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		if (getErrorCode(error) === 'CAPTCHA_REQUIRED') {
			captcha.markRequired()
		}

		if (captcha.required.value) {
			resetCaptcha()
		}

		notifyError(error, {
			title: t('login.notifications.failedTitle'),
			description: t('login.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>

<style scoped>
.auth-panel-enter-active,
.auth-panel-leave-active,
.auth-back-enter-active,
.auth-back-leave-active {
	transition:
		grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1),
		opacity 240ms ease,
		transform 320ms ease;
	display: grid;
	overflow: hidden;
}

.auth-panel-enter-active > *,
.auth-panel-leave-active > *,
.auth-back-enter-active > *,
.auth-back-leave-active > * {
	min-height: 0;
}

.auth-panel-enter-from,
.auth-panel-leave-to,
.auth-back-enter-from,
.auth-back-leave-to {
	grid-template-rows: 0fr;
	opacity: 0;
	transform: translateY(-6px);
}

.auth-panel-enter-to,
.auth-panel-leave-from,
.auth-back-enter-to,
.auth-back-leave-from {
	grid-template-rows: 1fr;
	opacity: 1;
	transform: translateY(0);
}

.auth-title-enter-active,
.auth-title-leave-active {
	transition:
		opacity 240ms ease,
		transform 300ms ease;
}

.auth-title-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.auth-title-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
