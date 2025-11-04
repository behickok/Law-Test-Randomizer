export function requireTeacher(locals) {
	if (!locals?.user || locals.user.role !== 'teacher') {
		const error = new Error('Unauthorized');
		error.status = 401;
		throw error;
	}
	return locals.user;
}

export function requireReviewer(locals) {
	if (!locals?.user || locals.user.role !== 'reviewer') {
		const error = new Error('Unauthorized');
		error.status = 401;
		throw error;
	}
	return locals.user;
}

export function requireStudent(locals) {
	if (!locals?.user || locals.user.role !== 'student') {
		const error = new Error('Unauthorized');
		error.status = 401;
		throw error;
	}
	return locals.user;
}
