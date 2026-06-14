<template>
	<div class="space-y-5">
		<Transition
			name="auth-back"
			@before-enter="beforeEnter"
			@enter="enter"
			@after-enter="afterEnter"
			@before-leave="beforeLeave"
			@leave="leave"
		>
			<button
				v-if="authMode === 'email'"
				type="button"
				class="inline-flex w-fit items-center gap-2 overflow-hidden text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
				@click="authMode = 'password'"
			>
				<UIcon name="i-lucide-arrow-left" class="size-4" />
				{{ t('emailCodeLogin.actions.back') }}
			</button>
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

		<Transition
			name="auth-panel"
			mode="out-in"
			@before-enter="beforeEnter"
			@enter="enter"
			@after-enter="afterEnter"
			@before-leave="beforeLeave"
			@leave="leave"
		>
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
						<NuxtLink
							:to="localePath('/forgot-password')"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('login.actions.forgotPassword') }}
						</NuxtLink>
					</div>
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
			<EmailCodeLoginForm v-else key="email" />
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
const submitting = ref(false)
const rememberMe = ref(true)
const passwordVisible = ref(false)
const authMode = ref<'password' | 'email'>('password')
const form = reactive<LoginFormState>({
	handleOrEmail: '',
	password: '',
})

const authTitleKey = computed(() =>
	authMode.value === 'email' ? 'emailCodeLogin.title' : 'login.title',
)
const authDescriptionKey = computed(() =>
	authMode.value === 'email'
		? 'emailCodeLogin.description'
		: 'login.description',
)
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

const beforeEnter = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = '0'
	htmlElement.style.opacity = '0'
}

const enter = (element: Element, done: () => void): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = `${htmlElement.scrollHeight}px`
	htmlElement.style.opacity = '1'
	window.setTimeout(done, 240)
}

const afterEnter = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = 'auto'
	htmlElement.style.opacity = ''
}

const beforeLeave = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = `${htmlElement.scrollHeight}px`
	htmlElement.style.opacity = '1'
}

const leave = (element: Element, done: () => void): void => {
	const htmlElement = element as HTMLElement
	requestAnimationFrame(() => {
		htmlElement.style.height = '0'
		htmlElement.style.opacity = '0'
	})
	window.setTimeout(done, 240)
}
</script>

<style scoped>
.auth-panel-enter-active,
.auth-panel-leave-active,
.auth-back-enter-active,
.auth-back-leave-active {
	transition:
		height 240ms ease,
		opacity 180ms ease;
}

.auth-title-enter-active,
.auth-title-leave-active {
	transition:
		opacity 180ms ease,
		transform 220ms ease;
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
