<script setup lang="ts">
const localePath = useLocalePath()

await navigateTo(localePath('/server/overview'), { redirectCode: 301 })
</script>
