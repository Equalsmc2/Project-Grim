// Regenerates src/sync/rules.js from firebase-rtdb.rules.json.
import { readFileSync, writeFileSync } from 'node:fs';
const rules = JSON.parse(readFileSync('firebase-rtdb.rules.json', 'utf8'));
writeFileSync('src/sync/rules.js', `// Generated from firebase-rtdb.rules.json (tests/v2/rules.test.mjs keeps them identical).\n// Embedded so the GM deck can copy the rules even where hosting does not publish the JSON file.\nexport const FIREBASE_RULES = ${JSON.stringify(rules, null, 2)};\n`);
console.log('src/sync/rules.js updated');
