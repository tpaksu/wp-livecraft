# Livecraft

Edit your WordPress content directly on the frontend. Click any block, edit it inline, and save without leaving the page.

## Features

- **Inline block editing** on the frontend using the WordPress block editor
- **Auto-save** with debounced saving as you type
- **Title editing** directly on the rendered page
- **Publish/Draft workflow** with toolbar controls for publishing, saving drafts, and switching status
- **Create new content** (posts and pages) from the frontend toolbar
- **Media uploads** via the WordPress Media Library
- **Theme-aware** rendering using your theme's editor styles
- Works with any block-based theme on WordPress 6.4+

## Requirements

- WordPress 6.4 or later
- PHP 7.4 or later
- Node.js 18+ (for development)

## Installation

1. Clone this repository into your `wp-content/plugins` directory:

   ```bash
   git clone https://github.com/tpaksu/wp-livecraft.git
   cd wp-livecraft
   ```

2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. Activate the plugin in **WordPress Admin > Plugins**.

## Usage

Visit any post or page on the frontend while logged in as a user with `edit_posts` capability. A floating "Edit Page" button will appear. Click it to enter inline editing mode.

You can also link directly to edit mode by appending `#livecraft-edit` to any post URL.

## Development

```bash
# Start the development build with hot reload
npm run start

# Production build
npm run build

# Lint JavaScript
npm run lint:js

# Lint CSS/SCSS
npm run lint:css

# Lint PHP (WordPress Coding Standards)
composer install
npm run lint:php

# Auto-fix lint errors
npm run lint:js:fix
npm run lint:css:fix
npm run lint:php:fix

# Run all linters
npm run lint
```

## License

GPL-2.0-or-later
