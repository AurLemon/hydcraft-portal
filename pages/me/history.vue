<script setup lang="ts">
definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

const localePath = useLocalePath()

await navigateTo(localePath('/me/minecraft'), {
	redirectCode: 301,
	replace: true,
})
</script>
