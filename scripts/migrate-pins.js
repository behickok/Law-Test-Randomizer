import 'dotenv/config';
import { hashPin } from '../src/lib/server/pin.js';
import { escapeSql, normaliseResult } from '../src/lib/server/db.js';

const API_BASE = process.env.CLOUDFLARE_API_BASE ?? 'https://api.cloudflare.com/client/v4';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.D1_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function ensureEnv(value, name) {
	if (!value) {
		throw new Error(`Missing ${name}. Set ${name} in the environment to run this script.`);
	}
	return value;
}

async function runQuery(sql) {
	ensureEnv(ACCOUNT_ID, 'CLOUDFLARE_ACCOUNT_ID');
	ensureEnv(DATABASE_ID, 'D1_DATABASE_ID');
	ensureEnv(API_TOKEN, 'CLOUDFLARE_API_TOKEN');

	const response = await fetch(
		`${API_BASE}/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_TOKEN}`
			},
			body: JSON.stringify({ sql })
		}
	);

	const payload = await response.json();
	if (!response.ok || !payload?.success) {
		const message =
			payload?.errors?.[0]?.message ??
			payload?.errors?.[0]?.detail ??
			response.statusText ??
			'Unknown D1 error';
		throw new Error(`D1 query failed: ${message}`);
	}

	const statement = payload?.result?.[0];
	return Array.isArray(statement?.results) ? statement.results : [];
}

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
        console.log('🔐 Starting credential migration sweep...');
	const summary = [];
	for (const table of TABLES) {
		const result = await upgradeTable(table);
		summary.push(result);
		console.log(
                        ` - ${result.table}: scanned ${result.scanned} rows, upgraded ${result.upgraded} legacy credentials`
                );
        }
        console.log('✅ Credential migration sweep complete.');
        return summary;
}

main().catch((error) => {
        console.error('❌ Credential migration failed:', error);
        process.exit(1);
});
