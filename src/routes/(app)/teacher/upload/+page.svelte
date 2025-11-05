<script>
        import { onMount } from 'svelte';
        import { writable } from 'svelte/store';
        import ImageManager from '$lib/components/ImageManager.svelte';
        import {
                uploadTestData,
                getTestsForTeacher,
                getTestQuestions,
                processQuestionWithImages,
                getTeacherImages
        } from '$lib/api';
        import { parseTestData } from '$lib/teacher/upload/parser';

        export let data;

        const tests = writable(data.tests ?? []);
        const teacherId = data.teacherId;

        let testData = $state('');
        let title = $state('');
        let uploadMsg = $state('');
        let error = $state('');
        let selectedTestId = $state('');
        let updateMode = $state(false);
        let appendMode = $state(false);
        let preview = $state({ questions: [], sections: [], errors: [] });
        let existingQuestions = $state([]);
        let isUploading = $state(false);
        let uploadProgress = $state(0);
        let showTemplateModal = $state(false);
        let showImageManager = $state(false);
        let imageManagerMode = $state('manage');
        let selectedImages = $state([]);
        let teacherImages = $state(data.teacherImages ?? []);

        async function refreshTests() {
                try {
                        const latest = await getTestsForTeacher(fetch);
                        tests.set(latest);
                } catch (err) {
                        error = err.message || 'Unable to refresh tests.';
                }
        }

        async function refreshTeacherImages() {
                try {
                        teacherImages = await getTeacherImages(fetch, teacherId);
                } catch (err) {
                        console.error('Failed to refresh teacher images:', err);
                }
        }

        function showTemplate() {
                showTemplateModal = true;
        }

        function hideTemplateModal() {
                showTemplateModal = false;
        }

        function getTemplateContent() {
                return `[SECTION:Constitutional Law:3]
1,"When must an appellate court have subject-matter jurisdiction?","When the notice of appeal is filed","When oral argument occurs","When a decision is issued","All of the above",d
2,"What is the primary source of law in most legal systems?",Constitution,Statutes,"Case Law",Regulations,a
3,"Which amendment to the US Constitution protects freedom of speech?",First,Second,Fourth,Fifth,a
4,"The Fourth Amendment protects against what type of searches?","All searches","Unreasonable searches","Police searches","Federal searches",b
5,"What is the supremacy clause?","Makes federal law supreme","Gives states power","Limits Congress","Creates courts",a

[SECTION:Contract Law:2]
6,"In contract law, what is consideration?","A written document","Something of value exchanged","A court hearing","Legal advice",b
7,"What makes a contract legally binding?",Writing,Signatures,"Offer and acceptance",Witnesses,c
8,"What does 'pro bono' mean in legal terms?","For the public good (free legal work)","Professional bonus","Proven guilty","Private business",a
9,"Which court has the highest authority in the US legal system?","District Court","Court of Appeals","Supreme Court","State Court",c

[SECTION:Essay Questions:1]
10,"Explain the difference between civil and criminal law, including examples of each."
11,"Discuss the concept of precedent in common law systems and how it affects legal decision-making."
12,"Analyze the relationship between federal and state jurisdiction in the US legal system."`;
        }

        function copyTemplateToTextarea() {
                testData = getTemplateContent();
                hideTemplateModal();
        }

        function downloadTemplate() {
                const csvContent = getTemplateContent();
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'law_test_template.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
        }

        async function loadExistingQuestions() {
                if (!updateMode || !selectedTestId) {
                        existingQuestions = [];
                        return;
                }

                try {
                        existingQuestions = await getTestQuestions(fetch, {
                                testId: selectedTestId
                        });
                } catch (err) {
                        existingQuestions = [];
                        console.error('Failed to load existing questions:', err);
                }
        }

        function compareQuestions(newQuestions, existingQuestions) {
                const existingMap = new Map();
                existingQuestions.forEach((q) => {
                        existingMap.set(q.questionId, q);
                });

                return newQuestions.map((newQ) => {
                        const existing = existingMap.get(newQ.questionId);
                        if (!existing) {
                                return { ...newQ, status: 'added' };
                        }

                        const questionChanged = existing.questionText !== newQ.questionText;
                        const choicesChanged = existing.choices.some((existingChoice, index) => {
                                const newChoice = newQ.choices[index];
                                return (
                                        !newChoice ||
                                        existingChoice.text !== newChoice.text ||
                                        existingChoice.isCorrect !== newChoice.isCorrect
                                );
                        });

                        if (questionChanged || choicesChanged) {
                                return { ...newQ, status: 'changed' };
                        }

                        return { ...newQ, status: 'unchanged' };
                });
        }

        function showImageManagerModal() {
                imageManagerMode = 'manage';
                showImageManager = true;
        }

        function showImagePicker() {
                imageManagerMode = 'select';
                showImageManager = true;
        }

        function hideImageManager() {
                showImageManager = false;
        }

        function handleImagesUploaded() {
                refreshTeacherImages();
                showImageManager = false;
        }

        function handleImageDeleted() {
                refreshTeacherImages();
        }

        async function updatePreview() {
                const parsed = parseTestData(testData);
                let questions;

                if (updateMode && existingQuestions.length > 0) {
                        questions = compareQuestions(parsed.questions, existingQuestions);
                } else {
                        questions = parsed.questions.map((q) => ({ ...q, status: 'added' }));
                }

                if (questions.length > 0) {
                        for (let i = 0; i < questions.length; i++) {
                                const question = questions[i];
                                try {
                                        const processed = await processQuestionWithImages(fetch, {
                                                questionText: question.questionText,
                                                teacherId
                                        });
                                        question.processed_text = processed.processedText;
                                        question.image_references = processed.imageReferences;
                                } catch (err) {
                                        console.error('Failed to process question template:', err);
                                        question.processed_text = question.questionText;
                                        question.image_references = [];
                                }
                        }
                }

                preview = { questions, sections: parsed.sections, errors: parsed.errors };
        }

        async function handleUpload() {
                error = '';
                uploadMsg = '';

                if (!title.trim()) {
                        error = 'A test title is required.';
                        return;
                }

                if (!testData.trim()) {
                        error = 'Provide CSV or tab-separated test data before uploading.';
                        return;
                }

                isUploading = true;
                uploadProgress = 10;

                try {
                        const testId = updateMode && selectedTestId ? selectedTestId : undefined;
                        await uploadTestData(fetch, {
                                data: testData,
                                title: title.trim(),
                                testId,
                                appendMode
                        });

                        uploadProgress = 90;
                        await refreshTests();

                        uploadProgress = 100;
                        uploadMsg = updateMode ? 'Test updated successfully.' : 'Test created successfully.';
                        testData = '';
                        title = '';
                        appendMode = false;
                        if (updateMode) {
                                selectedTestId = '';
                        }
                        updateMode = false;
                        existingQuestions = [];
                        preview = { questions: [], sections: [], errors: [] };
                } catch (err) {
                        error = err.message || 'Upload failed.';
                } finally {
                        isUploading = false;
                        setTimeout(() => {
                                uploadProgress = 0;
                        }, 400);
                }
        }

        onMount(() => {
                if (!data.tests?.length) {
                        refreshTests();
                }
                if (!data.teacherImages?.length) {
                        refreshTeacherImages();
                }
        });

        $effect(updatePreview);

        $effect(() => {
                if (updateMode && selectedTestId) {
                        loadExistingQuestions();
                } else {
                        existingQuestions = [];
                }
        });
