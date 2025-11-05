import { redirect } from '@sveltejs/kit';

export async function load(event) {
        const { user } = await event.parent();
        if (!user || user.role !== 'teacher') {
                throw redirect(302, user ? '/' : '/login');
        }

        return {
                user,
                teacherId: user.id
        };
}
