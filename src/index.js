import { createRoot } from '@wordpress/element';
import { registerCoreBlocks } from '@wordpress/block-library';
import domReady from '@wordpress/dom-ready';
import App from './components/App';
import './styles/editor.scss';

domReady( () => {
	registerCoreBlocks();

	const root = document.getElementById( 'wp-livecraft-root' );
	if ( root ) {
		createRoot( root ).render( <App /> );
	}
} );
