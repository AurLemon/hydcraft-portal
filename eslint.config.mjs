import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
	ignores: ['.nuxt/**', '.output/**', 'node_modules/**'],
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unused-vars': 'warn',
		'no-shadow-restricted-names': 'off',
		'vue/attribute-hyphenation': 'off',
		'vue/attributes-order': 'off',
		'vue/no-use-v-if-with-v-for': 'warn',
		'vue/require-v-for-key': 'warn',
		'vue/html-self-closing': [
			'warn',
			{
				html: {
					void: 'any',
					normal: 'always',
					component: 'always',
				},
				svg: 'always',
				math: 'always',
			},
		],
	},
})
