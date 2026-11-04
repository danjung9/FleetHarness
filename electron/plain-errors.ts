import { PreflightError } from './preflight.js';

// External services can add arbitrary diagnostics. Unknown text is kept in the
// activity log and never copied into the user-facing instruction.
const messages = {
  unknown: 'The build could not finish; open the activity log and ask the app maintainer for help.',
  connection: 'The build service could not accept the request; reconnect it in Model settings and try again.',
  busy: 'The build service is busy; wait a few minutes and try again.',
  quota: 'The build service has no usage allowance left; ask the account owner to check the allowance before trying again.',
  network: 'The build service could not be reached; check your internet connection and try again.',
  disk: 'The drive is full; free some space on this drive and try again.',
  files: 'AppYard could not access the build files; check this folder\'s permissions and try again.',
  'missing-files': 'Some required build files are missing; try again and ask the app maintainer for help if this continues.',
  'invalid-output': 'The build produced unreadable results; try again and ask the app maintainer for help if this continues.',
  sandbox: 'Safe build tools could not start; restart AppYard and ask the app maintainer for help if this continues.',
  stopped: 'The build was stopped; press Start build when you are ready to try again.',
  timeout: 'The build stopped because it took too long; check the saved work and try again.',
  capacity: 'A build is already running; wait for it to finish or stop it before starting another.',
  changed: 'The build inputs or checked files changed; review the saved work and start a new build before approving it.',
  tests: 'The app did not pass its checks; review the failed checks in the activity log before trying again.',
  output: 'The build did not produce all the required files; check the saved work and try again.',
  limits: 'The build exceeded a file or size limit; try a smaller problem and ask the app maintainer for help if this continues.',
  browser: 'The browser needed to check your app is unavailable; install Google Chrome and try again.',
  preview: 'The app preview could not open; restart AppYard and try again.',
  catalog: 'The challenge list could not be read; use a saved challenge or try again later.',
  input: 'The challenge information is incomplete or invalid; check your title, description, requirements and links before trying again.',
  plan: 'The build produced an incomplete or invalid plan; try again and ask the app maintainer for help if this continues.',
  tool: 'A build tool could not complete its task; check the activity log and try again.',
  settings: 'The build settings could not be used; restart AppYard and ask the app maintainer for help if this continues.',
  install: 'The build engine could not start on this computer; reinstall AppYard and ask the app maintainer for help if this continues.'
} as const;
type PlainCode = keyof typeof messages;
const rules: [PlainCode, RegExp][] = [
  ['quota', /insufficient_quota|quota (?:exceeded|exhausted)|billing|usage (?:limit|allowance)/i],
  ['busy', /\b429\b|rate.?limit|too many requests|overloaded|\b50[0234]\b/i],
  ['connection', /\b40[13]\b|unauthori[sz]ed|forbidden|invalid.{0,12}(?:api.?key|token)|No API key found|authentication_error|(?:choose a model and|sign in with ChatGPT)|Codex returned an unexpected sign-in address/i],
  ['disk', /\bENOSPC\b|no space left/i],
  ['sandbox', /sandbox|containment/i],
  ['network', /ECONN(?:RESET|REFUSED)|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|fetch failed|network (?:error|unavailable)|socket hang up/i],
  ['files', /\b(?:EACCES|EPERM|EROFS)\b|permission denied|operation not permitted|Could not save run state/i],
  ['missing-files', /\bENOENT\b|no such file|Component source is missing or empty/i],
  ['invalid-output', /SyntaxError|Unexpected (?:token|end)|invalid JSON|not valid JSON|Codex returned an invalid protocol message/i],
  ['stopped', /^(?:Run stopped|Codex run stopped|Browser verification stopped|Tool call cancelled|Schedule search cancelled|AppYard is closing|Agent stage closed)|operation was aborted/i],
  ['timeout', /made no progress|exceeded (?:the|its) .*(?:minute|second).*limit|reached the .*-turn limit|timed out|model exhausted its response limit/i],
  ['capacity', /already has an active|Three runs are already active/i],
  ['changed', /original requirements changed|acceptance plan or UX specification changed|Source files changed|system-design\.json changed|Fleet packet integrity failed|Existing \.fleet packet|\.fleet must be|Artifact must stay inside|Invalid artifact path|Browser evidence directory must/i],
  ['browser', /^Browser verification could not start/i],
  ['preview', /^Preview server could not start/i],
  ['tests', /Verification did not pass|No browser journeys|Unsupported browser action|(?:^| )expected .*received|^Expected download|readable download|^Download failed|^Downloaded content/i],
  ['limits', /exceeds? the .*limit|exceeds? the .*KB|exceeded the .*MB|exceeds the 2,000-file/i],
  ['output', /did not produce the required artifacts|Pi did not produce any|model stopped before completing this stage/i],
  ['connection', /Codex (?:session (?:is )?closed|is disconnected|stopped unexpectedly)|The Codex connection closed|model provider returned an error|Codex could not complete the turn|Codex turn /i],
  ['install', /Codex is not bundled|Could not start bundled Codex/i],
  ['settings', /^Invalid (?:agent|verification|browser verification) limit|^Unknown pipeline stage|^This phase is controlled/i],
  ['catalog', /Norfolk|^Challenge not found|Unsupported saved workspace format/i],
  ['input', /^(?:Invalid challenge|Add a title|Use up to|Keep resources|Enter a complete)/i],
  ['plan', /(?:must be an object|has an unknown field|must be .*string of at most|must start with a letter|must contain .* entries|\.schemaVersion|\.action is unsupported|\.kind must|must interact with the application|is a primary journey|acceptance inventory|Journey IDs|Include at least one primary|unknown criterion|Duplicate criterion|\.disposition|\.journeyIds|unknown journey|deferred criterion requires|implemented criterion must|Missing acceptance criteria|At least one acceptance|Every journey must|Screen names)/i],
  ['plan', /^(?:Expected a system design object|Design text|Describe .*components|Component IDs|Unknown component kind|Map each component|Use workspace-relative|Describe up to .*connections|Connections must|Unknown component\.|Provide a valid status)/i],
  ['tool', /^(?:Unknown AppYard tool|Invalid input for|Tool input exceeds|text must|Unknown person|Revision |Missing parent|A revision|createdAt must|asOf must|Document updatedAt|Document approved|At least one target|Unknown dependency|Dependency graph)/i],
  ['tool', /(?:must be an integer between|must be an array of at most|cannot contain duplicates|contains duplicate IDs| end must follow start)/i]
];

function printable(value: unknown) {
  try { return String(value); } catch { return '[Error value could not be printed]'; }
}
function detail(error: unknown, seen = new Set<unknown>()): string {
  if (!(error instanceof Error)) return printable(error);
  if (seen.has(error)) return '[Repeated error]';
  seen.add(error);
  return (error.stack || error.message) + (error.cause === undefined ? '' : '\nCaused by: ' + detail(error.cause, seen));
}

export function plainError(error: unknown): { code: string; message: string; detail: string } {
  if (error instanceof PreflightError) return { code: error.code, message: error.message, detail: detail(error) };
  const raw = error instanceof Error ? error.message : printable(error);
  const code = rules.find(([, pattern]) => pattern.test(raw))?.[0] ?? 'unknown';
  return { code, message: messages[code], detail: detail(error) };
}
export function recordProjectError(project: { error?: string }, error: unknown, log: (detail: string) => void) {
  const result = plainError(error); project.error = result.message; log(result.detail);
}
