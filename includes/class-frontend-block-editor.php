<?php
/**
 * Frontend Block Editor main plugin class.
 *
 * Handles asset enqueueing and content area wrapping for inline editing.
 *
 * @package Frontend_Block_Editor
 */

defined( 'ABSPATH' ) || exit;

/**
 * Main Frontend Block Editor plugin class.
 *
 * Registers hooks for frontend inline editing.
 */
class Frontend_Block_Editor {

	/**
	 * Whether the current request should be instrumented.
	 *
	 * @var bool
	 */
	private $should_instrument = false;

	/**
	 * Initialize all hooks.
	 */
	public function init() {
		add_action( 'template_redirect', array( $this, 'maybe_enable' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'the_title', array( $this, 'wrap_title' ), 10, 2 );
		add_filter( 'the_content', array( $this, 'wrap_content' ), 999 );
		add_action( 'wp_footer', array( $this, 'render_mount_point' ) );
		add_filter( 'body_class', array( $this, 'add_body_class' ) );
	}

	/**
	 * Determine early whether to instrument the current request.
	 */
	public function maybe_enable() {
		if ( is_admin() ) {
			return;
		}
		if ( ! is_user_logged_in() || ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		if ( ! is_singular( array( 'post', 'page' ) ) ) {
			return;
		}

		$this->should_instrument = true;
	}

	/**
	 * Enqueue frontend scripts and styles for authorized users.
	 */
	public function enqueue_assets() {
		if ( ! $this->should_instrument ) {
			return;
		}

		$asset_file = FBEDIT_PLUGIN_DIR . 'build/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'fbedit-editor',
			FBEDIT_PLUGIN_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_script( 'wp-format-library' );

		// Load the WordPress media modal so image/media blocks can use the Media Library.
		wp_enqueue_media();

		// Get block editor settings (theme styles, block categories, etc.)
		// so the inline editor matches the admin editor's configuration.
		$editor_settings = $this->get_editor_settings();

		// Set block categories on wp-blocks BEFORE any block editor scripts run.
		// This prevents "invalid category" warnings from plugins like WooCommerce
		// that register blocks with custom categories.
		$block_categories = $editor_settings['blockCategories'] ?? array();
		wp_add_inline_script(
			'wp-blocks',
			'wp.blocks.setCategories(' . wp_json_encode( $block_categories ) . ');',
			'after'
		);

		// Enqueue only editor scripts for all registered block types.
		// We skip editor_style_handles here because those stylesheets contain
		// global rules (font-size, etc.) that override the active theme.
		// Editor UI styles are loaded dynamically via JS when edit mode activates.
		$block_registry = WP_Block_Type_Registry::get_instance();
		foreach ( $block_registry->get_all_registered() as $block_type ) {
			foreach ( $block_type->editor_script_handles as $handle ) {
				wp_enqueue_script( $handle );
			}
		}

		// Fire enqueue_block_editor_assets so plugin blocks (WooCommerce, etc.)
		// register their editor scripts on the frontend too.
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WordPress core hook.
		do_action( 'enqueue_block_editor_assets' );

		if ( file_exists( FBEDIT_PLUGIN_DIR . 'build/index.css' ) ) {
			wp_enqueue_style(
				'fbedit-editor',
				FBEDIT_PLUGIN_URL . 'build/index.css',
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
		$editor_style_urls = $this->get_editor_style_urls();

		wp_add_inline_script(
			'fbedit-editor',
			'var frontend-block-editor = ' . wp_json_encode(
				array(
					'postId'       => get_the_ID(),
					'postType'     => get_post_type(),
					'canEdit'      => current_user_can( 'edit_post', get_the_ID() ),
					'siteUrl'      => home_url(),
					'editorStyles' => $editor_style_urls,
					'themeStyles'  => $editor_settings['styles'] ?? array(),
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
	private function get_editor_style_urls() {
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
	 * Get block editor settings for the current post.
	 *
	 * Returns the full settings array from get_block_editor_settings(),
	 * which includes theme styles, block categories, and other config
	 * that the admin block editor uses.
	 *
	 * @return array Block editor settings.
	 */
	private function get_editor_settings() {
		$post    = get_post();
		$context = new WP_Block_Editor_Context( array( 'post' => $post ) );

		return get_block_editor_settings( array(), $context );
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
	public function wrap_title( $title, $post_id ) {
		if ( ! $this->should_instrument || ! in_the_loop() || ! is_singular() ) {
			return $title;
		}

		if ( (int) get_queried_object_id() !== (int) $post_id ) {
			return $title;
		}

		return sprintf(
			'<span id="fbedit-title" data-fbedit-post="%d">%s</span>',
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
	public function wrap_content( $content ) {
		if ( ! $this->should_instrument ) {
			return $content;
		}

		$post_id   = get_the_ID();
		$post_type = get_post_type();

		return sprintf(
			'<div id="fbedit-content" data-fbedit-post="%d" data-fbedit-post-type="%s">%s</div>',
			intval( $post_id ),
			esc_attr( $post_type ),
			$content
		);
	}

	/**
	 * Output the React mount point in the footer.
	 */
	public function render_mount_point() {
		if ( ! $this->should_instrument ) {
			return;
		}

		echo '<div id="fbedit-root"></div>';
	}

	/**
	 * Add body class when Frontend Block Editor is active.
	 *
	 * @param array $classes Existing body classes.
	 * @return array
	 */
	public function add_body_class( $classes ) {
		if ( $this->should_instrument ) {
			$classes[] = 'fbedit-enabled';
		}
		return $classes;
	}
}
