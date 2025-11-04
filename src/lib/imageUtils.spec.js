import { describe, expect, it } from 'vitest';
import {
	validateImageFile,
	extractImageReferences,
	validateTemplateSyntax,
	formatFileSize,
	generateImageName,
	processCsvWithImageTemplates
} from './imageUtils.js';

describe('imageUtils', () => {
	describe('validateImageFile', () => {
		it('accepts supported image files within size limit', () => {
			const file = { type: 'image/png', size: 1024 };
			expect(validateImageFile(file)).toBe(true);
		});

		it('rejects missing file object', () => {
			expect(() => validateImageFile(null)).toThrow('No file selected');
		});

		it('rejects unsupported mime types', () => {
			const file = { type: 'application/pdf', size: 1024 };
			expect(() => validateImageFile(file)).toThrow(
				'Invalid file type. Please use JPEG, PNG, GIF, or WebP images.'
			);
		});

		it('rejects files that exceed size limit', () => {
			const file = { type: 'image/jpeg', size: 6 * 1024 * 1024 };
			expect(() => validateImageFile(file)).toThrow('File too large. Maximum size is 5MB.');
		});
	});

	describe('extractImageReferences', () => {
		it('returns trimmed template names from question text', () => {
			const references = extractImageReferences('Text {{ image_one }} and {{second-image}} here');
			expect(references).toEqual(['image_one', 'second-image']);
		});

		it('returns empty list when no templates found', () => {
			expect(extractImageReferences('No templates')).toEqual([]);
		});
	});

	describe('validateTemplateSyntax', () => {
		it('detects mismatched braces and empty templates', () => {
			const errors = validateTemplateSyntax('Start {{image}} middle {{ }} end {{missing');
			expect(errors).toEqual([
				'Mismatched template braces. Make sure all {{image_name}} templates are properly closed.',
				'Empty templates found. Please provide image names inside {{}}.',
				'Invalid image name "". Use only letters, numbers, underscores, and hyphens.'
			]);
		});

		it('flags invalid characters in template names', () => {
			const errors = validateTemplateSyntax('Content {{invalid name}} {{ok_name}}');
			expect(errors).toContain(
				'Invalid image name "invalid name". Use only letters, numbers, underscores, and hyphens.'
			);
			expect(errors).not.toContain(
				'Invalid image name "ok_name". Use only letters, numbers, underscores, and hyphens.'
			);
		});

		it('returns empty array for valid syntax', () => {
			expect(validateTemplateSyntax('Question {{valid_name}} text')).toEqual([]);
		});
	});

	describe('formatFileSize', () => {
		it('formats zero bytes', () => {
			expect(formatFileSize(0)).toBe('0 Bytes');
		});

		it('formats bytes using binary prefixes', () => {
			expect(formatFileSize(1024)).toBe('1 KB');
			expect(formatFileSize(1048576)).toBe('1 MB');
			expect(formatFileSize(1536)).toBe('1.5 KB');
		});
	});

	describe('generateImageName', () => {
		it('normalizes filename and ensures uniqueness', () => {
			const existing = ['diagram', 'diagram_1'];
			expect(generateImageName('Diagram.PNG', existing)).toBe('diagram_2');
		});

		it('prefixes names starting with a digit', () => {
			expect(generateImageName('123-start.png')).toBe('img_123-start');
		});

		it('replaces special characters with underscores', () => {
			expect(generateImageName('Case Study (Final).jpg')).toBe('case_study__final_');
		});
	});

	describe('processCsvWithImageTemplates', () => {
		it('replaces known image templates and leaves unknown intact', () => {
			const csv = 'Question {{known}}\nAnother {{unknown}}';
			const processed = processCsvWithImageTemplates(csv, { known: 'image-data' });
			expect(processed).toBe('Question [IMAGE:known]\nAnother {{unknown}}');
		});
	});
});
