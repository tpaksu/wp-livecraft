import { useState } from '@wordpress/element';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
} from '@wordpress/block-editor';
import { serialize, createBlock } from '@wordpress/blocks';
import {
	Button,
	TextControl,
	SlotFillProvider,
	Popover,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { close, check, drafts } from '@wordpress/icons';
import { createPost } from '../utils/api';

export default function NewContentPanel( { postType, onClose } ) {
	const [ title, setTitle ] = useState( '' );
	const [ blocks, setBlocks ] = useState( [
		createBlock( 'core/paragraph' ),
	] );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	const typeLabel =
		postType === 'page'
			? __( 'Page', 'livecraft' )
			: __( 'Post', 'livecraft' );

	const handleSave = async ( status ) => {
		if ( ! title.trim() ) {
			setError( __( 'Please enter a title.', 'livecraft' ) );
			return;
		}

		setSaving( true );
		setError( null );

		try {
			const content = serialize( blocks );
			const result = await createPost( postType, title, content, status );

			// Navigate to the new content.
			if ( result.link ) {
				window.location.href = result.link;
			} else {
				window.location.reload();
			}
		} catch ( err ) {
			setError(
				err.message || __( 'Failed to create content.', 'livecraft' )
			);
			setSaving( false );
		}
	};

	return (
		<>
			<div
				className="livecraft-overlay livecraft-overlay--full"
				onClick={ onClose }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Escape' ) {
						onClose();
					}
				} }
				role="presentation"
			/>
			<div
				className="livecraft-new-panel"
				role="dialog"
				aria-modal="true"
				aria-label={ `${ __( 'New', 'livecraft' ) } ${ typeLabel }` }
			>
				<div className="livecraft-new-panel__header">
					<h2 className="livecraft-new-panel__title">
						{ `${ __( 'New', 'livecraft' ) } ${ typeLabel }` }
					</h2>
					<div className="livecraft-new-panel__actions">
						<Button
							icon={ close }
							label={ __( 'Cancel', 'livecraft' ) }
							onClick={ onClose }
							disabled={ saving }
						/>
						<Button
							icon={ drafts }
							onClick={ () => handleSave( 'draft' ) }
							disabled={ saving }
							variant="tertiary"
						>
							{ __( 'Save Draft', 'livecraft' ) }
						</Button>
						<Button
							icon={ check }
							onClick={ () => handleSave( 'publish' ) }
							variant="primary"
							disabled={ saving }
							isBusy={ saving }
						>
							{ __( 'Publish', 'livecraft' ) }
						</Button>
					</div>
				</div>

				{ error && (
					<div className="livecraft-new-panel__error">{ error }</div>
				) }

				<div className="livecraft-new-panel__title-input">
					<TextControl
						label={ __( 'Title', 'livecraft' ) }
						hideLabelFromVision
						placeholder={ `${ typeLabel } ${ __(
							'title…',
							'livecraft'
						) }` }
						value={ title }
						onChange={ setTitle }
						className="livecraft-new-panel__title-field"
					/>
				</div>

				<div className="livecraft-new-panel__content">
					<SlotFillProvider>
						<BlockEditorProvider
							value={ blocks }
							onInput={ ( newBlocks ) => setBlocks( newBlocks ) }
							onChange={ ( newBlocks ) => setBlocks( newBlocks ) }
							settings={ {
								hasFixedToolbar: true,
								focusMode: false,
							} }
						>
							<BlockTools>
								<WritingFlow>
									<BlockList />
								</WritingFlow>
							</BlockTools>
							<Popover.Slot />
						</BlockEditorProvider>
					</SlotFillProvider>
				</div>
			</div>
		</>
	);
}
