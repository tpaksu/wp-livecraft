import {
	useState,
	useEffect,
	useRef,
	useCallback,
	forwardRef,
	useImperativeHandle,
	createPortal,
} from '@wordpress/element';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
} from '@wordpress/block-editor';
import { parse, serialize } from '@wordpress/blocks';
import { SlotFillProvider, Popover } from '@wordpress/components';
import { uploadMedia } from '@wordpress/media-utils';
import apiFetch from '@wordpress/api-fetch';
import { fetchPost } from '../utils/api';

const SAVE_DEBOUNCE_MS = 1500;

function loadEditorStyles() {
	const urls = window.wpLivecraft?.editorStyles || {};
	Object.entries( urls ).forEach( ( [ handle, url ] ) => {
		const id = `livecraft-dynamic-style-${ handle }`;
		if ( ! document.getElementById( id ) ) {
			const link = document.createElement( 'link' );
			link.id = id;
			link.rel = 'stylesheet';
			link.href = url;
			document.head.appendChild( link );
		}
	} );
}

function removeEditorStyles() {
	document
		.querySelectorAll( '[id^="livecraft-dynamic-style-"]' )
		.forEach( ( el ) => el.remove() );
}

function getRestBase( postType ) {
	return postType === 'page' ? 'pages' : 'posts';
}

const InlineEditor = forwardRef( function InlineEditor(
	{ onSaveStatus, onPostStatusChange },
	ref
) {
	const [ blocks, setBlocks ] = useState( null );
	const [ ready, setReady ] = useState( false );
	const [ error, setError ] = useState( null );
	const editorContainerRef = useRef( null );
	const titleElRef = useRef( null );
	const saveTimeoutRef = useRef( null );
	const blocksRef = useRef( null );
	const dirtyRef = useRef( false );
	const postStatusRef = useRef( 'publish' );
	const { postId, postType } = window.wpLivecraft;

	useEffect( () => {
		blocksRef.current = blocks;
	}, [ blocks ] );

	const getTitle = useCallback( () => {
		if ( titleElRef.current ) {
			return titleElRef.current.textContent.trim();
		}
		return null;
	}, [] );

	// Save content (and optionally change status).
	const doSave = useCallback(
		async ( { status } = {} ) => {
			if ( saveTimeoutRef.current ) {
				clearTimeout( saveTimeoutRef.current );
				saveTimeoutRef.current = null;
			}

			if ( ! blocksRef.current ) {
				return;
			}

			onSaveStatus( 'saving' );
			try {
				const content = serialize( blocksRef.current );
				const title = getTitle();
				const data = { content };
				if ( title !== null ) {
					data.title = title;
				}
				if ( status ) {
					data.status = status;
				}

				const result = await apiFetch( {
					path: `/wp/v2/${ getRestBase( postType ) }/${ postId }`,
					method: 'POST',
					data,
				} );

				dirtyRef.current = false;
				postStatusRef.current = result.status;
				onPostStatusChange( result.status );
				onSaveStatus( 'saved' );
				return result;
			} catch ( e ) {
				onSaveStatus( 'error' );
				throw e;
			}
		},
		[ postId, postType, onSaveStatus, onPostStatusChange, getTitle ]
	);

	const saveNow = useCallback( async () => {
		if ( ! dirtyRef.current || ! blocksRef.current ) {
			return;
		}
		await doSave();
	}, [ doSave ] );

	const publishNow = useCallback( async () => {
		await doSave( { status: 'publish' } );
	}, [ doSave ] );

	const saveDraft = useCallback( async () => {
		await doSave( { status: 'draft' } );
	}, [ doSave ] );

	useImperativeHandle(
		ref,
		() => ( {
			saveNow,
			publishNow,
			saveDraft,
		} ),
		[ saveNow, publishNow, saveDraft ]
	);

	// On mount: set up title and editor container.
	useEffect( () => {
		const contentEl = document.getElementById( 'livecraft-content' );
		if ( ! contentEl ) {
			setError( 'Content area not found.' );
			return;
		}

		loadEditorStyles();

		const titleEl = document.getElementById( 'livecraft-title' );
		if ( titleEl ) {
			titleElRef.current = titleEl;
			titleEl.contentEditable = 'true';
			titleEl.classList.add( 'livecraft-editable-title' );
			titleEl.addEventListener( 'input', () => {
				dirtyRef.current = true;
			} );
			titleEl.addEventListener( 'keydown', ( e ) => {
				if ( e.key === 'Enter' ) {
					e.preventDefault();
				}
			} );
		}

		contentEl.innerHTML = '';
		const editorDiv = document.createElement( 'div' );
		editorDiv.id = 'livecraft-inline-editor';
		contentEl.appendChild( editorDiv );
		editorContainerRef.current = editorDiv;

		document.body.classList.add( 'livecraft-editing' );

		fetchPost( postType, postId )
			.then( ( post ) => {
				const parsed = parse( post.content.raw );
				setBlocks( parsed );
				postStatusRef.current = post.status;
				onPostStatusChange( post.status );
				setReady( true );
			} )
			.catch( () => {
				setError( 'Failed to load content.' );
			} );

		return () => {
			document.body.classList.remove( 'livecraft-editing' );
			if ( titleElRef.current ) {
				titleElRef.current.contentEditable = 'false';
				titleElRef.current.classList.remove(
					'livecraft-editable-title'
				);
			}
			removeEditorStyles();
			if ( saveTimeoutRef.current ) {
				clearTimeout( saveTimeoutRef.current );
			}
		};
	}, [ postId, postType, onPostStatusChange ] );

	// Debounced auto-save on persistent changes.
	const handleChange = useCallback(
		( newBlocks ) => {
			setBlocks( newBlocks );
			dirtyRef.current = true;

			if ( saveTimeoutRef.current ) {
				clearTimeout( saveTimeoutRef.current );
			}

			onSaveStatus( 'unsaved' );

			saveTimeoutRef.current = setTimeout( async () => {
				await doSave();
			}, SAVE_DEBOUNCE_MS );
		},
		[ onSaveStatus, doSave ]
	);

	if ( error ) {
		return <div className="livecraft-inline-error">{ error }</div>;
	}

	if ( ! ready || ! blocks || ! editorContainerRef.current ) {
		return null;
	}

	return createPortal(
		<SlotFillProvider>
			<BlockEditorProvider
				value={ blocks }
				onInput={ ( newBlocks ) => setBlocks( newBlocks ) }
				onChange={ handleChange }
				settings={ {
					allowedBlockTypes: true,
					hasFixedToolbar: false,
					focusMode: false,
					hasInlineToolbar: false,
					styles: window.wpLivecraft?.themeStyles || [],
					mediaUpload( {
						allowedTypes,
						additionalData,
						filesList,
						maxUploadFileSize,
						onFileChange,
						onError,
					} ) {
						uploadMedia( {
							allowedTypes,
							additionalData,
							filesList,
							maxUploadFileSize,
							onFileChange,
							onError,
						} );
					},
				} }
			>
				<BlockTools>
					<WritingFlow>
						<BlockList />
					</WritingFlow>
				</BlockTools>
				<Popover.Slot />
			</BlockEditorProvider>
		</SlotFillProvider>,
		editorContainerRef.current
	);
} );

export default InlineEditor;
