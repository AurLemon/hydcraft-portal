<template>
	<main class="mx-auto flex-1 h-full flex max-w-xl items-center px-4 py-10">
		<section
			class="w-full rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
		>
			<h1 class="text-xl font-semibold text-slate-950 dark:text-white">
				{{ t('oauthConsent.title') }}
			</h1>
			<p class="mt-3 text-slate-600 dark:text-slate-300">
				{{ t('oauthConsent.description', { client: clientName }) }}
			</p>
			<ul class="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
				<li v-for="scope in scopes" :key="scope">
					{{ t(`oauthConsent.scopes.${scope}`) }}
				</li>
			</ul>
			<div class="mt-7 flex justify-end gap-3">
				<UButton
					color="neutral"
					variant="ghost"
					:loading="pending"
					@click="submit(false)"
				>
					{{ t('oauthConsent.deny') }}
				</UButton>
				<UButton :loading="pending" @click="submit(true)">
					{{ t('oauthConsent.approve') }}
				</UButton>
			</div>
		</section>
	</main>
</template>

<script setup lang="ts">
import { useExplicitRouteTitle } from '~/utils/layout/route-display'

definePageMeta({ middleware: 'portal-auth' })

const { t } = useI18n()
const route = useRoute()
const pending = ref(false)
const pageTitle = computed(() => t('oauthConsent.pageTitle'))
const clientName = computed(() => String(route.query.client_name ?? 'HydCraft'))
const scopes = computed(() =>
	String(route.query.scope ?? 'profile')
		.split(' ')
		.filter(Boolean),
)

useExplicitRouteTitle(pageTitle)

const submit = async (approved: boolean) => {
	pending.value = true
	try {
		const result = await $fetch<{ redirectUri: string }>(
			'/api/oauth/authorize/approve',
			{
				method: 'POST',
				body: {
					client_id: route.query.client_id,
					redirect_uri: route.query.redirect_uri,
					scope: route.query.scope,
					state: route.query.state,
					code_challenge: route.query.code_challenge,
					code_challenge_method: route.query.code_challenge_method,
					consent_nonce: route.query.consent_nonce,
					approved,
				},
			},
		)
		await navigateTo(result.redirectUri, { external: true })
	} finally {
		pending.value = false
	}
}
</script>
