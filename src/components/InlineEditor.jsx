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
	const urls = window.fbedit?.editorStyles || {};
	Object.entries( urls ).forEach( ( [ handle, url ] ) => {
		const id = `fbedit-dynamic-style-${ handle }`;
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
		.querySelectorAll( '[id^="fbedit-dynamic-style-"]' )
		.forEach( ( el ) => el.remove() );
}

function getRestBase( postType ) {
	return postType === 'page' ? 'pages' : 'posts';
}

const InlineEditor = forwardRef( function InlineEditor(
	{ onSaveStatus, onPostStatusChange, onHistoryChange },
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
	// Tracks whether any edits were made this session.
	// Unlike dirtyRef, this is NOT cleared by auto-save.
	const sessionDirtyRef = useRef( false );
	const postStatusRef = useRef( 'publish' );
	const { postId, postType } = window.fbedit;

	// Undo/redo history stack.
	const historyRef = useRef( [] );
	const historyPointerRef = useRef( -1 );
	const isUndoRedoRef = useRef( false );

	const reportHistory = useCallback( () => {
		onHistoryChange( {
			hasUndo: historyPointerRef.current > 0,
			hasRedo: historyPointerRef.current < historyRef.current.length - 1,
		} );
	}, [ onHistoryChange ] );

	const pushHistory = useCallback(
		( newBlocks ) => {
			// Truncate any forward history.
			historyRef.current = historyRef.current.slice(
				0,
				historyPointerRef.current + 1
			);
			historyRef.current.push( newBlocks );
			historyPointerRef.current += 1;
			reportHistory();
		},
		[ reportHistory ]
	);

	const undo = useCallback( () => {
		if ( historyPointerRef.current <= 0 ) {
			return;
		}
		historyPointerRef.current -= 1;
		const prev = historyRef.current[ historyPointerRef.current ];
		isUndoRedoRef.current = true;
		setBlocks( prev );
		blocksRef.current = prev;
		dirtyRef.current = true;
		onSaveStatus( 'unsaved' );
		reportHistory();
	}, [ onSaveStatus, reportHistory ] );

	const redo = useCallback( () => {
		if ( historyPointerRef.current >= historyRef.current.length - 1 ) {
			return;
		}
		historyPointerRef.current += 1;
		const next = historyRef.current[ historyPointerRef.current ];
		isUndoRedoRef.current = true;
		setBlocks( next );
		blocksRef.current = next;
		dirtyRef.current = true;
		onSaveStatus( 'unsaved' );
		reportHistory();
	}, [ onSaveStatus, reportHistory ] );

	useEffect( () => {
		blocksRef.current = blocks;
	}, [ blocks ] );

	// Keyboard shortcuts for undo/redo.
	useEffect( () => {
		function handleKeyDown( e ) {
			const isMod = e.metaKey || e.ctrlKey;
			if ( ! isMod || e.key.toLowerCase() !== 'z' ) {
				return;
			}
			e.preventDefault();
			if ( e.shiftKey ) {
				redo();
			} else {
				undo();
			}
		}
		document.addEventListener( 'keydown', handleKeyDown );
		return () => document.removeEventListener( 'keydown', handleKeyDown );
	}, [ undo, redo ] );

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
		if ( ! blocksRef.current ) {
			return null;
		}
		const result = await doSave();
		sessionDirtyRef.current = false;
		return result;
	}, [ doSave ] );

	const publishNow = useCallback( async () => {
		return doSave( { status: 'publish' } );
	}, [ doSave ] );

	const saveDraft = useCallback( async () => {
		return doSave( { status: 'draft' } );
	}, [ doSave ] );

	const isEmpty = useCallback( () => {
		const title = getTitle();
		if ( title ) {
			return false;
		}
		if ( ! blocksRef.current || blocksRef.current.length === 0 ) {
			return true;
		}
		// A single empty paragraph is the default state.
		const currentBlocks = blocksRef.current;
		return (
			currentBlocks.length === 1 &&
			currentBlocks[ 0 ].name === 'core/paragraph' &&
			! currentBlocks[ 0 ].attributes?.content
		);
	}, [ getTitle ] );

	const isDirty = useCallback( () => {
		return sessionDirtyRef.current;
	}, [] );

	// Cancel the pending debounced auto-save so dirty state
	// is not cleared before the caller can inspect it.
	const cancelPendingSave = useCallback( () => {
		if ( saveTimeoutRef.current ) {
			clearTimeout( saveTimeoutRef.current );
			saveTimeoutRef.current = null;
		}
	}, [] );

	useImperativeHandle(
		ref,
		() => ( {
			saveNow,
			publishNow,
			saveDraft,
			undo,
			redo,
			isEmpty,
			isDirty,
			cancelPendingSave,
		} ),
		[
			saveNow,
			publishNow,
			saveDraft,
			undo,
			redo,
			isEmpty,
			isDirty,
			cancelPendingSave,
		]
	);

	// On mount: set up title and editor container.
	useEffect( () => {
		const contentEl = document.getElementById( 'fbedit-content' );
		if ( ! contentEl ) {
			setError( 'Content area not found.' );
			return;
		}

		loadEditorStyles();

		const titleEl = document.getElementById( 'fbedit-title' );
		if ( titleEl ) {
			titleElRef.current = titleEl;
			titleEl.contentEditable = 'true';
			titleEl.classList.add( 'fbedit-editable-title' );
			titleEl.addEventListener( 'input', () => {
				dirtyRef.current = true;
				sessionDirtyRef.current = true;
			} );
			titleEl.addEventListener( 'keydown', ( e ) => {
				if ( e.key === 'Enter' ) {
					e.preventDefault();
				}
			} );
		}

		// Save scroll position before DOM changes.
		const scrollY = window.scrollY;

		// Keep original content visible while the editor loads.
		// Mark existing children so we can remove them after the
		// editor is ready, avoiding a flash of empty content.
		Array.from( contentEl.children ).forEach( ( child ) => {
			child.setAttribute( 'data-fbedit-original', '' );
		} );

		const editorDiv = document.createElement( 'div' );
		editorDiv.id = 'fbedit-inline-editor';
		contentEl.appendChild( editorDiv );
		editorContainerRef.current = editorDiv;

		document.body.classList.add( 'fbedit-editing' );

		fetchPost( postType, postId )
			.then( ( post ) => {
				const parsed = parse( post.content.raw );
				setBlocks( parsed );
				pushHistory( parsed );
				postStatusRef.current = post.status;
				onPostStatusChange( post.status );
				setReady( true );

				// Remove original content now that the editor is ready.
				contentEl
					.querySelectorAll( '[data-fbedit-original]' )
					.forEach( ( el ) => el.remove() );

				// Restore scroll position after the editor swap.
				window.scrollTo( 0, scrollY );
			} )
			.catch( () => {
				setError( 'Failed to load content.' );
			} );

		return () => {
			document.body.classList.remove( 'fbedit-editing' );
			if ( titleElRef.current ) {
				titleElRef.current.contentEditable = 'false';
				titleElRef.current.classList.remove(
					'fbedit-editable-title'
				);
			}
			removeEditorStyles();
			if ( saveTimeoutRef.current ) {
				clearTimeout( saveTimeoutRef.current );
			}
		};
	}, [ postId, postType, onPostStatusChange, pushHistory ] );

	// Debounced auto-save on persistent changes.
	const handleChange = useCallback(
		( newBlocks ) => {
			setBlocks( newBlocks );
			dirtyRef.current = true;
			sessionDirtyRef.current = true;

			// Skip history push if this change came from undo/redo.
			if ( isUndoRedoRef.current ) {
				isUndoRedoRef.current = false;
			} else {
				pushHistory( newBlocks );
			}

			if ( saveTimeoutRef.current ) {
				clearTimeout( saveTimeoutRef.current );
			}

			onSaveStatus( 'unsaved' );

			saveTimeoutRef.current = setTimeout( async () => {
				await doSave();
			}, SAVE_DEBOUNCE_MS );
		},
		[ onSaveStatus, doSave, pushHistory ]
	);

	if ( error ) {
		return <div className="fbedit-inline-error">{ error }</div>;
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
					styles: window.fbedit?.themeStyles || [],
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
