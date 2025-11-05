import { getTestsForTeacher, getTeacherImages } from '$lib/api';

export async function load({ fetch, parent }) {
        const { user } = await parent();

        const [tests, images] = await Promise.all([
                getTestsForTeacher(fetch).catch(() => []),
                getTeacherImages(fetch, user.id).catch(() => [])
        ]);

        return {
                tests,
                teacherId: user.id,
                teacherImages: images
        };
}
