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
					<div class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
						<template v-if="authMode === 'game'">
							<p
								v-for="(line, index) in minecraftLoginDescriptionLines"
								:key="`minecraft-login-description-${index}`"
							>
								{{ line }}
							</p>
						</template>
						<p v-else>
							{{ t(authDescriptionKey) }}
						</p>
					</div>
				</div>
			</Transition>
		</div>

		<Transition name="auth-panel" mode="out-in">
			<form
				v-if="authMode === 'password'"
				key="password"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submitPasswordLogin"
			>
				<div class="space-y-4">
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('login.fields.handleOrEmail') }}</span>
						<UInput
							v-model="passwordForm.handleOrEmail"
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
							v-model="passwordForm.password"
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
							@click="authMode = 'game'"
						>
							{{ t('login.actions.minecraftLogin') }}
						</button>
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
					v-if="passwordCaptcha.required.value"
					ref="passwordCaptchaWidgetRef"
					v-model="passwordCaptcha.token.value"
				/>

				<UButton
					type="submit"
					icon="i-lucide-log-in"
					:loading="submitting"
					:disabled="passwordSubmitDisabled"
					size="lg"
					class="w-full justify-center"
				>
					{{ t('login.actions.submit') }}
				</UButton>

				<div
					class="space-y-2 text-center text-sm text-slate-600 dark:text-slate-300/80"
				>
					<p>
						{{ t('login.registerPrompt.text') }}
						<NuxtLink
							:to="registerRoute"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('login.registerPrompt.action') }}
						</NuxtLink>
					</p>
				</div>

				<AuthProviderList />
			</form>
			<form
				v-else-if="authMode === 'game'"
				key="game"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submitMinecraftLogin"
			>
				<div class="space-y-4">
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftLogin.fields.username') }}</span>
						<UInput
							v-model="minecraftForm.username"
							required
							autocomplete="username"
							size="lg"
							variant="outline"
						/>
					</label>
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftLogin.fields.password') }}</span>
						<UInput
							v-model="minecraftForm.password"
							:type="gamePasswordVisible ? 'text' : 'password'"
							required
							autocomplete="current-password"
							size="lg"
							variant="outline"
						>
							<template #trailing>
								<UButton
									type="button"
									color="neutral"
									variant="ghost"
									size="xs"
									:icon="
										gamePasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'
									"
									:aria-label="t('auth.actions.togglePassword')"
									@click="gamePasswordVisible = !gamePasswordVisible"
								/>
							</template>
						</UInput>
					</label>
				</div>

				<CapWidget
					ref="minecraftCaptchaWidgetRef"
					v-model="minecraftCaptcha.token.value"
				/>

				<UButton
					type="submit"
					icon="i-lucide-gamepad-2"
					:loading="submitting"
					:disabled="minecraftSubmitDisabled"
					size="lg"
					class="w-full justify-center"
				>
					{{ t('minecraftLogin.actions.submit') }}
				</UButton>

				<p class="text-center text-sm text-slate-600 dark:text-slate-300/80">
					{{ t('minecraftLogin.registerPrompt.text') }}
					<NuxtLink
						:to="gameRegisterRoute"
						class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
					>
						{{ t('minecraftLogin.registerPrompt.action') }}
					</NuxtLink>
				</p>
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

interface MinecraftLoginFormState {
	username: string
	password: string
}

type LoginAuthMode = 'password' | 'game' | 'email' | 'forgotPassword'

interface ApiErrorWithData {
	data?: {
		registrationToken?: unknown
	}
}

const parseAuthMode = (value: unknown): LoginAuthMode =>
	value === 'game' || value === 'email' ? value : 'password'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const { login, loginWithMinecraft } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const { getErrorCode } = useApiError()
const submitting = ref(false)
const rememberMe = ref(true)
const passwordVisible = ref(false)
const gamePasswordVisible = ref(false)
const authMode = ref<LoginAuthMode>(parseAuthMode(route.query.mode))
const passwordCaptcha = useCap(false)
const passwordCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)
const minecraftCaptcha = useCap(true)
const minecraftCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)
const passwordForm = reactive<LoginFormState>({
	handleOrEmail: '',
	password: '',
})
const minecraftForm = reactive<MinecraftLoginFormState>({
	username: '',
	password: '',
})

watch(
	() => route.query.mode,
	(mode) => {
		authMode.value = parseAuthMode(mode)
	},
)

watch(
	authMode,
	(mode, previousMode) => {
		if (previousMode === 'game') {
			resetMinecraftCaptcha()
		}

		if (previousMode === 'password' && mode !== 'password') {
			resetPasswordCaptcha()
		}
	},
	{
		immediate: true,
	},
)

