import { runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

// This function is designed to be more robust for Excel copy-paste.
// It prioritizes tabs as delimiters, as that's common for Excel.
// It falls back to commas for CSV compatibility.
function parseLine(line) {
	const delimiter = line.includes('\t') ? '\t' : ',';
	const result = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		// The original quote handling logic is kept, but adapted for the detected delimiter.
		if (char === '"' && (i === 0 || line[i - 1] === delimiter || inQuotes)) {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i += 2;
				continue;
			}
			inQuotes = !inQuotes;
		} else if (char === delimiter && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
		i++;
	}

	result.push(current.trim());
	return result;
}

async function run(fetcher, sqlOrConfig, values) {
        if (values) {
                return runQuery(fetcher, { text: sqlOrConfig, values });
        }

        return runQuery(fetcher, sqlOrConfig);
}

export async function POST({ request, fetch, locals }) {
        const formData = await request.formData();
	const data = formData.get('data');
	const test_id = formData.get('test_id');
        const append_mode = formData.get('append_mode') === 'true'; // New parameter for adding questions

        let title = formData.get('title') || undefined;
        const teacherField = formData.get('teacher_id') ?? request.headers.get('x-teacher-id') ?? undefined;

        let teacherId;
        try {
                teacherId = resolveTeacherId(locals, teacherField, 'teacher_id');
        } catch (error) {
                return new Response(error?.message ?? 'Authentication required', {
                        status: error?.status ?? 500
                });
        }

        if (!data || !title) {
                const missingFields = [];
                if (!data) missingFields.push('data');
                if (!title) missingFields.push('title');
                return new Response(`Missing required fields: ${missingFields.join(', ')}`, {
                        status: 400
                });
        }

        // Validate test_id if provided (for updates)
        if (test_id && !/^\d+$/.test(test_id)) {
                return new Response('Invalid test_id format', { status: 400 });
        }

        const text = data;
        const lines = text
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);

        if (lines.length === 0) {
                return new Response('No rows found in provided data.', { status: 400 });
        }

        try {
                let final_test_id;
                const numericTestId = test_id ? Number(test_id) : null;

                if (test_id) {
                        // Update existing test - verify ownership first
                        const ownershipCheck = await run(fetch, {
                                text: `SELECT id FROM tests WHERE id = $1 AND teacher_id = $2`,
                                values: [numericTestId, teacherId]
                        });

                        if (ownershipCheck.length === 0) {
                                return new Response('Test not found or access denied', { status: 403 });
                        }

                        // Update test title (only if not in append mode)
                        if (!append_mode) {
                                await run(fetch, {
                                        text: `UPDATE tests SET title = $1 WHERE id = $2`,
                                        values: [title, numericTestId]
                                });
                        }

                        if (!append_mode) {
                                // Full replacement mode - delete existing data (in correct order due to foreign key constraints)
                                await run(fetch, {
                                        text: `DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE test_id = $1)`,
                                        values: [numericTestId]
                                });
                                await run(fetch, {
                                        text: `DELETE FROM questions WHERE test_id = $1`,
                                        values: [numericTestId]
                                });
                                await run(fetch, {
                                        text: `DELETE FROM sections WHERE test_id = $1`,
                                        values: [numericTestId]
                                });
                        }

                        final_test_id = numericTestId;
                } else {
                        // Create new test
                        const testRow = await run(fetch, {
                                text: `INSERT INTO tests (title, teacher_id) VALUES ($1, $2) RETURNING id`,
                                values: [title, teacherId]
                        });
                        final_test_id = Number(testRow[0].id);

                        if (!Number.isFinite(final_test_id)) {
                                throw new Error('Failed to determine created test id');
                        }
                }

		// Parse sections and questions
		const sections = new Map(); // section_name -> { order, total_questions, questions[] }
		let currentSection = null;
		let sectionOrder = 1;

		for (const line of lines) {
			const cols = parseLine(line);

			// Check if this is a section definition line
			// Format: [SECTION:SectionName:TotalQuestions]
			if (cols.length === 1 && cols[0].startsWith('[SECTION:') && cols[0].endsWith(']')) {
				const sectionDef = cols[0].slice(9, -1); // Remove [SECTION: and ]
				const sectionParts = sectionDef.split(':');
				if (sectionParts.length >= 2) {
					const sectionName = sectionParts[0].trim();
					const totalQuestions = parseInt(sectionParts[1]) || 1;

					currentSection = sectionName;
					if (!sections.has(sectionName)) {
						sections.set(sectionName, {
							order: sectionOrder++,
							total_questions: totalQuestions,
							questions: []
						});
					}
				}
				continue;
			}

			if (cols.length < 2) {
				// Skip malformed lines - need at least Question ID and Question Text
				continue;
			}

			// Extract question ID and text
                        const question_id = cols[0].trim();
                        const question_text = cols[1].trim();

			// Check if this is a long response question
			const isLongResponse =
				cols.length === 2 ||
				(cols.length > 2 && cols.slice(2).every((col) => !col.trim())) ||
				(cols.length >= 6 &&
					!cols[2].trim() &&
					!cols[3].trim() &&
					!cols[4].trim() &&
					!cols[5].trim());

			const questionData = {
				question_id,
				question_text,
				isLongResponse,
				choices: []
			};

			if (!isLongResponse && cols.length >= 7) {
                                const answer1 = cols[2].trim();
                                const answer2 = cols[3].trim();
                                const answer3 = cols[4].trim();
                                const answer4 = cols[5].trim();
				const correctAnswer = cols[6].trim().toLowerCase();

				if (answer1 || answer2 || answer3 || answer4) {
					const correctIndex =
						correctAnswer === 'a'
							? 0
							: correctAnswer === 'b'
								? 1
								: correctAnswer === 'c'
									? 2
									: correctAnswer === 'd'
										? 3
										: -1;

					questionData.choices = [
						{ text: answer1, isCorrect: correctIndex === 0 },
						{ text: answer2, isCorrect: correctIndex === 1 },
						{ text: answer3, isCorrect: correctIndex === 2 },
						{ text: answer4, isCorrect: correctIndex === 3 }
					];
					questionData.isLongResponse = false;
				}
			}

			// Add question to current section or default section
			if (!currentSection) {
				currentSection = 'Default Section';
				if (!sections.has(currentSection)) {
					sections.set(currentSection, {
						order: sectionOrder++,
						total_questions: 999, // Default to include all questions
						questions: []
					});
				}
			}

			sections.get(currentSection).questions.push(questionData);
		}

		// Insert sections and questions
		for (const [sectionName, sectionData] of sections) {
			let sectionId;

                        if (append_mode) {
                                // In append mode, find existing section or create if it doesn't exist
                                const existingSections = await run(fetch, {
                                        text: `SELECT id FROM sections WHERE test_id = $1 AND section_name = $2`,
                                        values: [final_test_id, sectionName]
                                });

                                if (existingSections.length > 0) {
                                        sectionId = existingSections[0].id;
                                } else {
                                        // Get the maximum order for new sections
                                        const maxOrderResult = await run(fetch, {
                                                text: `SELECT COALESCE(MAX(section_order), 0) as max_order FROM sections WHERE test_id = $1`,
                                                values: [final_test_id]
                                        });
                                        const nextOrder = (maxOrderResult[0]?.max_order || 0) + 1;

                                        const sectionRow = await run(fetch, {
                                                text: `INSERT INTO sections (test_id, section_name, section_order, total_questions)
                                                 VALUES ($1, $2, $3, $4)
                                                 RETURNING id`,
                                                values: [final_test_id, sectionName, nextOrder, sectionData.total_questions]
                                        });
                                        sectionId = sectionRow[0].id;
                                }
                        } else {
                                // Full replacement mode - insert new section
                                const sectionRow = await run(fetch, {
                                        text: `INSERT INTO sections (test_id, section_name, section_order, total_questions)
                                         VALUES ($1, $2, $3, $4)
                                         RETURNING id`,
                                        values: [final_test_id, sectionName, sectionData.order, sectionData.total_questions]
                                });
                                sectionId = sectionRow[0].id;
                        }

			// Insert questions for this section
			for (const questionData of sectionData.questions) {
				let question_pk_id;

                                if (append_mode) {
                                        // In append mode, check if question with this question_id already exists
                                        const existingQuestions = await run(fetch, {
                                                text: `SELECT id FROM questions WHERE test_id = $1 AND question_id = $2`,
                                                values: [final_test_id, questionData.question_id]
                                        });

                                        if (existingQuestions.length > 0) {
                                                // Update existing question
                                                question_pk_id = existingQuestions[0].id;
                                                await run(fetch, {
                                                        text: `UPDATE questions SET question_text = $1, section_id = $2
                                                         WHERE id = $3`,
                                                        values: [questionData.question_text, sectionId, question_pk_id]
                                                });

                                                // Delete existing choices for this question
                                                await run(fetch, {
                                                        text: `DELETE FROM choices WHERE question_id = $1`,
                                                        values: [question_pk_id]
                                                });
                                        } else {
                                                // Insert new question
                                                const qRow = await run(fetch, {
                                                        text: `INSERT INTO questions (test_id, question_text, question_id, points, section_id)
                                                         VALUES ($1, $2, $3, $4, $5)
                                                         RETURNING id`,
                                                        values: [
                                                                final_test_id,
                                                                questionData.question_text,
                                                                questionData.question_id,
                                                                1,
                                                                sectionId
                                                        ]
                                                });
                                                question_pk_id = qRow[0].id;
                                        }
                                } else {
                                        // Full replacement mode - insert new question
                                        const qRow = await run(fetch, {
                                                text: `INSERT INTO questions (test_id, question_text, question_id, points, section_id)
                                                 VALUES ($1, $2, $3, $4, $5)
                                                 RETURNING id`,
                                                values: [
                                                        final_test_id,
                                                        questionData.question_text,
                                                        questionData.question_id,
                                                        1,
                                                        sectionId
                                                ]
                                        });
                                        question_pk_id = qRow[0].id;
                                }

				// Insert choices if not long response
				if (!questionData.isLongResponse && questionData.choices.length > 0) {
					for (let i = 0; i < questionData.choices.length; i++) {
						const choice = questionData.choices[i];
						if (choice.text) {
                                                        await run(fetch, {
                                                                text: `INSERT INTO choices (question_id, choice_text, is_correct)
                                                                 VALUES ($1, $2, $3)`,
                                                                values: [question_pk_id, choice.text, choice.isCorrect === true]
                                                        });
                                                }
                                        }
                                }
                        }
		}

		// Respond with success
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
        } catch (err) {
                return new Response(`Import failed: ${err?.message || String(err)}`, {
                        status: err?.status ?? 500
                });
        }
}
