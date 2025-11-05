export type TeacherNavItem = {
        id: string;
        label: string;
        href: string;
        icon: string;
        description: string;
        status: 'available' | 'coming-soon';
};

export const teacherNavItems: TeacherNavItem[] = [
        {
                id: 'upload',
                label: 'Upload tests',
                href: '/teacher/upload',
                icon: '📝',
                description: 'Create new assessments or update existing test banks.',
                status: 'available'
        },
        {
                id: 'assign',
                label: 'Assign & schedule',
                href: '/teacher/assign',
                icon: '📅',
                description: 'Plan releases, activate rosters, and manage visibility.',
                status: 'coming-soon'
        },
        {
                id: 'monitor',
                label: 'Monitor attempts',
                href: '/teacher/monitor',
                icon: '📊',
                description: 'Track in-progress attempts and intervene when needed.',
                status: 'coming-soon'
        },
        {
                id: 'results',
                label: 'Review results',
                href: '/teacher/results',
                icon: '📈',
                description: 'Analyse submissions, provide feedback, and export grades.',
                status: 'coming-soon'
        }
];