const authTitleKey = computed(() => {
	switch (authMode.value) {
		case 'email':
			return 'emailCodeLogin.title'
		case 'forgotPassword':
			return 'forgotPassword.title'
		case 'game':
			return 'minecraftLogin.title'
		default:
			return 'login.title'
	}
})
const authDescriptionKey = computed(() => {
	switch (authMode.value) {
		case 'email':
			return 'emailCodeLogin.description'
		case 'forgotPassword':
			return 'forgotPassword.description'
		case 'game':
			return 'minecraftLogin.description'
		default:
			return 'login.description'
	}
})
const minecraftLoginDescriptionLines = computed(() => [
	t('minecraftLogin.descriptionLine1'),
	t('minecraftLogin.descriptionLine2'),
	t('minecraftLogin.descriptionLine3'),
])
const registerRoute = computed(() => ({
	path: localePath('/register'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))
const gameRegisterRoute = computed(() => ({
	path: localePath('/register'),
	query: {
		...(route.query.redirect ? { redirect: route.query.redirect } : {}),
		mode: 'game',
	},
}))
const passwordSubmitDisabled = computed(
	() =>
		!passwordForm.handleOrEmail ||
		!passwordForm.password ||
		submitting.value ||
		(passwordCaptcha.required.value && !passwordCaptcha.token.value),
)
const minecraftSubmitDisabled = computed(
	() =>
		!minecraftForm.username ||
		!minecraftForm.password ||
		!minecraftCaptcha.token.value ||
		submitting.value,
)

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/'),
		loginPath: localePath('/login'),
	})
}

const resetPasswordCaptcha = (): void => {
	passwordCaptcha.reset()
	passwordCaptchaWidgetRef.value?.reset()
}

const resetMinecraftCaptcha = (): void => {
	minecraftCaptcha.reset(true)
	minecraftCaptchaWidgetRef.value?.reset()
}

const handlePasswordAuthFailure = (
	error: unknown,
	fallbackTitle: string,
	fallbackDescription: string,
): void => {
	if (getErrorCode(error) === 'CAPTCHA_REQUIRED') {
		passwordCaptcha.markRequired()
	}

	if (passwordCaptcha.required.value) {
		resetPasswordCaptcha()
	}

	notifyError(error, {
		title: fallbackTitle,
		description: fallbackDescription,
	})
}

const navigateToGameRegistration = async (
	registrationToken: string,
): Promise<void> => {
	await navigateTo({
		path: localePath('/register'),
		query: {
			...(route.query.redirect ? { redirect: route.query.redirect } : {}),
			mode: 'game',
			ticket: registrationToken,
		},
	})
}

const submitPasswordLogin = async (): Promise<void> => {
	if (passwordSubmitDisabled.value) {
		return
	}

	submitting.value = true

	try {
		await login({
			...passwordForm,
			captchaToken: passwordCaptcha.consumeToken(),
		})
		notifySuccess({
			title: t('login.notifications.successTitle'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		handlePasswordAuthFailure(
			error,
			t('login.notifications.failedTitle'),
			t('login.notifications.failedDescription'),
		)
	} finally {
		submitting.value = false
	}
}

const submitMinecraftLogin = async (): Promise<void> => {
	if (minecraftSubmitDisabled.value) {
		return
	}

	submitting.value = true

	try {
		await loginWithMinecraft({
			...minecraftForm,
			captchaToken: minecraftCaptcha.consumeToken(),
		})
		resetMinecraftCaptcha()
		notifySuccess({
			title: t('minecraftLogin.notifications.successTitle'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		const errorCode = getErrorCode(error)
		const registrationTokenCandidate = (error as ApiErrorWithData | null)?.data
			?.registrationToken
		const registrationToken =
			typeof registrationTokenCandidate === 'string'
				? registrationTokenCandidate
				: null

		if (errorCode === 'MINECRAFT_ACCOUNT_NOT_BOUND' && registrationToken) {
			resetMinecraftCaptcha()
			notifySuccess({
				title: t('minecraftLogin.notifications.registrationRequiredTitle'),
				description: t(
					'minecraftLogin.notifications.registrationRequiredDescription',
				),
			})
			await navigateToGameRegistration(registrationToken)
			return
		}

		resetMinecraftCaptcha()
		notifyError(error, {
			title: t('minecraftLogin.notifications.failedTitle'),
			description: t('minecraftLogin.notifications.failedDescription'),
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
