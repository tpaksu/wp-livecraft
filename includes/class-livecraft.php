<?php
/**
 * Livecraft main plugin class.
 *
 * Handles asset enqueueing and content area wrapping for inline editing.
 *
 * @package Livecraft
 */

defined( 'ABSPATH' ) || exit;

/**
 * Main Livecraft plugin class.
 *
 * Registers hooks for frontend inline editing.
 */
class Livecraft {

	/**
	 * Whether the current request should be instrumented.
	 *
	 * @var bool
	 */
	private static $should_instrument = false;

	/**
	 * Initialize all hooks.
	 */
	public static function init() {
		add_action( 'template_redirect', array( __CLASS__, 'maybe_enable' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_filter( 'the_title', array( __CLASS__, 'wrap_title' ), 10, 2 );
		add_filter( 'the_content', array( __CLASS__, 'wrap_content' ), 999 );
		add_action( 'wp_footer', array( __CLASS__, 'render_mount_point' ) );
		add_filter( 'body_class', array( __CLASS__, 'add_body_class' ) );
	}

	/**
	 * Determine early whether to instrument the current request.
	 */
	public static function maybe_enable() {
		if ( is_admin() ) {
			return;
		}
		if ( ! is_user_logged_in() || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		if ( ! is_singular( array( 'post', 'page' ) ) ) {
			return;
		}

		self::$should_instrument = true;
	}

	/**
	 * Enqueue frontend scripts and styles for authorized users.
	 */
	public static function enqueue_assets() {
		if ( ! self::$should_instrument ) {
			return;
		}

		$asset_file = LIVECRAFT_PLUGIN_DIR . 'build/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'wp-livecraft-editor',
			LIVECRAFT_PLUGIN_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_script( 'wp-format-library' );

		// Load the WordPress media modal so image/media blocks can use the Media Library.
		wp_enqueue_media();

		// Fire enqueue_block_editor_assets so plugin blocks (WooCommerce, etc.)
		// register their editor scripts on the frontend too.
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WordPress core hook.
		do_action( 'enqueue_block_editor_assets' );

		if ( file_exists( LIVECRAFT_PLUGIN_DIR . 'build/index.css' ) ) {
			wp_enqueue_style(
				'wp-livecraft-editor',
				LIVECRAFT_PLUGIN_URL . 'build/index.css',
				array(),
				$asset['version']
			);
		}

		// Set up wp-api-fetch nonce and root URL on the frontend.
		wp_add_inline_script(
			'wp-api-fetch',
			sprintf(
				'wp.apiFetch.use( wp.apiFetch.createNonceMiddleware( "%s" ) );',
				wp_create_nonce( 'wp_rest' )
			),
			'after'
		);

		wp_add_inline_script(
			'wp-api-fetch',
			sprintf(
				'wp.apiFetch.use( wp.apiFetch.createRootURLMiddleware( "%s" ) );',
				esc_url_raw( rest_url() )
			),
			'after'
		);

		// Collect editor style URLs for dynamic loading when edit mode activates.
		$editor_style_urls = self::get_editor_style_urls();

		// Get theme editor styles (from theme.json, add_editor_style(), etc.)
		// so blocks in the inline editor match the theme's appearance.
		$theme_styles = self::get_theme_editor_styles();

		wp_add_inline_script(
			'wp-livecraft-editor',
			'var wpLivecraft = ' . wp_json_encode(
				array(
					'postId'       => get_the_ID(),
					'postType'     => get_post_type(),
					'canEdit'      => current_user_can( 'edit_post', get_the_ID() ),
					'siteUrl'      => home_url(),
					'editorStyles' => $editor_style_urls,
					'themeStyles'  => $theme_styles,
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Get registered editor style URLs for dynamic loading.
	 *
	 * @return array Associative array of handle => URL.
	 */
	private static function get_editor_style_urls() {
		// Only load editor UI styles (toolbars, popovers, selection).
		// Do NOT load wp-edit-blocks or wp-block-library: the theme's existing
		// frontend styles already handle block appearance, and editor styles
		// would override them (breaking quote borders, spacing, etc.).
		$handles = array( 'wp-components', 'wp-block-editor', 'wp-format-library' );
		$urls    = array();

		foreach ( $handles as $handle ) {
			if ( isset( wp_styles()->registered[ $handle ] ) ) {
				$style = wp_styles()->registered[ $handle ];
				$src   = $style->src;
				if ( ! empty( $style->ver ) ) {
					$src = add_query_arg( 'ver', $style->ver, $src );
				}
				$urls[ $handle ] = $src;
			}
		}

		return $urls;
	}

	/**
	 * Get theme editor styles from WordPress block editor settings.
	 *
	 * Uses get_block_editor_settings() to extract the same styles that the
	 * admin block editor uses, including theme.json styles, add_editor_style()
	 * stylesheets, and global styles.
	 *
	 * @return array Array of style objects ({ css: string } or { css: string, baseURL: string }).
	 */
	private static function get_theme_editor_styles() {
		$post    = get_post();
		$context = new WP_Block_Editor_Context( array( 'post' => $post ) );

		$settings = get_block_editor_settings(
			array(),
			$context
		);

		return $settings['styles'] ?? array();
	}

	/**
	 * Wrap the main post title so JS can make it editable.
	 *
	 * Only wraps the title when rendering the main queried post in the loop
	 * (avoids wrapping titles in menus, widgets, etc.).
	 *
	 * @param string $title   The post title.
	 * @param int    $post_id The post ID.
	 * @return string
	 */
	public static function wrap_title( $title, $post_id ) {
		if ( ! self::$should_instrument || ! in_the_loop() || ! is_singular() ) {
			return $title;
		}

		if ( (int) get_queried_object_id() !== (int) $post_id ) {
			return $title;
		}

		return sprintf(
			'<span id="livecraft-title" data-livecraft-post="%d">%s</span>',
			intval( $post_id ),
			$title
		);
	}

	/**
	 * Wrap the post content in a container div for JS to target.
	 *
	 * @param string $content The rendered post content.
	 * @return string
	 */
	public static function wrap_content( $content ) {
		if ( ! self::$should_instrument ) {
			return $content;
		}

		$post_id   = get_the_ID();
		$post_type = get_post_type();

		return sprintf(
			'<div id="livecraft-content" data-livecraft-post="%d" data-livecraft-post-type="%s">%s</div>',
			intval( $post_id ),
			esc_attr( $post_type ),
			$content
		);
	}

	/**
	 * Output the React mount point in the footer.
	 */
	public static function render_mount_point() {
		if ( ! self::$should_instrument ) {
			return;
		}

		echo '<div id="wp-livecraft-root"></div>';
	}

	/**
	 * Add body class when Livecraft is active.
	 *
	 * @param array $classes Existing body classes.
	 * @return array
	 */
	public static function add_body_class( $classes ) {
		if ( self::$should_instrument ) {
			$classes[] = 'livecraft-enabled';
		}
		return $classes;
	}
}
