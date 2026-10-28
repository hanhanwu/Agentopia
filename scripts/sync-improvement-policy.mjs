import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const check = args[0] === '--check';
if (check) args.shift();
if (args.length > 1 || args.some(arg => arg.startsWith('--'))) {
  throw new Error('Usage: node scripts/sync-improvement-policy.mjs [--check] [Agentopia_Lab path]');
}
const filename = 'improvement-rule-families-v1.json';
const source = resolve(args[0] ?? resolve(root, '../Agentopia_Lab'), 'Scoring_System/score_mcp_servers/policies', filename);
const destination = resolve(root, 'apps/studio/server/policies', filename);
const contents = await readFile(source);
const policy = JSON.parse(contents.toString('utf8'));
const ids = policy.families.flatMap(family => family.rules.map(rule => rule.rule_id));
if (policy.rule_count !== ids.length || new Set(ids).size !== ids.length
    || policy.family_count !== policy.families.length || policy.ranking.maximum_tips !== 5) {
  throw new Error('Invalid improvement policy counts, duplicate members or tip limit.');
}
const current = await readFile(destination);
if (check) {
  if (!contents.equals(current)) throw new Error('Bundled improvement policy is stale. Run npm run policies:sync.');
  console.log('Bundled improvement policy matches the Lab source.');
} else if (!contents.equals(current)) {
  await writeFile(destination, contents);
  console.log('Updated the bundled improvement policy.');
} else {
  console.log('Bundled improvement policy is already current.');
}
