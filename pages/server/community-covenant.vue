<template>
	<div class="site-shell flex flex-col items-center pt-10">
		<MarkdownPage
			body-class="[&_p]:font-serif [&_p]:font-medium [&_p]:text-slate-900 [&_p]:dark:text-slate-100"
		>
			<template #header="{ doc }">
				<div class="mb-6 w-full">
					<div
						class="mx-auto flex w-full max-w-3xl flex-col items-center gap-2"
					>
						<div
							class="text-4xl text-center font-arkpixel tracking-wider uppercase text-slate-950 dark:text-slate-50"
						>
							{{ t('content.communityCovenant.title') }}
						</div>
						<ContentReadingStats :doc="doc" />
					</div>
				</div>
			</template>
			<template #footer="{ doc }">
				<DocumentApprovalCard
					approved-at="2026-06-26T16:18:00+08:00"
					:edition="1"
					:approve-count="7"
					:veto-count="0"
					:abstain-count="0"
				/>
				<ContentUpdatedAt :doc="doc" class="mt-6!" />
			</template>
		</MarkdownPage>
	</div>
</template>
