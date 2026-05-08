=== WP Livecraft ===
Contributors: tpaksu
Tags: editor, frontend editor, block editor, gutenberg, inline editing
Requires at least: 6.4
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Edit WordPress content directly on the frontend. Click any block, edit inline, and save without leaving the page.

== Description ==

WP Livecraft brings the WordPress block editor to the front of your site. Spot a typo, click the block, fix it, and it saves. No admin trip, no context switch.

You see your content the way visitors see it, with your theme's typography, colors, and layout already applied. The same blocks and toolbar you know from the admin editor work right on the page.

**Highlights**

* **Edit where you read.** Click any block on the page and start typing. Your theme styles render live.
* **Auto-save as you type.** Changes are saved automatically after you stop typing, with a manual save button when you want it.
* **Publish and unpublish with guardrails.** Confirmation dialogs before publishing or switching to draft, so nothing goes live by accident.
* **Create new posts and pages without leaving the site.** Hit the "+" button, pick post or page, and start writing immediately.
* **Undo and redo.** Cmd+Z / Ctrl+Z works the way you expect, with Shift for redo.
* **Works with your theme.** What you edit is what visitors see.
* **Works with other plugins.** WooCommerce blocks, custom blocks, anything that registers with the block editor shows up automatically.
* **Tiny footprint.** Around 16 KB of custom JavaScript on top of what WordPress already ships.

**Source code**

Development happens on GitHub: https://github.com/tpaksu/wp-livecraft

== Installation ==

1. Upload the plugin to `/wp-content/plugins/wp-livecraft`, or install it through the **Plugins** screen in WordPress.
2. Activate the plugin through the **Plugins** screen.
3. Visit any post or page on your site while logged in as a user who can edit it. A toolbar appears at the bottom right.
4. Click **Edit Post** (or **Edit Page**) and start editing.

You can also jump straight into edit mode by appending `#wp-livecraft-edit` to any post URL.

== Frequently Asked Questions ==

= Who can edit content with this plugin? =

Any user who already has permission to edit the post or page in the WordPress admin. WP Livecraft uses WordPress's built-in capability checks. It does not grant new permissions.

= Does it work with my theme? =

Yes. The editor inherits your theme's frontend styles, so what you edit matches what visitors see.

= Does it work with custom blocks and plugins like WooCommerce? =

Yes. Anything registered with the WordPress block editor is available in WP Livecraft.

= What WordPress and PHP versions are required? =

WordPress 6.4 or newer and PHP 7.4 or newer.

= Where do I report issues or request features? =

Open an issue at https://github.com/tpaksu/wp-livecraft/issues.

== Screenshots ==

1. Click any block on the page and start editing inline.
2. The block toolbar and inspector are available right on the frontend.
3. Create new posts or pages without leaving the site.

== Changelog ==

= 0.1.1 =
* Rename internal class to `WP_Livecraft` and convert to instance-based.
* Ship build output in the repository so the plugin runs from a clone without an install step.

= 0.1.0 =
* Initial release: frontend block editing, autosave, publish and unpublish guardrails, frontend post/page creation, undo/redo, admin bar styling.

== Upgrade Notice ==

= 0.1.1 =
Internal refactor and bundled build output. No breaking changes.
