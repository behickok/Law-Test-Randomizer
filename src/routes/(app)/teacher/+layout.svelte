<script>
        import TeacherNavigation from '$lib/components/teacher/TeacherNavigation.svelte';
        import { page } from '$app/stores';
        import { derived } from 'svelte/store';

        export let data;

        const pageTitle = derived(page, ($page) => {
                const [_, section] = $page.url.pathname.split('/teacher/');
                if (!section) return 'Teacher workspace';
                const label = section.split('/')[0] ?? '';
                if (!label) return 'Teacher workspace';
                return label
                        .split('-')
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ');
        });
</script>

<svelte:head>
        <title>{$pageTitle} • Law Test Randomizer</title>
</svelte:head>

<div class="workspace-shell">
        <aside class="workspace-nav">
                <TeacherNavigation />
                <div class="legacy-link">
                        <span>Need the classic dashboard?</span>
                        <a href="/">Open legacy view</a>
                </div>
        </aside>
        <section class="workspace-content" aria-live="polite">
                <slot />
        </section>
</div>

<style>
        .workspace-shell {
                display: grid;
                grid-template-columns: minmax(260px, 320px) 1fr;
                gap: 2rem;
                max-width: 1200px;
                margin: 2rem auto;
                padding: 0 1.5rem 3rem;
        }

        .workspace-nav {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                position: sticky;
                top: 6.5rem;
                height: fit-content;
        }

        .legacy-link {
                display: flex;
                flex-direction: column;
                gap: 0.375rem;
                background: rgba(15, 23, 42, 0.04);
                border-radius: 16px;
                padding: 1rem 1.25rem;
                border: 1px dashed rgba(15, 23, 42, 0.1);
                color: #334155;
                font-size: 0.9rem;
        }

        .legacy-link a {
                color: #2563eb;
                font-weight: 600;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
        }

        .legacy-link a::after {
                content: '↗';
                font-size: 0.85em;
        }

        .legacy-link a:hover {
                text-decoration: underline;
        }

        .workspace-content {
                background: white;
                border-radius: 24px;
                padding: 2.5rem;
                box-shadow: 0 24px 50px -30px rgba(15, 23, 42, 0.35);
                border: 1px solid rgba(15, 23, 42, 0.08);
                min-height: calc(100vh - 8rem);
        }

        @media (max-width: 1024px) {
                .workspace-shell {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                        padding: 0 1rem 2.5rem;
                }

                .workspace-nav {
                        position: static;
                }

                .workspace-content {
                        padding: 1.75rem;
                }
        }
</style>
