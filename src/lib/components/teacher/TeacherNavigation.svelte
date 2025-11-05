<script>
        import { page } from '$app/stores';
        import { derived } from 'svelte/store';
        import { teacherNavItems } from '$lib/teacher/navigation';

        const activePath = derived(page, ($page) => $page.url.pathname);
</script>

<nav class="teacher-nav" aria-label="Teacher workspace">
        <h1 class="nav-title">Teacher workspace</h1>
        <p class="nav-subtitle">Focus on one job at a time with the new flow-specific dashboard.</p>
        <ul class="nav-list">
                {#each teacherNavItems as item}
                        <li class:current={$activePath.startsWith(item.href)}>
                                {#if item.status === 'available'}
                                        <a href={item.href} aria-current={$activePath.startsWith(item.href) ? 'page' : undefined}>
                                                <span class="item-icon" aria-hidden="true">{item.icon}</span>
                                                <span class="item-content">
                                                        <span class="item-label">{item.label}</span>
                                                        <span class="item-description">{item.description}</span>
                                                </span>
                                        </a>
                                {:else}
                                        <span class="disabled">
                                                <span class="item-icon" aria-hidden="true">{item.icon}</span>
                                                <span class="item-content">
                                                        <span class="item-label">{item.label}</span>
                                                        <span class="item-description">{item.description}</span>
                                                </span>
                                                <span class="pill">Coming soon</span>
                                        </span>
                                {/if}
                        </li>
                {/each}
        </ul>
</nav>

<style>
        .teacher-nav {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                background: #f8fafc;
                border-radius: 20px;
                padding: 1.5rem;
                border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .nav-title {
                font-size: 1.25rem;
                margin: 0;
                color: #0f172a;
                font-weight: 600;
        }

        .nav-subtitle {
                margin: 0;
                color: #475569;
                font-size: 0.95rem;
        }

        .nav-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
        }

        li {
                border-radius: 16px;
                border: 1px solid transparent;
                transition: all 0.2s ease;
        }

        li.current {
                border-color: rgba(37, 99, 235, 0.25);
                box-shadow: 0 8px 16px -12px rgba(37, 99, 235, 0.5);
                background: rgba(37, 99, 235, 0.08);
        }

        a,
        .disabled {
                display: flex;
                gap: 0.75rem;
                align-items: center;
                padding: 1rem;
                border-radius: 16px;
                text-decoration: none;
                color: inherit;
        }

        a:hover {
                background: white;
                border-radius: 16px;
                box-shadow: 0 6px 12px -12px rgba(15, 23, 42, 0.3);
        }

        .disabled {
                background: rgba(148, 163, 184, 0.12);
                color: #94a3b8;
                cursor: not-allowed;
                position: relative;
        }

        .item-icon {
                font-size: 1.5rem;
        }

        .item-content {
                display: flex;
                flex-direction: column;
                gap: 0.125rem;
        }

        .item-label {
                font-weight: 600;
                color: #0f172a;
        }

        .item-description {
                font-size: 0.875rem;
                color: #475569;
        }

        .pill {
                margin-left: auto;
                background: white;
                color: #2563eb;
                font-weight: 600;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                border: 1px solid rgba(37, 99, 235, 0.15);
        }

        @media (max-width: 960px) {
                .teacher-nav {
                        padding: 1.25rem;
                }

                a,
                .disabled {
                        flex-direction: column;
                        align-items: flex-start;
                }

                .pill {
                        margin: 0;
                        margin-top: 0.5rem;
                }
        }
</style>
