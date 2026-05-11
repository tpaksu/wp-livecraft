import { useState } from '@wordpress/element';
import { Button, Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import {
	pencil,
	plus,
	page,
	post,
	cloud,
	close,
	undo,
	redo,
} from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

function SaveIndicator( { status } ) {
	if ( status === 'idle' ) {
		return null;
	}

	const labels = {
		unsaved: __( 'Unsaved changes', 'frontend-block-editor' ),
		saving: __( 'Saving…', 'frontend-block-editor' ),
		saved: __( 'Saved', 'frontend-block-editor' ),
		error: __( 'Save failed', 'frontend-block-editor' ),
	};

	const className = `fbedit-save-indicator fbedit-save-indicator--${ status }`;

	return <span className={ className }>{ labels[ status ] || '' }</span>;
}

function NewContentDropdown( { busy, wrapAction, onNewContent } ) {
	return (
		<Dropdown
			className="fbedit-toolbar__new-dropdown"
			contentClassName="fbedit-toolbar__new-menu"
			popoverProps={ { placement: 'top-end' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					className="fbedit-toolbar__new"
					icon={ plus }
					onClick={ onToggle }
					aria-expanded={ isOpen }
					disabled={ busy }
					variant="secondary"
				>
					{ __( 'Create New', 'frontend-block-editor' ) }
				</Button>
			) }
			renderContent={ ( { onClose: closeMenu } ) => (
				<MenuGroup className="fbedit-toolbar__new-menu-group">
					<MenuItem
						icon={ post }
						disabled={ busy }
						onClick={ () => {
							closeMenu();
							wrapAction( () => onNewContent( 'post' ) )();
						} }
					>
						{ __( 'New Post', 'frontend-block-editor' ) }
					</MenuItem>
					<MenuItem
						icon={ page }
						disabled={ busy }
						onClick={ () => {
							closeMenu();
							wrapAction( () => onNewContent( 'page' ) )();
						} }
					>
						{ __( 'New Page', 'frontend-block-editor' ) }
					</MenuItem>
				</MenuGroup>
			) }
		/>
	);
}

export default function Toolbar( {
	editMode,
	saveStatus,
	postStatus,
	hasUndo,
	hasRedo,
	onToggleEditMode,
	onSave,
	onPublish,
	onSaveDraft,
	onUndo,
	onRedo,
	onExit,
	onNewContent,
} ) {
	const [ busy, setBusy ] = useState( false );

	const wrapAction = ( fn ) => async () => {
		setBusy( true );
		try {
			await fn();
		} finally {
			setBusy( false );
		}
	};

	const postType = window.fbedit?.postType || 'post';
	const editLabel =
		postType === 'page'
			? __( 'Edit Page', 'frontend-block-editor' )
			: __( 'Edit Post', 'frontend-block-editor' );

	// Not in edit mode: show edit button and new content dropdown.
	if ( ! editMode ) {
		return (
			<div className="fbedit-toolbar fbedit-toolbar--idle">
				<Button
					className="fbedit-toolbar__toggle"
					icon={ pencil }
					onClick={ onToggleEditMode }
					variant="secondary"
				>
					{ editLabel }
				</Button>

				<NewContentDropdown
					busy={ busy }
					wrapAction={ wrapAction }
					onNewContent={ onNewContent }
				/>
			</div>
		);
	}

	const isPublished = postStatus === 'publish';

	return (
		<div className="fbedit-toolbar fbedit-toolbar--editing">
			<SaveIndicator status={ saveStatus } />

			<Button
				className="fbedit-toolbar__undo"
				icon={ undo }
				label={ __( 'Undo', 'frontend-block-editor' ) }
				onClick={ onUndo }
				disabled={ ! hasUndo }
				variant="tertiary"
			/>
			<Button
				className="fbedit-toolbar__redo"
				icon={ redo }
				label={ __( 'Redo', 'frontend-block-editor' ) }
				onClick={ onRedo }
				disabled={ ! hasRedo }
				variant="tertiary"
			/>

			{ /* Save / Update button */ }
			<Button
				className="fbedit-toolbar__save"
				icon={ cloud }
				onClick={ wrapAction( onSave ) }
				disabled={ busy || saveStatus === 'saving' }
				variant="secondary"
			>
				{ isPublished
					? __( 'Update', 'frontend-block-editor' )
					: __( 'Save Draft', 'frontend-block-editor' ) }
			</Button>

			{ /* Publish button (only for drafts/pending) */ }
			{ ! isPublished && (
				<Button
					className="fbedit-toolbar__publish"
					onClick={ wrapAction( onPublish ) }
					disabled={ busy }
					variant="primary"
				>
					{ __( 'Publish', 'frontend-block-editor' ) }
				</Button>
			) }

			{ /* Switch to draft (only for published posts) */ }
			{ isPublished && (
				<Button
					className="fbedit-toolbar__draft"
					onClick={ wrapAction( onSaveDraft ) }
					disabled={ busy }
					variant="secondary"
				>
					{ __( 'Switch to Draft', 'frontend-block-editor' ) }
				</Button>
			) }

			{ /* Exit edit mode */ }
			<Button
				className="fbedit-toolbar__exit"
				icon={ close }
				label={ __( 'Exit editor', 'frontend-block-editor' ) }
				onClick={ wrapAction( onExit ) }
				disabled={ busy }
				variant="tertiary"
			/>
		</div>
	);
}
