import { getTeacherImages, getImageById, parseQuestionTemplate } from '$lib/api';
import { normaliseResult, runQuery } from '$lib/server/db';

async function processQuestionsWithImagesOptimized(fetch, questions, teacherId) {
	console.log(`🚀 Starting optimized image processing for ${questions.length} questions`);
	
	// Find all questions that have image templates
	const questionsWithImages = questions.filter(q => /\{\{[^}]+\}\}/g.test(q.text));
	
	if (questionsWithImages.length === 0) {
		console.log('ℹ️ No questions with image templates found');
		// Set processed_question_text for all questions without images
		questions.forEach(q => {
			q.processed_question_text = q.text;
		});
		return;
	}

	console.log(`📊 Found ${questionsWithImages.length} questions with images out of ${questions.length} total`);

	try {
		// Fetch teacher images once
		console.log('📥 Fetching teacher images (once)...');
		const teacherImages = await getTeacherImages(fetch, teacherId);
		console.log(`🖼️ Teacher has ${teacherImages?.length || 0} images available`);

		// Create image lookup map
		const imageMap = {};
		const imageNameToId = {};
		for (const image of teacherImages || []) {
			imageNameToId[image.name] = image.id;
		}

		// Extract all unique image names needed
		const neededImageNames = new Set();
		for (const question of questionsWithImages) {
			const matches = [...question.text.matchAll(/\{\{([^}]+)\}\}/g)];
			for (const match of matches) {
				neededImageNames.add(match[1].trim());
			}
		}

		console.log(`🔍 Need to load ${neededImageNames.size} unique images:`, Array.from(neededImageNames));

		// Batch load full image data for needed images
		const imageLoadPromises = Array.from(neededImageNames)
			.filter((name) => imageNameToId[name])
			.map(async (imageName) => {
				try {
					const fullImage = await getImageById(fetch, imageNameToId[imageName], teacherId);
					if (fullImage) {
						imageMap[imageName] = fullImage;
					}
					return imageName;
				} catch (error) {
					console.error(`❌ Failed to load image "${imageName}":`, error);
					return null;
				}
			});

		// Wait for all images to load
		await Promise.all(imageLoadPromises);
		console.log(`✅ Loaded ${Object.keys(imageMap).length} images successfully`);

		// Process questions in parallel batches of 10
		const BATCH_SIZE = 10;
		const batches = [];
		for (let i = 0; i < questions.length; i += BATCH_SIZE) {
			batches.push(questions.slice(i, i + BATCH_SIZE));
		}

		console.log(`⚡ Processing ${batches.length} batches of up to ${BATCH_SIZE} questions each`);

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);
			
			await Promise.all(batch.map(async (question) => {
				try {
					if (/\{\{[^}]+\}\}/g.test(question.text)) {
						// Question has image templates - process them
						question.processed_question_text = parseQuestionTemplate(question.text, imageMap);
					} else {
						// No image templates - use original text
						question.processed_question_text = question.text;
					}
				} catch (error) {
					console.error(`❌ Error processing question ${question.id}:`, error);
					question.processed_question_text = question.text;
				}
			}));
		}

		console.log('✅ Optimized image processing completed');

       } catch (error) {
               console.error('💥 Error in optimized image processing:', error);
               // Fallback - set all questions to use original text and flag for client-side processing
               questions.forEach(q => {
                       q.processed_question_text = q.text;
                       // Mark questions containing image templates so the client can process them later
                       if (/\{\{[^}]+\}\}/g.test(q.text)) {
                               q.needs_image_processing = true;
                       }
               });
       }
}

function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export async function load({ params, fetch }) {
	const startTime = Date.now();
	const MAX_PROCESSING_TIME = 25000; // 25 seconds to avoid gateway timeout
	
	try {
                const tData = normaliseResult(
                        await runQuery(
                                fetch,
                                `select id, title, teacher_id from tests where id = ${params.id}`
                        )
                );
                const test = tData[0];

                // Get sections for this test
                const sections = normaliseResult(
                        await runQuery(
                                fetch,
                                `select id, section_name, section_order, total_questions
                                 from sections
                                 where test_id = ${params.id}
                                 order by section_order`
                        )
                );

                // Get all questions with their section information
                const rows = normaliseResult(
                        await runQuery(
                                fetch,
                                `select q.id as question_id, q.question_text, q.points, q.section_id,
                                                s.section_name, s.section_order, s.total_questions,
                                                c.id as choice_id, c.choice_text, c.is_correct
                                 from questions q
                                 left join sections s on q.section_id = s.id
                                 left join choices c on q.id = c.question_id
                                 where q.test_id = ${params.id}
                                 order by s.section_order, q.id`
                        )
                );

		// Build questions map
		const questionsMap = new Map();
		for (const r of rows) {
			// Skip rows with invalid question_id
			if (!r.question_id) {
				console.warn('Skipping row with null/undefined question_id:', r);
				continue;
			}

			if (!questionsMap.has(r.question_id)) {
				questionsMap.set(r.question_id, {
					id: r.question_id,
					text: r.question_text,
					points: r.points || 1, // Default to 1 point if null
					section_id: r.section_id,
					section_name: r.section_name || 'Default Section',
					section_order: r.section_order || 1,
					total_questions: r.total_questions || 999,
					choices: []
				});
			}
			if (r.choice_id) {
				questionsMap.get(r.question_id).choices.push({
					id: r.choice_id,
					text: r.choice_text,
					is_correct: r.is_correct
				});
			}
		}

		// Group questions by section and randomize within each section
		const sectionGroups = new Map();
		for (const question of questionsMap.values()) {
			const sectionKey = question.section_id || 'default';
			if (!sectionGroups.has(sectionKey)) {
				sectionGroups.set(sectionKey, {
					name: question.section_name,
					order: question.section_order,
					total_questions: question.total_questions,
					questions: []
				});
			}
			sectionGroups.get(sectionKey).questions.push({
				...question,
				selected: null,
				correct: question.choices.find((c) => c.is_correct)?.id
			});
		}

		// Randomize questions within each section and select the required number
		const finalQuestions = [];
		const sortedSections = Array.from(sectionGroups.values()).sort((a, b) => a.order - b.order);

		for (const section of sortedSections) {
			const shuffledQuestions = shuffle(section.questions);
			const selectedQuestions = shuffledQuestions.slice(0, section.total_questions);
			finalQuestions.push(...selectedQuestions);
		}

		// Check if we have time for image processing
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime > MAX_PROCESSING_TIME - 5000) {
			console.log(`⏰ Skipping server-side image processing due to time constraints (${elapsedTime}ms elapsed)`);
			// Set flag so client knows to process images
			finalQuestions.forEach(q => {
				q.needs_image_processing = /\{\{[^}]+\}\}/g.test(q.text);
				q.processed_question_text = q.text;
			});
		} else {
			// Optimize image processing for large tests
			await processQuestionsWithImagesOptimized(fetch, finalQuestions, test.teacher_id);
		}

		return { test, questions: finalQuestions, sections };
	} catch (err) {
		console.error('Error loading test:', err);
		return { error: 'Failed to load test' };
	}
}
