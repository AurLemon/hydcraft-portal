<script setup lang="ts">
definePageMeta({
	middleware: 'portal-auth',
})

const localePath = useLocalePath()

await navigateTo(localePath('/me/minecraft'), { redirectCode: 301 })
</script>
