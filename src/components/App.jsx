import { useState, useCallback, useRef } from '@wordpress/element';
import Toolbar from './Toolbar';
import InlineEditor from './InlineEditor';
import { createPost } from '../utils/api';

export default function App() {
	const autoEdit = window.location.hash === '#livecraft-edit';
	const [ editMode, setEditMode ] = useState( autoEdit );
	const [ saveStatus, setSaveStatus ] = useState( 'idle' );
	const [ postStatus, setPostStatus ] = useState( 'publish' );
	const editorRef = useRef( null );

	const handleToggleEditMode = useCallback( () => {
		setEditMode( true );
	}, [] );

	const handleSave = useCallback( async () => {
		if ( editorRef.current ) {
			await editorRef.current.saveNow();
		}
	}, [] );

	const handlePublish = useCallback( async () => {
		if ( editorRef.current ) {
			await editorRef.current.publishNow();
		}
	}, [] );

	const handleSaveDraft = useCallback( async () => {
		if ( editorRef.current ) {
			await editorRef.current.saveDraft();
		}
	}, [] );

	const handleExit = useCallback( async () => {
		if ( editorRef.current ) {
			await editorRef.current.saveNow();
		}
		window.location.reload();
	}, [] );

	const handleNewContent = useCallback( async ( type ) => {
		const result = await createPost( type, '', '', 'draft' );
		if ( result.link ) {
			window.location.href = result.link + '#livecraft-edit';
		}
	}, [] );

	return (
		<>
			<Toolbar
				editMode={ editMode }
				saveStatus={ saveStatus }
				postStatus={ postStatus }
				onToggleEditMode={ handleToggleEditMode }
				onSave={ handleSave }
				onPublish={ handlePublish }
				onSaveDraft={ handleSaveDraft }
				onExit={ handleExit }
				onNewContent={ handleNewContent }
			/>

			{ editMode && (
				<InlineEditor
					ref={ editorRef }
					onSaveStatus={ setSaveStatus }
					onPostStatusChange={ setPostStatus }
				/>
			) }
		</>
	);
}
