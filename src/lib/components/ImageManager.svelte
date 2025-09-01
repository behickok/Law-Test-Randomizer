<script>
	import { createEventDispatcher } from 'svelte';
	import { uploadImage, deleteImage, updateImage } from '$lib/api.js';
	import {
		fileToBase64,
		validateImageFile,
		formatFileSize,
		generateImageName
	} from '$lib/imageUtils.js';
	import { user } from '$lib/user.js';

	const dispatch = createEventDispatcher();

	// Props
	export let images = [];
	export let selectedImages = [];
	export let mode = 'manage'; // 'manage' or 'select'
	export let maxSelections = null;

	// State
	let uploadFiles = [];
	let dragOver = false;
	let uploading = false;
	let uploadProgress = '';
	let searchQuery = '';
	let editingImage = null;
	let editForm = { name: '', description: '' };

	// Reactive
	$: filteredImages = images.filter(
		(img) =>
			img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(img.description && img.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	async function handleFileSelect(event) {
		const files = Array.from(event.target.files || []);
		await processFiles(files);
		event.target.value = ''; // Reset file input
	}

	async function handleDrop(event) {
		event.preventDefault();
		dragOver = false;
		const files = Array.from(event.dataTransfer.files);
		await processFiles(files);
	}

	async function processFiles(files) {
		const validFiles = [];

		for (const file of files) {
			try {
				validateImageFile(file);
				validFiles.push(file);
			} catch (error) {
				alert(`Error with ${file.name}: ${error.message}`);
			}
		}

		if (validFiles.length === 0) return;

		// Generate unique names for new images
		const existingNames = images.map((img) => img.name);

		uploadFiles = validFiles.map((file) => ({
			file,
			name: generateImageName(file.name, existingNames),
			description: '',
			preview: null,
			status: 'pending'
		}));

		// Generate previews
		for (const uploadFile of uploadFiles) {
			try {
				uploadFile.preview = await fileToBase64(uploadFile.file);
			} catch (error) {
				console.error('Error generating preview:', error);
			}
		}

		uploadFiles = uploadFiles; // Trigger reactivity
	}

	async function uploadAllFiles() {
		if (!$user || uploadFiles.length === 0) return;

		uploading = true;
		let successCount = 0;

		for (let i = 0; i < uploadFiles.length; i++) {
			const uploadFile = uploadFiles[i];
			uploadProgress = `Uploading ${i + 1} of ${uploadFiles.length}: ${uploadFile.name}`;

			try {
				uploadFile.status = 'uploading';
				uploadFiles = uploadFiles; // Trigger reactivity

				const base64Data = await fileToBase64(uploadFile.file);

				await uploadImage(fetch, {
					name: uploadFile.name,
					description: uploadFile.description,
					mimeType: uploadFile.file.type,
					base64Data,
					teacherId: $user.id
				});

				uploadFile.status = 'success';
				successCount++;
			} catch (error) {
				uploadFile.status = 'error';
				uploadFile.error = error.message;
			}

			uploadFiles = uploadFiles; // Trigger reactivity
		}

		uploading = false;
		uploadProgress = '';

		if (successCount > 0) {
			dispatch('imagesUploaded');
			// Clear successful uploads after a moment
			setTimeout(() => {
				uploadFiles = uploadFiles.filter((f) => f.status !== 'success');
			}, 2000);
		}
	}

	function removeUploadFile(index) {
		uploadFiles = uploadFiles.filter((_, i) => i !== index);
	}

	async function handleDeleteImage(image) {
		if (!confirm(`Delete image "${image.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			await deleteImage(fetch, {
				imageId: image.id,
				teacherId: $user.id
			});
			dispatch('imageDeleted', image);
		} catch (error) {
			alert(`Error deleting image: ${error.message}`);
		}
	}

	function startEditingImage(image) {
		editingImage = image;
		editForm = {
			name: image.name,
			description: image.description || ''
		};
	}

	function cancelEditing() {
		editingImage = null;
		editForm = { name: '', description: '' };
	}

	async function saveImageChanges() {
		if (!editingImage || !editForm.name.trim()) {
			return;
		}

		try {
			await updateImage(fetch, {
				imageId: editingImage.id,
				name: editForm.name.trim(),
				description: editForm.description.trim(),
				teacherId: $user.id
			});

			// Update the local image data
			editingImage.name = editForm.name.trim();
			editingImage.description = editForm.description.trim();

			dispatch('imageUpdated', editingImage);
			cancelEditing();
		} catch (error) {
			alert(`Error updating image: ${error.message}`);
		}
	}

	function toggleImageSelection(image) {
		if (mode !== 'select') return;

		const index = selectedImages.findIndex((img) => img.id === image.id);

		if (index >= 0) {
			selectedImages = selectedImages.filter((img) => img.id !== image.id);
		} else {
			if (maxSelections && selectedImages.length >= maxSelections) {
				alert(`You can only select up to ${maxSelections} image(s).`);
				return;
			}
			selectedImages = [...selectedImages, image];
		}

		dispatch('selectionChanged', selectedImages);
	}

	function isSelected(image) {
		return selectedImages.some((img) => img.id === image.id);
	}

	function handleDragOver(event) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(event) {
		event.preventDefault();
		dragOver = false;
	}
</script>

<div class="image-manager">
	<div class="manager-header">
		<h3 class="manager-title">
			<span class="title-icon">🖼️</span>
			{mode === 'select' ? 'Select Images' : 'Image Library'}
		</h3>

		{#if mode === 'manage'}
			<div class="search-box">
				<input
					type="text"
					placeholder="Search images..."
					bind:value={searchQuery}
					class="search-input"
				/>
				<span class="search-icon">🔍</span>
			</div>
		{/if}
	</div>

	{#if mode === 'manage'}
		<!-- Upload Section -->
		<div class="upload-section">
			<div
				class="upload-area {dragOver ? 'drag-over' : ''}"
				on:drop={handleDrop}
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
			>
				<div class="upload-content">
					<div class="upload-icon">📤</div>
					<p>Drag & drop images here or click to select</p>
					<p class="upload-hint">Supports JPEG, PNG, GIF, WebP (max 5MB each)</p>
					<input
						type="file"
						accept="image/*"
						multiple
						on:change={handleFileSelect}
						class="file-input"
					/>
				</div>
			</div>

			<!-- Upload Queue -->
			{#if uploadFiles.length > 0}
				<div class="upload-queue">
					<div class="queue-header">
						<h4>Upload Queue ({uploadFiles.length})</h4>
						{#if !uploading}
							<button class="btn btn-primary btn-sm" on:click={uploadAllFiles}> Upload All </button>
						{/if}
					</div>

					{#if uploading}
						<div class="upload-progress">
							<div class="progress-text">{uploadProgress}</div>
							<div class="progress-bar">
								<div
									class="progress-fill"
									style="width: {(uploadFiles.filter(
										(f) => f.status === 'success' || f.status === 'error'
									).length /
										uploadFiles.length) *
										100}%"
								></div>
							</div>
						</div>
					{/if}

					<div class="upload-list">
						{#each uploadFiles as uploadFile, i (i)}
							<div class="upload-item status-{uploadFile.status}">
								<div class="upload-preview">
									{#if uploadFile.preview}
										<img src={uploadFile.preview} alt="Preview" />
									{:else}
										<div class="preview-placeholder">📷</div>
									{/if}
								</div>

								<div class="upload-details">
									<input
										type="text"
										bind:value={uploadFile.name}
										placeholder="Image name"
										class="name-input"
										disabled={uploading}
									/>
									<input
										type="text"
										bind:value={uploadFile.description}
										placeholder="Description (optional)"
										class="desc-input"
										disabled={uploading}
									/>
									<div class="file-info">
										{uploadFile.file.name} ({formatFileSize(uploadFile.file.size)})
									</div>
								</div>

								<div class="upload-status">
									{#if uploadFile.status === 'pending'}
										<button
											class="remove-btn"
											on:click={() => removeUploadFile(i)}
											disabled={uploading}>✕</button
										>
									{:else if uploadFile.status === 'uploading'}
										<div class="status-icon uploading">⏳</div>
									{:else if uploadFile.status === 'success'}
										<div class="status-icon success">✅</div>
									{:else if uploadFile.status === 'error'}
										<div class="status-icon error" title={uploadFile.error}>❌</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Images Grid -->
	<div class="images-section">
		{#if filteredImages.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📷</div>
				<h4>No images found</h4>
				<p>{searchQuery ? 'Try a different search term' : 'Upload some images to get started'}</p>
			</div>
		{:else}
			<div class="images-grid">
				{#each filteredImages as image (image.id)}
					<div
						class="image-card {mode === 'select' ? 'selectable' : ''} {isSelected(image)
							? 'selected'
							: ''} {editingImage?.id === image.id ? 'editing' : ''}"
						on:click={() => toggleImageSelection(image)}
					>
						<div class="image-preview">
							<img
								src={image.base64_data.startsWith('data:') ? image.base64_data : `data:${image.mime_type};base64,${image.base64_data}`}
								alt={image.description || image.name}
							/>
							{#if mode === 'select' && isSelected(image)}
								<div class="selection-overlay">
									<div class="selection-icon">✓</div>
								</div>
							{/if}
						</div>

						<div class="image-info">
							{#if editingImage?.id === image.id}
								<!-- Edit Mode -->
								<div class="edit-form" on:click|stopPropagation>
									<input
										type="text"
										bind:value={editForm.name}
										placeholder="Image name"
										class="edit-name-input"
										on:keydown={(e) => e.key === 'Enter' && saveImageChanges()}
									/>
									<textarea
										bind:value={editForm.description}
										placeholder="Description (optional)"
										class="edit-description-input"
										rows="2"
									></textarea>
									<div class="edit-actions">
										<button class="save-btn" on:click={saveImageChanges}> 💾 Save </button>
										<button class="cancel-btn" on:click={cancelEditing}> ❌ Cancel </button>
									</div>
								</div>
							{:else}
								<!-- Display Mode -->
								<div class="image-name">{image.name}</div>
								{#if image.description}
									<div class="image-description">{image.description}</div>
								{/if}
								<div class="image-meta">
									{formatFileSize(image.file_size)} • {new Date(
										image.created_at
									).toLocaleDateString()}
								</div>
								<div class="template-syntax">
									<code>&#123;&#123;{image.name}&#125;&#125;</code>
								</div>
							{/if}
						</div>

						{#if mode === 'manage'}
							<div class="image-actions">
								{#if editingImage?.id !== image.id}
									<button
										class="edit-btn"
										on:click|stopPropagation={() => startEditingImage(image)}
									>
										✏️
									</button>
								{/if}
								<button
									class="delete-btn"
									on:click|stopPropagation={() => handleDeleteImage(image)}
								>
									🗑️
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.image-manager {
		background: white;
		border-radius: 12px;
		overflow: hidden;
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.manager-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #374151;
	}

	.title-icon {
		font-size: 1.5rem;
	}

	.search-box {
		position: relative;
		min-width: 250px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.search-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #9ca3af;
	}

	.upload-section {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.upload-area {
		border: 2px dashed #d1d5db;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		transition: all 0.2s ease;
		position: relative;
		cursor: pointer;
	}

	.upload-area:hover,
	.upload-area.drag-over {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.05);
	}

	.upload-content {
		pointer-events: none;
	}

	.upload-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.upload-hint {
		color: #6b7280;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.file-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		pointer-events: all;
	}

	.upload-queue {
		margin-top: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.queue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.queue-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.upload-progress {
		padding: 1rem;
		background: #fef3c7;
		border-bottom: 1px solid #e5e7eb;
	}

	.progress-text {
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		color: #92400e;
	}

	.progress-bar {
		height: 4px;
		background: #fde68a;
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #d97706;
		transition: width 0.3s ease;
	}

	.upload-list {
		max-height: 300px;
		overflow-y: auto;
	}

	.upload-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.upload-item:last-child {
		border-bottom: none;
	}

	.upload-item.status-success {
		background: rgba(34, 197, 94, 0.05);
	}

	.upload-item.status-error {
		background: rgba(239, 68, 68, 0.05);
	}

	.upload-preview {
		width: 60px;
		height: 60px;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f3f4f6;
		flex-shrink: 0;
	}

	.upload-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.preview-placeholder {
		font-size: 1.5rem;
		color: #9ca3af;
	}

	.upload-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.name-input,
	.desc-input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.file-info {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.upload-status {
		flex-shrink: 0;
	}

	.remove-btn {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 4px;
		padding: 0.25rem;
		cursor: pointer;
		color: #dc2626;
	}

	.status-icon {
		font-size: 1.25rem;
		padding: 0.25rem;
	}

	.images-section {
		padding: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.images-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.image-card {
		position: relative;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.2s ease;
		background: white;
	}

	.image-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.image-card.selectable {
		cursor: pointer;
	}

	.image-card.selected {
		border-color: #10b981;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
	}

	.image-card.editing {
		border-color: #f59e0b;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
	}

	.image-preview {
		position: relative;
		aspect-ratio: 4/3;
		overflow: hidden;
		background: #f3f4f6;
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.selection-overlay {
		position: absolute;
		top: 0;
		right: 0;
		background: #10b981;
		color: white;
		padding: 0.5rem;
		border-radius: 0 0 0 8px;
	}

	.selection-icon {
		font-weight: bold;
	}

	.image-info {
		padding: 1rem;
	}

	.image-name {
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		color: #374151;
	}

	.image-description {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.image-meta {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-bottom: 0.5rem;
	}

	.template-syntax {
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}

	.template-syntax code {
		color: #374151;
		font-family: 'JetBrains Mono', monospace;
	}

	.image-actions {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.image-card:hover .image-actions {
		opacity: 1;
	}

	.edit-btn,
	.delete-btn {
		background: rgba(239, 68, 68, 0.9);
		border: none;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		margin-left: 0.25rem;
	}

	.edit-btn {
		background: rgba(245, 158, 11, 0.9);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		gap: 0.5rem;
	}

	.btn-primary {
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		transform: translateY(-1px);
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
	}

	/* Edit form styles */
	.edit-form {
		padding: 0.5rem;
		background: #fef3c7;
		border-radius: 6px;
		margin-bottom: 0.5rem;
	}

	.edit-name-input,
	.edit-description-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		font-family: inherit;
	}

	.edit-name-input:focus,
	.edit-description-input:focus {
		outline: none;
		border-color: #f59e0b;
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
	}

	.edit-description-input {
		resize: vertical;
		min-height: 2.5rem;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.save-btn,
	.cancel-btn {
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.save-btn {
		background: #10b981;
		color: white;
	}

	.save-btn:hover {
		background: #059669;
	}

	.cancel-btn {
		background: #6b7280;
		color: white;
	}

	.cancel-btn:hover {
		background: #4b5563;
	}
</style>
