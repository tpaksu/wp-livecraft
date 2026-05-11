=== Frontend Block Editor ===
Contributors: tpaksu
Tags: editor, frontend editor, block editor, gutenberg, inline editing
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.1.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Edit WordPress content directly on the frontend. Click any block, edit inline, and save without leaving the page.

== Description ==

Frontend Block Editor renders the WordPress block editor on the front of your site. Spot a typo, click the block, fix it, and it saves. No admin trip, no context switch.

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

Development happens on GitHub: https://github.com/tpaksu/frontend-block-editor

== Installation ==

1. Upload the plugin to `/wp-content/plugins/frontend-block-editor`, or install it through the **Plugins** screen in WordPress.
2. Activate the plugin through the **Plugins** screen.
3. Visit any post or page on your site while logged in as a user who can edit it. A toolbar appears at the bottom right.
4. Click **Edit Post** (or **Edit Page**) and start editing.

You can also jump straight into edit mode by appending `#fbedit-edit` to any post URL.

== Frequently Asked Questions ==

= Who can edit content with this plugin? =

Any user who already has permission to edit the post or page in the WordPress admin. Frontend Block Editor uses WordPress's built-in capability checks. It does not grant new permissions.

= Does it work with my theme? =

Yes. The editor inherits your theme's frontend styles, so what you edit matches what visitors see.

= Does it work with custom blocks and plugins like WooCommerce? =

Yes. Anything registered with the WordPress block editor is available in Frontend Block Editor.

= What WordPress and PHP versions are required? =

WordPress 6.4 or newer and PHP 7.4 or newer.

= Where do I report issues or request features? =

Open an issue at https://github.com/tpaksu/frontend-block-editor/issues.

== Screenshots ==

1. Click any block on the page and start editing inline.
2. The block toolbar and inspector are available right on the frontend.
3. Create new posts or pages without leaving the site.

== Changelog ==

= 0.1.4 =
* Rename plugin to "Frontend Block Editor" (slug `frontend-block-editor`, text domain `frontend-block-editor`, PHP class `Frontend_Block_Editor`, internal prefix `fbedit`). The previous name was declined at WordPress.org review as a possible brand conflict; the new name is descriptive of what the plugin does.

= 0.1.3 =
* First release prepared for the WordPress.org plugin directory: adds `readme.txt`, plugin icons, and bumps "Tested up to" to 6.9.

= 0.1.1 =
* Refactor main plugin class to be instance-based.
* Ship build output in the repository so the plugin runs from a clone without an install step.

= 0.1.0 =
* Initial release: frontend block editing, autosave, publish and unpublish guardrails, frontend post/page creation, undo/redo, admin bar styling.

== Upgrade Notice ==

= 0.1.4 =
Plugin renamed to "Frontend Block Editor". Slug, text domain, and the old `livecraft-*` selectors became `frontend-block-editor` / `fbedit-*`. Update any custom CSS or JS targeting the old prefixes, then deactivate and reactivate.
