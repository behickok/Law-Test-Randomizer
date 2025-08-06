import { config } from 'dotenv';

// Load variables from the .Env file if present
config({ path: `${process.cwd()}/.Env` });

export const PASSPHRASE = process.env.PASSPHRASE;
