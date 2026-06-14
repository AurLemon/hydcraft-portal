<template>
	<div class="space-y-3">
		<div
			class="flex items-center gap-3 text-xs text-slate-500 dark:text-white/45"
		>
			<span class="h-px flex-1 bg-slate-200 dark:bg-white/12" />
			<span>{{ t('auth.providers.divider') }}</span>
			<span class="h-px flex-1 bg-slate-200 dark:bg-white/12" />
		</div>

		<div v-if="configuredProviders.length" class="grid gap-2">
			<UButton
				v-for="provider in configuredProviders"
				:key="provider.provider"
				type="button"
				color="neutral"
				variant="outline"
				size="lg"
				:to="getProviderHref(provider.provider)"
				external
				class="w-full justify-center"
			>
				<template #leading>
					<img
						v-if="provider.logoUrl"
						:src="provider.logoUrl"
						:alt="provider.label"
						class="size-5 object-contain"
					/>
					<UIcon v-else :name="provider.icon" class="size-5" />
				</template>
				{{ t('auth.providers.signInWith', { provider: provider.label }) }}
			</UButton>
		</div>

		<div
			v-else
			class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
		>
			<p>
				{{ t('auth.providers.placeholder') }}
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
interface OAuthProviderSummary {
	provider: string
	label: string
	icon: string
	logoUrl?: string
	configured: boolean
}

interface OAuthProvidersResponse {
	providers: OAuthProviderSummary[]
}

const { locale, t } = useI18n()
const route = useRoute()

const { data } = await useFetch<OAuthProvidersResponse>(
	'/api/auth/oauth/providers',
	{
		default: () => ({ providers: [] }),
	},
)

const configuredProviders = computed(() =>
	(data.value?.providers ?? []).filter((provider) => provider.configured),
)

const getProviderHref = (provider: string): string => {
	const params = new URLSearchParams({ locale: locale.value })
	const redirectTo =
		typeof route.query.redirect === 'string' ? route.query.redirect : null

	if (redirectTo) {
		params.set('redirectTo', redirectTo)
	}

	return `/api/auth/oauth/${provider.toLowerCase()}?${params.toString()}`
}
</script>
