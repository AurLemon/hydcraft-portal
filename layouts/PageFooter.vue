<template>
	<footer
		class="site-shell mx-auto w-full px-6 pb-6 text-[13px] text-slate-400/80 transition-colors duration-250 dark:text-slate-700"
	>
		<div class="flex flex-col items-center text-center">
			<div
				class="mb-2 text-[15px] text-slate-600"
				@mouseleave="hoveredInfoLink = null"
			>
				<template
					v-for="(link, index) in footerLinkGroups.resources"
					:key="link.labelKey"
				>
					<NuxtLink
						:to="link.to"
						:external="link.external"
						:target="link.external ? '_blank' : undefined"
						:rel="link.external ? 'noopener noreferrer' : undefined"
						:class="linkClass(index, hoveredInfoLink)"
						@mouseenter="hoveredInfoLink = index"
					>
						{{ t(link.labelKey) }}
					</NuxtLink>
					<span
						v-if="index < footerLinkGroups.resources.length - 1"
						class="mx-2 select-none"
						>·</span
					>
				</template>
			</div>

			<div @mouseleave="hoveredRecordLink = null" class="w-fit">
				<template
					v-for="(link, index) in footerLinkGroups.records"
					:key="link.labelKey"
				>
					<NuxtLink
						:to="link.to"
						:external="link.external"
						:target="link.external ? '_blank' : undefined"
						:rel="link.external ? 'noopener noreferrer' : undefined"
						:class="recordLinkClass(index, hoveredRecordLink)"
						@mouseenter="hoveredRecordLink = index"
					>
						{{ t(link.labelKey) }}
					</NuxtLink>
					<span v-if="index < footerLinkGroups.records.length - 1">&nbsp;</span>
				</template>
			</div>

			<div>
				{{ t('footer.disclaimers.community') }}
			</div>

			<div>
				{{ t('footer.disclaimers.trademark') }}
			</div>
			<div>{{ t('footer.copyright') }}</div>
		</div>
	</footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface FooterLink {
	labelKey: string
	to: string
	external?: boolean
}

interface FooterLinkGroups {
	resources: FooterLink[]
	records: FooterLink[]
}

const { t } = useGlobalI18n()
const footerLinkGroups: FooterLinkGroups = {
	resources: [
		{
			labelKey: 'footer.links.knowledgeBase',
			to: 'https://wiki.hydcraft.cn',
			external: true,
		},
		{
			labelKey: 'footer.links.docs',
			to: 'https://docs.hydcraft.cn',
			external: true,
		},
		{
			labelKey: 'footer.links.status',
			to: 'https://monitor.hydcraft.cn',
			external: true,
		},
	],
	records: [
		{
			labelKey: 'footer.records.icp',
			to: 'https://beian.miit.gov.cn/',
			external: true,
		},
		{
			labelKey: 'footer.records.police',
			to: 'https://www.beian.gov.cn/portal/registersysteminfo?recordcode=35010202001677',
			external: true,
		},
	],
}

const hoveredInfoLink = ref<number | null>(null)
const hoveredRecordLink = ref<number | null>(null)

const linkClass = (index: number, hoveredIndex: number | null) => [
	'transition-colors duration-200',
	hoveredIndex === null
		? 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
		: hoveredIndex === index
			? 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
			: 'text-slate-400 dark:text-slate-500',
]

const recordLinkClass = (index: number, hoveredIndex: number | null) => [
	'transition-colors duration-200',
	hoveredIndex === null
		? 'text-slate-400/80 dark:text-slate-700'
		: hoveredIndex === index
			? 'text-slate-400/80 dark:text-slate-700'
			: 'text-slate-400/55 dark:text-slate-700/60',
]
</script>
