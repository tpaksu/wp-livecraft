import apiFetch from '@wordpress/api-fetch';

/**
 * Get the REST endpoint for a post type.
 *
 * @param {string} postType - The post type (post, page).
 * @return {string} The REST base path.
 */
function getRestBase( postType ) {
	return postType === 'page' ? 'pages' : 'posts';
}

/**
 * Fetch a post with raw content (requires edit context).
 *
 * @param {string} postType - The post type.
 * @param {number} postId   - The post ID.
 * @return {Promise<Object>} The post object with raw content.
 */
export async function fetchPost( postType, postId ) {
	return apiFetch( {
		path: `/wp/v2/${ getRestBase( postType ) }/${ postId }?context=edit`,
	} );
}

/**
 * Update a post's content and/or title.
 *
 * @param {string}      postType - The post type.
 * @param {number}      postId   - The post ID.
 * @param {string}      content  - The serialized block content.
 * @param {string|null} title    - The post title (null to skip).
 * @return {Promise<Object>} The updated post object.
 */
export async function updatePost( postType, postId, content, title = null ) {
	const data = { content };
	if ( title !== null ) {
		data.title = title;
	}
	return apiFetch( {
		path: `/wp/v2/${ getRestBase( postType ) }/${ postId }`,
		method: 'POST',
		data,
	} );
}

/**
 * Create a new post or page.
 *
 * @param {string} postType - The post type (post or page).
 * @param {string} title    - The post title.
 * @param {string} content  - The serialized block content.
 * @param {string} status   - The post status (draft or publish).
 * @return {Promise<Object>} The created post object.
 */
export async function createPost( postType, title, content, status = 'draft' ) {
	return apiFetch( {
		path: `/wp/v2/${ getRestBase( postType ) }`,
		method: 'POST',
		data: { title, content, status },
	} );
}
