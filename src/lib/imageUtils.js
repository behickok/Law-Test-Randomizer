// Image utility functions for processing images in questions

/**
 * Convert file to base64 data URL
 */
export async function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
	const maxSize = 5 * 1024 * 1024; // 5MB
	const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

	if (!file) {
		throw new Error('No file selected');
	}

	if (!allowedTypes.includes(file.type)) {
		throw new Error('Invalid file type. Please use JPEG, PNG, GIF, or WebP images.');
	}

	if (file.size > maxSize) {
		throw new Error('File too large. Maximum size is 5MB.');
	}

	return true;
}

/**
 * Extract image references from question text
 */
export function extractImageReferences(questionText) {
	const matches = [...questionText.matchAll(/\{\{([^}]+)\}\}/g)];
	return matches.map((match) => match[1].trim());
}

/**
 * Validate template syntax in question text
 */
export function validateTemplateSyntax(questionText) {
	const errors = [];

	// Check for unclosed templates
	const openBraces = (questionText.match(/\{\{/g) || []).length;
	const closeBraces = (questionText.match(/\}\}/g) || []).length;

	if (openBraces !== closeBraces) {
		errors.push(
			'Mismatched template braces. Make sure all {{image_name}} templates are properly closed.'
		);
	}

	// Check for empty templates
	const emptyTemplates = questionText.match(/\{\{\s*\}\}/g);
	if (emptyTemplates) {
		errors.push('Empty templates found. Please provide image names inside {{}}.');
	}

	// Check for invalid characters in template names
	const templates = extractImageReferences(questionText);
	for (const template of templates) {
		if (!/^[a-zA-Z0-9_-]+$/.test(template)) {
			errors.push(
				`Invalid image name "${template}". Use only letters, numbers, underscores, and hyphens.`
			);
		}
	}

	return errors;
}

/**
 * Get image preview for template
 */
export function getImagePreview(base64Data, maxWidth = 200, maxHeight = 150) {
	// Create a canvas element to resize the image
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const img = new Image();

	return new Promise((resolve) => {
		img.onload = function () {
			// Calculate new dimensions
			let { width, height } = this;

			if (width > maxWidth || height > maxHeight) {
				const ratio = Math.min(maxWidth / width, maxHeight / height);
				width *= ratio;
				height *= ratio;
			}

			// Resize image
			canvas.width = width;
			canvas.height = height;
			ctx.drawImage(this, 0, 0, width, height);

			resolve(canvas.toDataURL());
		};

		img.src = base64Data;
	});
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique image name from filename
 */
export function generateImageName(filename, existingNames = []) {
	// Remove extension and clean up filename
	let baseName = filename
		.replace(/\.[^/.]+$/, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.toLowerCase();

	// Ensure it doesn't start with a number
	if (/^\d/.test(baseName)) {
		baseName = 'img_' + baseName;
	}

	// Make it unique
	let finalName = baseName;
	let counter = 1;

	while (existingNames.includes(finalName)) {
		finalName = `${baseName}_${counter}`;
		counter++;
	}

	return finalName;
}

/**
 * Process CSV with image templates
 */
export function processCsvWithImageTemplates(csvText, imageMap = {}) {
	const lines = csvText.split('\n');
	const processedLines = [];

	for (const line of lines) {
		// Process each field that might contain templates
		const processedLine = line.replace(/\{\{([^}]+)\}\}/g, (match, imageName) => {
			const cleanImageName = imageName.trim();
			if (imageMap[cleanImageName]) {
				return `[IMAGE:${cleanImageName}]`; // Placeholder for CSV processing
			}
			return match;
		});

		processedLines.push(processedLine);
	}

	return processedLines.join('\n');
}
