const defaultConfig = require( '@wordpress/scripts/config/.eslintrc' );

module.exports = {
	...defaultConfig,
	globals: {
		...( defaultConfig.globals || {} ),
		wp: 'readonly',
	},
};
