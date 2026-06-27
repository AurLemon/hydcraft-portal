<template>
	<ClientOnly>
		<IntroParticipationMapClient />
		<template #fallback>
			<div
				class="relative isolate h-104 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-120"
				aria-hidden="true"
			>
				<USkeleton class="h-full w-full rounded-xl" />
			</div>
		</template>
	</ClientOnly>
</template>
