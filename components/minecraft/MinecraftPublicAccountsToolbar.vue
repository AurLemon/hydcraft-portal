<template>
	<div
		v-if="accounts.length"
		class="ml-1 md:ml-0 flex flex-wrap items-center justify-start gap-2"
	>
		<UTooltip
			v-for="account in accounts"
			:key="account.id"
			:text="resolveDisplayName(account)"
		>
			<NuxtLink
				v-if="resolvePlayerHref(account)"
				:to="resolvePlayerHref(account)"
				class="block size-6 shrink-0 rounded-md transition-opacity hover:opacity-70"
				:aria-label="resolveDisplayName(account)"
			>
				<SkeletonImage
					:src="resolveAvatarUrl(account)"
					:alt="resolveDisplayName(account)"
					class="size-6 select-none"
					skeleton-class="rounded-md"
					:image-class="avatarClass"
				/>
			</NuxtLink>
			<div v-else class="size-6 shrink-0 rounded-md">
				<SkeletonImage
					:src="resolveAvatarUrl(account)"
					:alt="resolveDisplayName(account)"
					class="size-6 select-none"
					skeleton-class="rounded-md"
					:image-class="avatarClass"
				/>
			</div>
		</UTooltip>
	</div>
</template>

<script setup lang="ts">
import SkeletonImage from '~/components/common/SkeletonImage.vue'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type { MinecraftAccountForm } from '~/utils/minecraft/accounts'

interface MinecraftPublicAccountsToolbarProps {
	accounts: MinecraftAccountForm[]
}

const props = defineProps<MinecraftPublicAccountsToolbarProps>()
const localePath = useLocalePath()

const resolveDisplayName = (account: MinecraftAccountForm): string =>
	account.playerIdentity.playerId || account.username

const resolvePlayerHref = (account: MinecraftAccountForm): string => {
	const mcid = account.playerIdentity.playerId?.trim()

	return mcid ? localePath(`/players/${mcid}`) : ''
}

const resolveAvatarUrl = (account: MinecraftAccountForm): string =>
	getMinecraftHeadRendererUrl(account.uuid ?? account.username)

const avatarClass =
	'size-6 rounded-md object-cover drop-shadow-sm opacity-100 saturate-[1.05]'
</script>
