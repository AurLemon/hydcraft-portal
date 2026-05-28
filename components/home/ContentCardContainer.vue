<template>
	<div v-if="show" class="hydstart-content-card-wrapper">
		<div class="hydstart-content-card">
			<div class="hydstart-content-card-foreground">
				<div class="hydstart-content-card-foreground-wrapper">
					<button class="hydstart-content-card-close" @click="closeCard">
						<span class="material-icons">close</span>
					</button>
					<div class="hydstart-content-card-title"><slot name="title" /></div>
					<div class="hydstart-content-card-content"><slot /></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ show?: boolean }>(), { show: false })
const emit = defineEmits<{ closeCard: [] }>()
const closeCard = () => setTimeout(() => emit('closeCard'), 50)
</script>

<style scoped>
.hydstart-content-card-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: all 600ms ease;
}
.hydstart-content-card-wrapper .hydstart-content-card {
	display: flex;
	width: 800px;
	min-height: 45vh;
	padding: 24px;
	border-radius: 24px;
	overflow: hidden;
	position: relative;
	z-index: 40;
	transition: all 600ms ease;
}
.hydstart-content-card-wrapper .hydstart-content-card-foreground {
	position: absolute;
	inset: 0;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper {
	display: flex;
	flex-direction: column;
	font-size: 18px;
	width: 100%;
	height: 100%;
	padding: 28px;
	overflow-y: auto;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close {
	display: block;
	position: absolute;
	top: 21px;
	right: 21px;
	z-index: 40;
	padding: 0;
	border: none;
	outline: none;
	background-color: transparent;
	transition: all 600ms ease;
	cursor: pointer;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close
	.material-icons {
	display: block;
	color: var(--color-text--subtle);
	font-size: 36px;
	transition: all 600ms ease;
	position: relative;
	z-index: 20;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:hover {
	transform: rotate(-30deg);
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:hover
	.material-icons {
	color: var(--color-hydcraft-red);
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:hover::after {
	opacity: 1;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:active {
	transform: rotate(-30deg) scale(0.8);
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:active
	.material-icons {
	opacity: 0.7;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close:active::after {
	opacity: 1;
}
.hydstart-content-card-wrapper
	.hydstart-content-card-foreground
	.hydstart-content-card-foreground-wrapper
	.hydstart-content-card-close::after {
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
	transition: all 600ms ease;
}
.hydstart-content-card-wrapper .hydstart-content-card-title {
	font-size: 28px;
	font-family: 'Site Wordmark Font';
	margin-bottom: 12px;
}
.hydstart-content-card-wrapper .hydstart-content-card-content {
	flex: 1;
	filter: drop-shadow(0 2px 12px var(--background-dark-0));
}
</style>
