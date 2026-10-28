# Maintenance and verification

Updated 2026-10-27.

Agentopia contains the Studio product and test fixtures. Agentopia_Lab contains
research workflows, retained evidence, and the independent scoring package.
The Studio runtime imports the installed Python scorer; it never imports Lab
notebook helpers or substitutes saved research assessments.

## Studio boundaries

- `src/trust-score.ts` validates assessment responses and presentation provenance.
- `src/trust-projection.ts` contains the shared score display and presentation types.
- `server/deepinfra.ts` owns server-only provider configuration and bounded JSON
  transport. Reason and Tips retain separate prompts, deadlines and validation.
- `server/trust-presentation.ts` supplies empty states, not replacement findings.
  Legacy presentation fixtures live in `server/trust-test-fixtures.ts` for tests.
- `server/trust-tips.ts` selects eligible families using live weights times ease
  times confidence. Unknown checks are excluded; applicable skipped checks can
  support verification without estimated points.
- `server/trust-pdf-layout.ts` formats cached data into a score overview and one
  actions table. Export does not recollect evidence, rank tips or call an LLM.

The bundled improvement policy intentionally duplicates the Lab source so Studio
can run independently. After editing the Lab policy, run `npm run policies:sync`;
use `npm run policies:check` to verify both copies. A different Lab location can
be passed with `-- /path/to/Agentopia_Lab`. Neither command is a runtime dependency.

## Checks

From the Agentopia root:

```bash
npm test
npm run build
npm run policies:check
.venv/bin/python -m unittest discover -s apps/studio/server -p test_score_worker.py
```

The Lab's current commands are listed in its
[working context](../../Agentopia_Lab/CONTEXT/WORKING_CONTEXT.md). Scorer tests
start local loopback fixture servers; they require local socket permissions but
make no public endpoint requests. Use mocked provider responses for routine
Studio verification; a real provider request sends evidence outside the machine.

Keep review PDFs, browser previews and temporary verification files inside the
workspace, under the ignored `UI_elements_design/draft/` or `tmp/` directories.
Retained evidence and notebooks are research history: do not delete them merely
because production does not import them, and do not regenerate them during an
unrelated refactor. Preserve public notebook helper entry points and their
package/direct-notebook import modes.
