<template>
	<header>
		<div class="hydstart-header">
			<div class="hydstart-header-wordmark">
				<div class="hydstart-header-title">
					<span class="hydstart-header-title-wrapper">
						<span class="hydstart-header-logo" />HydCraft World
					</span>
				</div>
			</div>
			<ul class="hydstart-header-router">
				<li
					v-for="route in routes"
					:key="route.to"
					class="hydstart-header-route"
				>
					<NuxtLink :to="route.to">{{ route.label }}</NuxtLink>
				</li>
			</ul>
			<ul class="hydstart-header-link">
				<li class="hydstart-header-link__comment">
					<UIcon name="i-lucide-ear" class="hydstart-header-link__icon" />
				</li>
				<li class="hydstart-header-link__dashboard">
					<UIcon
						name="i-lucide-layout-dashboard"
						class="hydstart-header-link__icon"
					/>
				</li>
				<li class="hydstart-header-link__help">
					<UIcon
						name="i-lucide-circle-help"
						class="hydstart-header-link__icon"
					/>
				</li>
				<li class="hydstart-header-link__more">
					<UIcon
						name="i-lucide-ellipsis-vertical"
						class="hydstart-header-link__icon"
					/>
				</li>
			</ul>
		</div>
	</header>
</template>

<script setup lang="ts">
interface HeaderRoute {
	to: string
	label: string
}

const routes: HeaderRoute[] = [
	{ to: '/', label: '入口' },
	{ to: '/', label: '故事' },
	{ to: '/', label: '概览' },
	{ to: '/', label: '关于' },
]
</script>

<style scoped>
header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: var(--background-light-3);
	border-bottom: 1px solid var(--background-dark-0);
	backdrop-filter: saturate(125%) blur(32px);
}

.hydstart-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 60px;
	padding: 10px 6rem;
	margin: 0 auto;
}
.hydstart-header > [class^='hydstart-header-'] {
	flex: 1;
}

.hydstart-header-logo {
	display: flex;
	align-items: center;
}
.hydstart-header-logo::before,
.hydstart-header-logo::after {
	content: '';
	display: block;
	width: 24px;
	height: 4px;
}
.hydstart-header-logo::before {
	border-radius: 2px 0 0 2px;
	background: var(--color-hydcraft-red);
}
.hydstart-header-logo::after {
	border-radius: 0 2px 2px 0;
	background: var(--color-hydcraft-blue);
}

.hydstart-header-wordmark .hydstart-header-title {
	width: fit-content;
	position: relative;
	user-select: none;
	cursor: pointer;
	transition: all 300ms ease;
}
.hydstart-header-wordmark
	.hydstart-header-title:hover
	.hydstart-header-title-wrapper {
	color: var(--color-surface-0);
}
.hydstart-header-wordmark .hydstart-header-title:hover::after {
	opacity: 1;
}
.hydstart-header-wordmark .hydstart-header-title:active {
	transform: scale(0.98);
}
.hydstart-header-wordmark .hydstart-header-title:active::after {
	opacity: 1;
	background-color: var(--color-primary--active);
}
.hydstart-header-wordmark .hydstart-header-title::after {
	content: '';
	background-color: var(--color-primary);
	border-radius: 32px;
	position: absolute;
	z-index: 8;
	top: -12px;
	left: -12px;
	right: -12px;
	bottom: -12px;
	opacity: 0;
	transition: all 300ms ease;
}
.hydstart-header-wordmark
	.hydstart-header-title
	.hydstart-header-title-wrapper {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-size: 18px;
	font-family: 'Site Wordmark Font';
	text-transform: uppercase;
	position: relative;
	z-index: 10;
	transition: color 300ms ease;
}

.hydstart-header-link {
	justify-content: flex-end;
	position: relative;
}
.hydstart-header-link [class^='hydstart-header-link__'] {
	display: block;
	color: var(--color-text--subtle);
	cursor: pointer;
	user-select: none;
	position: relative;
	transition: transform 150ms ease;
}
.hydstart-header-link [class^='hydstart-header-link__']:hover {
	transform: scale(1.02);
}
.hydstart-header-link [class^='hydstart-header-link__']:hover::after {
	opacity: 1;
	transform: scale(1.2);
}
.hydstart-header-link [class^='hydstart-header-link__']:active {
	transform: scale(0.98);
	transition-duration: 80ms;
}
.hydstart-header-link [class^='hydstart-header-link__']:active::after {
	opacity: 1;
	transform: scale(1.1);
	transition-duration: 80ms;
}
.hydstart-header-link [class^='hydstart-header-link__']::after {
	content: '';
	background-color: var(--background-dark-0);
	border-radius: 50%;
	position: absolute;
	top: -5px;
	left: -5px;
	right: -5px;
	bottom: -5px;
	z-index: 0;
	opacity: 0;
	transition: all 150ms ease;
}
.hydstart-header-link
	[class^='hydstart-header-link__']
	.hydstart-header-link__icon {
	display: block;
	width: 24px;
	height: 24px;
	position: relative;
	z-index: 10;
}

.hydstart-header-router {
	justify-content: center;
}
.hydstart-header-router .hydstart-header-route a {
	display: block;
	color: var(--color-text--weaken);
	text-decoration: none;
	position: relative;
	z-index: 10;
	user-select: none;
	cursor: pointer;
	transition: all 150ms ease;
}
.hydstart-header-router .hydstart-header-route a:hover {
	color: var(--background-dark-1);
	text-shadow: 0 0 6px var(--color-primary);
}
.hydstart-header-router .hydstart-header-route a:hover::after {
	opacity: 1;
	transform: translateY(0) scale(1);
}
.hydstart-header-router .hydstart-header-route a:active {
	transform: scale(0.94);
}
.hydstart-header-router .hydstart-header-route a:active::after {
	opacity: 1;
}
.hydstart-header-router .hydstart-header-route a::after {
	content: '';
	background-color: var(--color-surface-4);
	border-radius: 4px;
	position: absolute;
	top: calc(100% + 2px);
	left: -3px;
	right: -3px;
	height: 2px;
	z-index: 8;
	opacity: 0;
	transition: all 150ms ease;
	transform: translateY(2px) scale(0.9);
}
.hydstart-header-router .hydstart-header-route a.router-link-exact-active {
	color: var(--color-text--subtle);
	font-weight: 600;
}
.hydstart-header-router
	.hydstart-header-route
	a.router-link-exact-active::after {
	background-color: var(--color-primary);
}
.hydstart-header-router
	.hydstart-header-route
	a.router-link-exact-active:hover {
	text-shadow: 0 0 6px var(--background-dark-2);
}

.hydstart-header-router,
.hydstart-header-link {
	margin: 0;
	padding: 0;
	list-style-type: none;
	display: flex;
	align-items: center;
	gap: 12px;
}
</style>
