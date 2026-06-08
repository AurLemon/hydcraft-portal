<script setup lang="ts">
definePageMeta({
	middleware: 'admin-auth',
})

const localePath = useLocalePath()

await navigateTo(localePath('/admin/overview'), { redirectCode: 301 })
</script>
