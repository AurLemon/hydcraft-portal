declare global {
	interface Window {
		_hmt: unknown[]
	}
}

export default defineNuxtPlugin(() => {
	if (import.meta.dev) {
		return
	}

	const baiduStatKey = String(useRuntimeConfig().public.baiduStatKey || '')

	if (!baiduStatKey) {
		return
	}

	window._hmt = window._hmt || []
	const script = document.createElement('script')
	script.src = `https://hm.baidu.com/hm.js?${baiduStatKey}`
	script.async = true
	const firstScript = document.getElementsByTagName('script')[0]

	if (firstScript?.parentNode) {
		firstScript.parentNode.insertBefore(script, firstScript)
		return
	}

	document.head.appendChild(script)
})
