<template>
	<div class="-mt-2">
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.users.title') }}
				</h1>
				<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{{ t('admin.users.description') }}
				</p>
			</div>
		</div>

		<div
			class="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
		>
			{{ t('admin.users.placeholder') }}
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})
</script>