</script>

<section class="upload-shell" aria-labelledby="upload-heading">
        <header class="page-header">
                <h1 id="upload-heading">Upload or update tests</h1>
                <p>Paste CSV data, preview questions, and publish to your roster from a dedicated workspace.</p>
        </header>

        {#if error}
                <div class="alert error">{error}</div>
        {/if}
        {#if uploadMsg}
                <div class="alert success">{uploadMsg}</div>
        {/if}

        <div class="upload-grid">
                <div class="upload-card" aria-labelledby="upload-form-heading">
                        <h2 id="upload-form-heading">Configuration</h2>

                        <div class="field">
                                <label for="mode-selector">Mode</label>
                                <div id="mode-selector" class="segmented">
                                        <label>
                                                <input type="radio" bind:group={updateMode} value={false} />
                                                <span>🆕 Create new test</span>
                                        </label>
                                        <label>
                                                <input type="radio" bind:group={updateMode} value={true} />
                                                <span>🔄 Update existing test</span>
                                        </label>
                                </div>
                        </div>

                        {#if updateMode}
                                <div class="field">
                                        <label for="test-select">Choose a test to update</label>
                                        <select
                                                id="test-select"
                                                class="select"
                                                bind:value={selectedTestId}
                                                on:change={() => {
                                                        const test = $tests.find((t) => t.id == selectedTestId);
                                                        if (test) {
                                                                title = test.title;
                                                        }
                                                }}
                                        >
                                                <option value="">Select a test…</option>
                                                {#each $tests as test (test.id)}
                                                        <option value={test.id}>
                                                                {test.title}
                                                        </option>
                                                {/each}
                                        </select>
                                </div>

                                {#if selectedTestId}
                                        <div class="field inline">
                                                <label class="checkbox">
                                                        <input type="checkbox" bind:checked={appendMode} />
                                                        <span>Add questions without replacing existing ones</span>
                                                </label>
                                        </div>
                                {/if}
                        {/if}

                        <div class="field">
                                <label for="test-title">Test title</label>
                                <input
                                        id="test-title"
                                        class="input"
                                        bind:value={title}
                                        placeholder="eg. Constitutional law midterm"
                                />
                        </div>

                        <div class="field">
                                <div class="template-toolbar" role="group" aria-label="Template helpers">
                                        <button type="button" class="btn" on:click={showTemplate}>
                                                <span aria-hidden="true">👁️</span>
                                                Preview template
                                        </button>
                                        <button type="button" class="btn" on:click={downloadTemplate}>
                                                <span aria-hidden="true">📥</span>
                                                Download CSV
                                        </button>
                                        <button type="button" class="btn" on:click={showImageManagerModal}>
                                                <span aria-hidden="true">🖼️</span>
                                                Manage images ({teacherImages.length})
                                        </button>
                                </div>
                        </div>

                        <div class="field">
                                <label for="test-data">Test data</label>
                                <textarea
                                        id="test-data"
                                        class="textarea"
                                        bind:value={testData}
                                        rows="16"
                                        placeholder="Paste questions, answers, and the correct choice letter"
                                ></textarea>
                        </div>

                        <div class="actions">
                                <button
                                        type="button"
                                        class="primary"
                                        on:click={handleUpload}
                                        disabled={isUploading || !title.trim() || !testData.trim() || (updateMode && !selectedTestId)}
                                >
                                        {#if isUploading}
                                                <span class="spinner" aria-hidden="true"></span>
                                                Uploading…
                                        {:else}
                                                Publish
                                        {/if}
                                </button>
                                <div class="progress" role="status" aria-live="polite" aria-label="Upload progress">
                                        {#if uploadProgress > 0}
                                                <div class="progress-bar" style={`width: ${uploadProgress}%`}></div>
                                        {/if}
                                </div>
                        </div>
                </div>

                <aside class="preview-card" aria-live="polite">
                        <div class="preview-header">
                                <h2>Preview</h2>
                                <p>
                                        {#if preview.questions.length}
                                                {preview.questions.length} question{preview.questions.length === 1 ? '' : 's'} parsed
                                        {:else}
                                                Paste content to generate a preview.
                                        {/if}
                                </p>
                                <button type="button" class="btn subtle" on:click={showImagePicker}>
                                        <span aria-hidden="true">➕</span>
                                        Insert image placeholders
                                </button>
                        </div>

                        {#if preview.errors.length}
                                <div class="alert warning">
                                        <h3>Parsing issues</h3>
                                        <ul>
                                                {#each preview.errors as issue}
                                                        <li>{issue}</li>
                                                {/each}
                                        </ul>
                                </div>
                        {/if}

                        <div class="preview-list" role="list">
                                {#if !preview.questions.length}
                                        <p class="empty">No questions yet — paste CSV content to see a structured preview.</p>
                                {:else}
                                        {#each preview.sections as section (section.name)}
                                                <section class="preview-section" aria-labelledby={`section-${section.order}`}>
                                                        <header class="section-header">
                                                                <h3 id={`section-${section.order}`}>{section.name}</h3>
                                                                <span>{section.questions.length} questions</span>
                                                        </header>
                                                        <ul>
                                                                {#each section.questions as question, index (`${section.order}-${index}`)}
                                                                        <li class={`status-${question.status}`}>
                                                                                <div class="question-meta">
                                                                                        <span class="qid">#{question.questionId}</span>
                                                                                        <span class="badge">{question.status}</span>
                                                                                </div>
                                                                                <p>{question.processed_text ?? question.questionText}</p>
                                                                                {#if !question.isLongResponse && question.choices.length}
                                                                                        <ol class="choice-list" type="A">
                                                                                                {#each question.choices as choice}
                                                                                                        <li class:correct={choice.isCorrect}>{choice.text}</li>
                                                                                                {/each}
                                                                                        </ol>
                                                                                {:else}
                                                                                        <p class="long-answer">Open response</p>
                                                                                {/if}
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                </section>
                                        {/each}
                                {/if}
                        </div>
                </aside>
        </div>

        {#if showTemplateModal}
                <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="template-heading">
                        <div class="modal" onclick|stopPropagation>
                                <header class="modal-header">
                                        <h2 id="template-heading">CSV template</h2>
                                        <button type="button" class="icon-btn" on:click={hideTemplateModal} aria-label="Close template">
                                                &times;
                                        </button>
                                </header>
                                <pre class="modal-body">{getTemplateContent()}</pre>
                                <footer class="modal-footer">
                                        <button class="btn" on:click={copyTemplateToTextarea}>Use template</button>
                                        <button class="btn" on:click={downloadTemplate}>Download</button>
                                </footer>
                        </div>
                </div>
        {/if}

        {#if showImageManager}
                <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="image-manager-heading" on:click={hideImageManager}>
                        <div class="modal wide" onclick|stopPropagation>
                                <header class="modal-header">
                                        <h2 id="image-manager-heading">Teacher image library</h2>
                                        <button type="button" class="icon-btn" on:click={hideImageManager} aria-label="Close image manager">
                                                &times;
                                        </button>
                                </header>
                                <div class="modal-body">
                                        <ImageManager
                                                images={teacherImages}
                                                {selectedImages}
                                                mode={imageManagerMode}
                                                on:imagesUploaded={handleImagesUploaded}
                                                on:imageDeleted={handleImageDeleted}
                                                on:selectionChanged={(event) => (selectedImages = event.detail)}
                                        />
                                </div>
                        </div>
                </div>
        {/if}
</section>

<style>
        .upload-shell {
                display: flex;
                flex-direction: column;
                gap: 2.5rem;
        }

        .page-header h1 {
                font-size: 2rem;
                margin: 0;
        }

        .page-header p {
                margin: 0.5rem 0 0;
                color: #475569;
        }

        .alert {
                padding: 0.75rem 1rem;
                border-radius: 12px;
                font-size: 0.95rem;
        }

        .alert.error {
                background: rgba(239, 68, 68, 0.1);
                color: #b91c1c;
        }

        .alert.success {
                background: rgba(16, 185, 129, 0.12);
                color: #047857;
        }

        .alert.warning {
                background: rgba(250, 204, 21, 0.14);
                color: #b45309;
                border-radius: 12px;
        }

        .upload-grid {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 420px;
                gap: 2rem;
        }

        .upload-card,
        .preview-card {
                background: #0f172a08;
                border-radius: 24px;
                padding: 2rem;
                background: white;
                border: 1px solid rgba(15, 23, 42, 0.08);
                box-shadow: 0 20px 45px -32px rgba(15, 23, 42, 0.45);
        }

        .upload-card h2,
        .preview-card h2 {
                margin-top: 0;
        }

        .field {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1.25rem;
        }

        .field.inline {
                flex-direction: row;
                align-items: center;
        }

        label {
                font-weight: 600;
                color: #0f172a;
        }

        .input,
        .textarea,
        .select {
                width: 100%;
                border-radius: 12px;
                border: 1px solid rgba(148, 163, 184, 0.5);
                padding: 0.75rem 1rem;
                font-size: 1rem;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .textarea {
                resize: vertical;
                min-height: 260px;
                font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
                        'Liberation Mono', 'Courier New', monospace;
        }

        .input:focus,
        .textarea:focus,
        .select:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }

        .segmented {
                display: flex;
                gap: 0.75rem;
        }

        .segmented label {
                flex: 1;
                border: 1px solid rgba(148, 163, 184, 0.6);
                border-radius: 12px;
                padding: 0.75rem 1rem;
                display: flex;
                gap: 0.5rem;
                align-items: center;
                cursor: pointer;
                font-weight: 500;
        }

        .segmented input {
                accent-color: #2563eb;
        }

        .checkbox {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                font-weight: 500;
        }

        .template-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
        }

        .btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                border-radius: 10px;
                padding: 0.6rem 0.9rem;
                border: 1px solid rgba(15, 23, 42, 0.12);
                background: white;
                cursor: pointer;
                font-weight: 500;
        }

        .btn:hover {
                border-color: rgba(37, 99, 235, 0.35);
                color: #2563eb;
        }

        .btn.subtle {
                border-style: dashed;
        }

        .actions {
                display: flex;
                align-items: center;
                gap: 1rem;
        }

        .primary {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                border: none;
                padding: 0.85rem 1.5rem;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                gap: 0.6rem;
                align-items: center;
        }

        .primary[disabled] {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .spinner {
                width: 1rem;
                height: 1rem;
                border-radius: 9999px;
                border: 2px solid rgba(255, 255, 255, 0.45);
                border-top-color: white;
                animation: spin 0.8s linear infinite;
        }

        .progress {
                flex: 1;
                height: 0.5rem;
                background: rgba(148, 163, 184, 0.2);
                border-radius: 9999px;
                position: relative;
                overflow: hidden;
        }

        .progress-bar {
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                background: linear-gradient(135deg, #34d399, #10b981);
                border-radius: inherit;
                transition: width 0.3s ease;
        }

        .preview-header {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1rem;
        }

        .preview-list {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
        }

        .empty {
                color: #94a3b8;
                font-style: italic;
        }

        .preview-section ul {
                list-style: none;
                margin: 1rem 0 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 1rem;
        }

        .preview-section li {
                padding: 1rem;
                border-radius: 14px;
                border: 1px solid rgba(148, 163, 184, 0.35);
                background: rgba(248, 250, 252, 0.65);
        }

        .preview-section li.status-added {
                border-color: rgba(74, 222, 128, 0.35);
                background: rgba(74, 222, 128, 0.08);
        }

        .preview-section li.status-changed {
                border-color: rgba(251, 191, 36, 0.35);
                background: rgba(251, 191, 36, 0.08);
        }

        .question-meta {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
        }

        .qid {
                color: #64748b;
                font-weight: 600;
        }

        .badge {
                background: rgba(15, 23, 42, 0.08);
                color: #0f172a;
                padding: 0.125rem 0.5rem;
                border-radius: 9999px;
                font-size: 0.7rem;
                text-transform: uppercase;
        }

        .choice-list {
                margin: 0.75rem 0 0;
                padding-left: 1.5rem;
                display: grid;
                gap: 0.25rem;
        }

        .choice-list li.correct {
                font-weight: 600;
                color: #15803d;
        }

        .long-answer {
                margin: 0.75rem 0 0;
                color: #0f172a;
                font-style: italic;
        }

        .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.45);
                display: grid;
                place-items: center;
                padding: 2rem;
                z-index: 1200;
        }

        .modal {
                background: white;
                border-radius: 20px;
                width: min(720px, 100%);
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
        }

        .modal.wide {
                width: min(960px, 100%);
        }

        .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.25rem 1.5rem;
                border-bottom: 1px solid rgba(148, 163, 184, 0.25);
        }

        .modal-body {
                padding: 1.5rem;
                overflow: auto;
        }

        .modal-footer {
                padding: 1rem 1.5rem 1.5rem;
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
        }

        .icon-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #475569;
        }

        .icon-btn:hover {
                color: #2563eb;
        }

        pre {
                margin: 0;
                background: rgba(15, 23, 42, 0.05);
                padding: 1rem;
                border-radius: 12px;
                overflow: auto;
        }

        @media (max-width: 1100px) {
                .upload-grid {
                        grid-template-columns: 1fr;
                }

                .preview-card {
                        order: -1;
                }
        }

        @keyframes spin {
                to {
                        transform: rotate(360deg);
                }
        }
</style>
