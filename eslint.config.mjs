import withNuxt from './.nuxt/eslint.config.mjs'
import { globalIgnores } from 'eslint/config'

export default withNuxt(
	globalIgnores([
		'.nuxt/**',
		'.output/**',
		'node_modules/**',
		'vendor/bluemap-webapp/**',
	]),
	{
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
	},
)
