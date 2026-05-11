<?php
/**
 * Plugin Name: Frontend Block Editor
 * Plugin URI:  https://github.com/tpaksu/frontend-block-editor
 * Description: Edit your WordPress content directly on the frontend. Click any block, edit it inline, save without leaving the page.
 * Version:     0.1.4
 * Author:      Taha Paksu
 * Author URI:  https://github.com/tpaksu
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: frontend-block-editor
 * Requires at least: 6.4
 * Requires PHP: 7.4
 *
 * @package Frontend_Block_Editor
 */

defined( 'ABSPATH' ) || exit;

define( 'FBEDIT_VERSION', '0.1.4' );
define( 'FBEDIT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'FBEDIT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once FBEDIT_PLUGIN_DIR . 'includes/class-frontend-block-editor.php';

add_action(
	'plugins_loaded',
	static function () {
		( new Frontend_Block_Editor() )->init();
	}
);
