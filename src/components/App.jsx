import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import { Modal, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { copySmall, external } from '@wordpress/icons';
import Toolbar from './Toolbar';
import InlineEditor from './InlineEditor';
import { createPost, deletePost } from '../utils/api';

export default function App() {
	const autoEdit = window.location.hash === '#fbedit-edit';
	const [ editMode, setEditMode ] = useState( autoEdit );

	// Restore scroll position after exiting edit mode.
	useEffect( () => {
		const savedScroll = window.sessionStorage.getItem(
			'fbedit-scroll'
		);
		if ( savedScroll === null ) {
			return;
		}
		window.sessionStorage.removeItem( 'fbedit-scroll' );
		window.scrollTo( 0, parseInt( savedScroll, 10 ) );
	}, [] );
	const [ saveStatus, setSaveStatus ] = useState( 'idle' );
	const [ postStatus, setPostStatus ] = useState( 'publish' );
	const [ confirmAction, setConfirmAction ] = useState( null );
	const [ resultInfo, setResultInfo ] = useState( null );
	const [ history, setHistory ] = useState( {
		hasUndo: false,
		hasRedo: false,
	} );
	const editorRef = useRef( null );

	const postType = window.fbedit?.postType || 'post';
	const typeLabel =
		postType === 'page'
			? __( 'page', 'frontend-block-editor' )
			: __( 'post', 'frontend-block-editor' );

	const handleToggleEditMode = useCallback( () => {
		setEditMode( true );
	}, [] );

	const handleSave = useCallback( async () => {
		if ( ! editorRef.current ) {
			return;
		}
		await editorRef.current.saveNow();
	}, [] );

	const handlePublish = useCallback( () => {
		setConfirmAction( {
			type: 'publish',
			title: __( 'Publish', 'frontend-block-editor' ),
			message:
				__( 'Are you sure you want to publish this', 'frontend-block-editor' ) +
				' ' +
				typeLabel +
				__( '? It will be publicly visible.', 'frontend-block-editor' ),
			confirmLabel: __( 'Publish', 'frontend-block-editor' ),
		} );
	}, [ typeLabel ] );

	const handleSaveDraft = useCallback( () => {
		setConfirmAction( {
			type: 'draft',
			title: __( 'Switch to Draft', 'frontend-block-editor' ),
			message:
				__( 'This will unpublish the', 'frontend-block-editor' ) +
				' ' +
				typeLabel +
				__(
					'. It will no longer be publicly accessible.',
					'frontend-block-editor'
				),
			confirmLabel: __( 'Switch to Draft', 'frontend-block-editor' ),
		} );
	}, [ typeLabel ] );

	const handleConfirm = useCallback( async () => {
		const action = confirmAction;
		setConfirmAction( null );

		if ( ! editorRef.current || ! action ) {
			return;
		}

		let result;
		if ( action.type === 'publish' ) {
			result = await editorRef.current.publishNow();
		} else {
			result = await editorRef.current.saveDraft();
		}

		if ( result ) {
			const isPublish = action.type === 'publish';
			setResultInfo( {
				title: isPublish
					? __( 'Published!', 'frontend-block-editor' )
					: __( 'Switched to Draft', 'frontend-block-editor' ),
				message: isPublish
					? __( 'Your', 'frontend-block-editor' ) +
					  ' ' +
					  typeLabel +
					  ' ' +
					  __( 'is now live.', 'frontend-block-editor' )
					: __( 'Your', 'frontend-block-editor' ) +
					  ' ' +
					  typeLabel +
					  ' ' +
					  __( 'has been switched to draft.', 'frontend-block-editor' ),
				link: result.link,
				linkLabel: isPublish
					? __( 'View', 'frontend-block-editor' ) + ' ' + typeLabel
					: __( 'Preview', 'frontend-block-editor' ) + ' ' + typeLabel,
			} );
		}
	}, [ confirmAction, typeLabel ] );

	const handleCancelConfirm = useCallback( () => {
		setConfirmAction( null );
	}, [] );

	const handleCloseResult = useCallback( () => {
		setResultInfo( null );
	}, [] );

	const handleCopyLink = useCallback( () => {
		if ( resultInfo?.link ) {
			window.navigator.clipboard.writeText( resultInfo.link );
		}
	}, [ resultInfo ] );

	const [ exitConfirm, setExitConfirm ] = useState( false );

	const doExit = useCallback( () => {
		if ( window.location.hash === '#fbedit-edit' ) {
			window.history.replaceState(
				null,
				'',
				window.location.pathname + window.location.search
			);
		}
		window.sessionStorage.setItem(
			'fbedit-scroll',
			String( window.scrollY )
		);
		window.location.reload();
	}, [] );

	const doExitBack = useCallback( () => {
		if ( window.history.length > 1 ) {
			window.history.back();
		} else {
			window.location.href = window.fbedit?.siteUrl || '/';
		}
	}, [] );

	const handleExit = useCallback( () => {
		const { postId: currentPostId, postType: currentPostType } =
			window.fbedit;

		// New post with no content: delete the draft and go back.
		if ( autoEdit && editorRef.current?.isEmpty() ) {
			deletePost( currentPostType, currentPostId ).catch( () => {} );
			doExitBack();
			return;
		}

		// Cancel the pending auto-save so dirty state is preserved.
		editorRef.current?.cancelPendingSave();

		// Unsaved changes: ask the user what to do.
		if ( editorRef.current?.isDirty() ) {
			setExitConfirm( true );
			return;
		}

		doExit();
	}, [ autoEdit, doExit, doExitBack ] );

	const handleExitSave = useCallback( async () => {
		setExitConfirm( false );
		if ( editorRef.current ) {
			await editorRef.current.saveNow();
		}
		doExit();
	}, [ doExit ] );

	const handleExitDiscard = useCallback( () => {
		setExitConfirm( false );
		doExit();
	}, [ doExit ] );

	const handleExitCancel = useCallback( () => {
		setExitConfirm( false );
	}, [] );

	const handleUndo = useCallback( () => {
		editorRef.current?.undo();
	}, [] );

	const handleRedo = useCallback( () => {
		editorRef.current?.redo();
	}, [] );

	const handleNewContent = useCallback( async ( type ) => {
		const result = await createPost( type, '', '', 'draft' );
		if ( result.link ) {
			window.location.href = result.link + '#fbedit-edit';
		}
	}, [] );

	return (
		<>
			<Toolbar
				editMode={ editMode }
				saveStatus={ saveStatus }
				postStatus={ postStatus }
				hasUndo={ history.hasUndo }
				hasRedo={ history.hasRedo }
				onToggleEditMode={ handleToggleEditMode }
				onSave={ handleSave }
				onPublish={ handlePublish }
				onSaveDraft={ handleSaveDraft }
				onUndo={ handleUndo }
				onRedo={ handleRedo }
				onExit={ handleExit }
				onNewContent={ handleNewContent }
			/>

			{ editMode && (
				<InlineEditor
					ref={ editorRef }
					onSaveStatus={ setSaveStatus }
					onPostStatusChange={ setPostStatus }
					onHistoryChange={ setHistory }
				/>
			) }

			{ confirmAction && (
				<Modal
					title={ confirmAction.title }
					onRequestClose={ handleCancelConfirm }
					className="fbedit-confirm-modal"
					size="small"
				>
					<p>{ confirmAction.message }</p>
					<div className="fbedit-confirm-modal__actions">
						<Button
							variant="tertiary"
							onClick={ handleCancelConfirm }
						>
							{ __( 'Cancel', 'frontend-block-editor' ) }
						</Button>
						<Button variant="primary" onClick={ handleConfirm }>
							{ confirmAction.confirmLabel }
						</Button>
					</div>
				</Modal>
			) }

			{ resultInfo && (
				<Modal
					title={ resultInfo.title }
					onRequestClose={ handleCloseResult }
					className="fbedit-result-modal"
					size="small"
				>
					<p>{ resultInfo.message }</p>
					{ resultInfo.link && (
						<div className="fbedit-result-modal__url">
							<code className="fbedit-result-modal__link">
								{ resultInfo.link }
							</code>
							<Button
								icon={ copySmall }
								label={ __( 'Copy URL', 'frontend-block-editor' ) }
								onClick={ handleCopyLink }
								size="small"
							/>
						</div>
					) }
					<div className="fbedit-result-modal__actions">
						<Button
							variant="tertiary"
							onClick={ handleCloseResult }
						>
							{ __( 'Done', 'frontend-block-editor' ) }
						</Button>
						{ resultInfo.link && (
							<Button
								variant="primary"
								icon={ external }
								href={ resultInfo.link }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ resultInfo.linkLabel }
							</Button>
						) }
					</div>
				</Modal>
			) }

			{ exitConfirm && (
				<Modal
					title={ __( 'Unsaved Changes', 'frontend-block-editor' ) }
					onRequestClose={ handleExitCancel }
					className="fbedit-confirm-modal"
					size="small"
				>
					<p>
						{ __(
							'You have unsaved changes. What would you like to do?',
							'frontend-block-editor'
						) }
					</p>
					<div className="fbedit-confirm-modal__actions">
						<Button variant="tertiary" onClick={ handleExitCancel }>
							{ __( 'Cancel', 'frontend-block-editor' ) }
						</Button>
						<Button
							variant="secondary"
							onClick={ handleExitDiscard }
						>
							{ __( 'Discard', 'frontend-block-editor' ) }
						</Button>
						<Button variant="primary" onClick={ handleExitSave }>
							{ __( 'Save & Exit', 'frontend-block-editor' ) }
						</Button>
					</div>
				</Modal>
			) }
		</>
	);
}
