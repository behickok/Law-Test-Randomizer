const NUMERIC_PATTERN = /^\d+$/;

function formatField(fieldName) {
        return fieldName || 'value';
}

export function requireUser(locals) {
        const user = locals?.user ?? null;
        if (!user) {
                const error = new Error('Authentication required');
                error.status = 401;
                throw error;
        }
        return user;
}

export function requireTeacher(locals) {
        const user = requireUser(locals);
        if (user.role !== 'teacher') {
                const error = new Error('Teacher access required');
                error.status = 403;
                throw error;
        }
        if (typeof user.id !== 'number') {
                const error = new Error('Teacher account is missing an id');
                error.status = 500;
                throw error;
        }
        return user;
}

export function resolveTeacherId(locals, providedId, fieldName = 'teacherId') {
        const teacher = requireTeacher(locals);
        if (providedId === undefined || providedId === null || providedId === '') {
                return teacher.id;
        }

        const value = String(providedId);
        if (!NUMERIC_PATTERN.test(value)) {
                const error = new Error(`${formatField(fieldName)} must be numeric`);
                error.status = 400;
                throw error;
        }

        const numeric = Number(value);
        if (numeric !== teacher.id) {
                const error = new Error('Access denied for requested teacher');
                error.status = 403;
                throw error;
        }

        return teacher.id;
}
