import { useState } from '@wordpress/element';
import { Button, Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import { pencil, plus, page, post, cloud, close } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

function SaveIndicator( { status } ) {
	if ( status === 'idle' ) {
		return null;
	}

	const labels = {
		unsaved: __( 'Unsaved changes', 'livecraft' ),
		saving: __( 'Saving…', 'livecraft' ),
		saved: __( 'Saved', 'livecraft' ),
		error: __( 'Save failed', 'livecraft' ),
	};

	const className = `livecraft-save-indicator livecraft-save-indicator--${ status }`;

	return <span className={ className }>{ labels[ status ] || '' }</span>;
}

export default function Toolbar( {
	editMode,
	saveStatus,
	postStatus,
	onToggleEditMode,
	onSave,
	onPublish,
	onSaveDraft,
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

	// Not in edit mode: show the edit button in the same bar style.
	if ( ! editMode ) {
		return (
			<div className="livecraft-toolbar">
				<Button
					className="livecraft-toolbar__toggle"
					icon={ pencil }
					onClick={ onToggleEditMode }
					variant="link"
				>
					{ __( 'Edit Page', 'livecraft' ) }
				</Button>
			</div>
		);
	}

	const isPublished = postStatus === 'publish';

	return (
		<div className="livecraft-toolbar livecraft-toolbar--editing">
			<SaveIndicator status={ saveStatus } />

			{ /* Save / Update button */ }
			<Button
				className="livecraft-toolbar__save"
				icon={ cloud }
				onClick={ wrapAction( onSave ) }
				disabled={ busy || saveStatus === 'saving' }
				variant="secondary"
			>
				{ isPublished
					? __( 'Update', 'livecraft' )
					: __( 'Save Draft', 'livecraft' ) }
			</Button>

			{ /* Publish button (only for drafts/pending) */ }
			{ ! isPublished && (
				<Button
					className="livecraft-toolbar__publish"
					onClick={ wrapAction( onPublish ) }
					disabled={ busy }
					variant="primary"
				>
					{ __( 'Publish', 'livecraft' ) }
				</Button>
			) }

			{ /* Switch to draft (only for published posts) */ }
			{ isPublished && (
				<Button
					className="livecraft-toolbar__draft"
					onClick={ wrapAction( onSaveDraft ) }
					disabled={ busy }
					variant="tertiary"
				>
					{ __( 'Switch to Draft', 'livecraft' ) }
				</Button>
			) }

			{ /* New content dropdown */ }
			<Dropdown
				className="livecraft-toolbar__new-dropdown"
				contentClassName="livecraft-toolbar__new-menu"
				popoverProps={ { placement: 'top-end' } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						className="livecraft-toolbar__new"
						icon={ plus }
						label={ __( 'Create New', 'livecraft' ) }
						onClick={ onToggle }
						aria-expanded={ isOpen }
						disabled={ busy }
						variant="secondary"
					/>
				) }
				renderContent={ ( { onClose: closeMenu } ) => (
					<MenuGroup>
						<MenuItem
							icon={ post }
							disabled={ busy }
							onClick={ () => {
								closeMenu();
								wrapAction( () => onNewContent( 'post' ) )();
							} }
						>
							{ __( 'New Post', 'livecraft' ) }
						</MenuItem>
						<MenuItem
							icon={ page }
							disabled={ busy }
							onClick={ () => {
								closeMenu();
								wrapAction( () => onNewContent( 'page' ) )();
							} }
						>
							{ __( 'New Page', 'livecraft' ) }
						</MenuItem>
					</MenuGroup>
				) }
			/>

			{ /* Exit edit mode */ }
			<Button
				className="livecraft-toolbar__exit"
				icon={ close }
				label={ __( 'Exit editor', 'livecraft' ) }
				onClick={ wrapAction( onExit ) }
				disabled={ busy }
				variant="tertiary"
			/>
		</div>
	);
}
