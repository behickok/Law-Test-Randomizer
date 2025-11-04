import 'dotenv/config';
import { hashPin } from '../src/lib/server/pin.js';
import { escapeSql, normaliseResult, runQuery } from '../src/lib/server/db.js';

const TABLES = [
	{ name: 'teachers', idColumn: 'id', label: 'Teachers' },
	{ name: 'students', idColumn: 'id', label: 'Students' },
	{ name: 'reviewers', idColumn: 'id', label: 'Reviewers' }
];

function isLegacyPin(pin) {
	return typeof pin === 'string' && pin.trim().length > 0 && !pin.includes(':');
}

async function upgradeRow(table, row) {
	const hashed = hashPin(row.pin);
	const id = Number(row.id);
	if (!Number.isFinite(id)) {
		throw new Error(`Cannot migrate ${table.label} record with non-numeric id: ${row.id}`);
	}
	await runQuery(
		undefined,
		`UPDATE ${table.name}
		 SET pin = '${escapeSql(hashed)}'
		 WHERE ${table.idColumn} = ${id}`
	);
	return hashed;
}

async function upgradeTable(table) {
	const rows = normaliseResult(
		await runQuery(undefined, `SELECT ${table.idColumn} AS id, pin FROM ${table.name}`)
	);
	const legacyRows = rows.filter((row) => isLegacyPin(row.pin));
	if (legacyRows.length === 0) {
		return { table: table.label, scanned: rows.length, upgraded: 0 };
	}

	let upgraded = 0;
	for (const row of legacyRows) {
		await upgradeRow(table, row);
		upgraded += 1;
	}

	return { table: table.label, scanned: rows.length, upgraded };
}

async function main() {
	console.log('🔐 Starting PIN migration...');
	const summary = [];
	for (const table of TABLES) {
		const result = await upgradeTable(table);
		summary.push(result);
		console.log(
			` - ${result.table}: scanned ${result.scanned} rows, upgraded ${result.upgraded} legacy PINs`
		);
	}
	console.log('✅ Migration sweep complete.');
	return summary;
}

main().catch((error) => {
	console.error('❌ PIN migration failed:', error);
	process.exit(1);
});
