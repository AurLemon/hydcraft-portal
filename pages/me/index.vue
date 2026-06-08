<script setup lang="ts">
definePageMeta({
	middleware: 'portal-auth',
})

const localePath = useLocalePath()

await navigateTo(localePath('/me/profile'), { redirectCode: 301 })
</script>
