<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user } from '$lib/user';
    import { joinClassWithInviteCode } from '$lib/api';
    import { goto } from '$app/navigation';

    let message = 'Joining class...';

    onMount(async () => {
        if (!$user || $user.role !== 'student') {
            goto('/login');
            return;
        }

        const inviteCode = $page.params.invite_code;
        if (!inviteCode) {
            message = 'No invite code provided.';
            return;
        }

        try {
            await joinClassWithInviteCode(fetch, {
                studentId: $user.id,
                inviteCode
            });
            message = 'Successfully joined class! Redirecting...';
            setTimeout(() => {
                goto('/'); // Redirect to student dashboard or home
            }, 2000);
        } catch (error) {
            console.error(error);
            message = 'Failed to join class. The invite code may be invalid.';
        }
    });
</script>

<h1>{message}</h1>
