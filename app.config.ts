export default defineAppConfig({
	ui: {
		colors: {
			primary: 'primary',
			secondary: 'primary',
			info: 'primary',
			neutral: 'slate',
			success: 'success',
			warning: 'warning',
			error: 'danger',
		},
		input: {
			variants: {
				size: {
					md: {
						base: 'px-2.5 py-1.5 text-sm/5 gap-1.5',
					},
					lg: {
						base: 'px-3 py-2 text-sm/5 gap-2',
					},
					xl: {
						base: 'px-3 py-2 text-sm/5 gap-2',
					},
				},
			},
		},
		textarea: {
			variants: {
				size: {
					md: {
						base: 'px-2.5 py-1.5 text-sm/5 gap-1.5',
					},
					lg: {
						base: 'px-3 py-2 text-sm/5 gap-2',
					},
					xl: {
						base: 'px-3 py-2 text-sm/5 gap-2',
					},
				},
			},
		},
	},
})
