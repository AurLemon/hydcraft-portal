<template>
	<transition name="fade">
		<div v-show="true" class="hydstart-card-wrapper">
			<div class="hydstart-card">
				<div class="hydstart-card-foreground">
					<div class="hydstart-card-foreground-wrapper">
						<button class="hydstart-card-close" @click="closeCard">
							<UIcon name="i-lucide-x" class="hydstart-card-close__icon" />
						</button>
						<div class="hydstart-card-title"><slot name="title" /></div>
						<div class="hydstart-card-content"><slot /></div>
					</div>
				</div>
			</div>
		</div>
	</transition>
</template>

<script setup lang="ts">
const emit = defineEmits<{ closeCard: [] }>()
const closeCard = () => setTimeout(() => emit('closeCard'), 50)
</script>

<style scoped>
.hydstart-card-wrapper {
	display: flex;
	justify-content: center;
	position: absolute;
	top: 60px;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 80;
	padding: 4rem 10rem 8rem;
	backdrop-filter: blur(48px) saturate(0.6) brightness(0.95);
	transition:
		all 450ms ease,
		opacity 350ms ease,
		backdrop-filter 2000ms ease;
}
.hydstart-card-wrapper.fade-enter,
.hydstart-card-wrapper.fade-leave-to {
	backdrop-filter: blur(0) saturate(1) brightness(1);
	top: 30%;
	left: 30%;
	right: 30%;
	bottom: 30%;
	opacity: 0;
}
.hydstart-card-wrapper.fade-leave-to {
	transition:
		all 450ms ease,
		opacity 450ms ease,
		backdrop-filter 250ms ease;
}
.hydstart-card-wrapper .hydstart-card {
	width: 100%;
	height: 100%;
	min-height: 400px;
	border-radius: 24px;
	background: var(--color-surface-0);
	position: relative;
	opacity: 1;
	box-shadow: 0 8px 60px var(--background-dark-0);
	outline: 3px solid transparent;
	transition: outline 450ms ease;
	overflow: hidden;
}
.hydstart-card-wrapper .hydstart-card:hover {
	outline-color: var(--color-primary);
}
.hydstart-card-wrapper .hydstart-card-foreground {
	position: absolute;
	inset: 0;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper {
	display: flex;
	flex-direction: column;
	font-size: 18px;
	width: 100%;
	height: 100%;
	padding: 28px;
	overflow-y: auto;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close {
	display: block;
	position: absolute;
	top: 21px;
	right: 21px;
	padding: 0;
	border: none;
	outline: none;
	background-color: transparent;
	transition: all 300ms ease;
	cursor: pointer;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close
	.hydstart-card-close__icon {
	display: block;
	color: var(--color-text--subtle);
	width: 36px;
	height: 36px;
	transition: all 300ms ease;
	position: relative;
	z-index: 20;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:hover {
	transform: rotate(-30deg);
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:hover
	.hydstart-card-close__icon {
	color: var(--color-hydcraft-red);
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:hover::after {
	opacity: 1;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:active {
	transform: rotate(-30deg) scale(0.8);
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:active
	.hydstart-card-close__icon {
	opacity: 0.7;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close:active::after {
	opacity: 1;
}
.hydstart-card-wrapper
	.hydstart-card-foreground
	.hydstart-card-foreground-wrapper
	.hydstart-card-close::after {
	content: '';
	background-color: var(--background-dark-0);
	border-radius: 50%;
	backdrop-filter: blur(8px) saturate(1.25);
	position: absolute;
	z-index: 18;
	top: -4px;
	left: -4px;
	right: -4px;
	bottom: -4px;
	opacity: 0;
	transition: all 300ms ease;
}
.hydstart-card-wrapper .hydstart-card-title {
	margin-bottom: 12px;
}
.hydstart-card-wrapper .hydstart-card-content {
	flex: 1;
}
</style>
