module.exports = {
	env: {
		node: true,
		es6: true,
	},
	extends: 'eslint:recommended',
	files: ['.eslintrc.{js,cjs}'],
	globals: {
		process: true,
	},
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {},
}
