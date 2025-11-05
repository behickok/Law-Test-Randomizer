export function parseLine(line) {
        const delimiter = line.includes('\t') ? '\t' : ',';
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
                const char = line[i];

                if (char === '"' && (i === 0 || line[i - 1] === delimiter || inQuotes)) {
                        if (inQuotes && line[i + 1] === '"') {
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

export function parseTestData(data) {
        if (!data.trim()) {
                return { questions: [], sections: [], errors: [] };
        }

        const lines = data
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);

        const sections = [];
        const errors = [];
        let currentSection = null;
        let sectionOrder = 1;
        let lineNum = 0;

        for (const line of lines) {
                lineNum++;
                const cols = parseLine(line);

                if (cols.length === 1 && cols[0].startsWith('[SECTION:') && cols[0].endsWith(']')) {
                        const sectionDef = cols[0].slice(9, -1);
                        const sectionParts = sectionDef.split(':');
                        if (sectionParts.length >= 2) {
                                const sectionName = sectionParts[0].trim();
                                const totalQuestions = parseInt(sectionParts[1]) || 1;

                                currentSection = {
                                        name: sectionName,
                                        order: sectionOrder++,
                                        totalQuestions,
                                        questions: [],
                                        status: 'new'
                                };
                                sections.push(currentSection);
                        }
                        continue;
                }

                if (cols.length < 2) {
                        errors.push(
                                `Line ${lineNum}: Malformed line, skipping. Found ${cols.length} columns, expected at least 2.`
                        );
                        continue;
                }

                const questionId = cols[0].trim();
                const questionText = cols[1].trim();

                let isLongResponse = cols.length === 2 || (cols.length > 2 && cols.slice(2).every((col) => !col.trim()));
                let choices = [];

                if (!isLongResponse) {
                        if (cols.length >= 7) {
                                const answer1 = cols[2].trim();
                                const answer2 = cols[3].trim();
                                const answer3 = cols[4].trim();
                                const answer4 = cols[5].trim();
                                const correctAnswer = cols[6].trim().toLowerCase();

                                if (!answer1 && !answer2 && !answer3 && !answer4) {
                                        isLongResponse = true;
                                } else {
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

                                        choices = [
                                                { text: answer1, isCorrect: correctIndex === 0 },
                                                { text: answer2, isCorrect: correctIndex === 1 },
                                                { text: answer3, isCorrect: correctIndex === 2 },
                                                { text: answer4, isCorrect: correctIndex === 3 }
                                        ];
                                }
                        } else {
                                isLongResponse = true;
                        }
                }

                const question = {
                        questionId,
                        questionText,
                        choices,
                        isLongResponse,
                        status: 'new'
                };

                if (!currentSection) {
                        currentSection = {
                                name: 'Default Section',
                                order: sectionOrder++,
                                totalQuestions: 999,
                                questions: [],
                                status: 'new'
                        };
                        sections.push(currentSection);
                }

                currentSection.questions.push(question);
        }

        const allQuestions = [];
        sections.forEach((section) => {
                section.questions.forEach((question) => {
                        question.sectionName = section.name;
                        question.sectionOrder = section.order;
                        question.sectionTotalQuestions = section.totalQuestions;
                        allQuestions.push(question);
                });
        });

        return { questions: allQuestions, sections, errors };
}
