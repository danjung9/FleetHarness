import { Type, type TSchema } from 'typebox';
import { Check, Errors } from 'typebox/value';
import { extractMessages } from './tools/messages.js';
import { solveSchedule } from './tools/scheduling.js';
import { reconcileRecords, planUploads } from './tools/offline.js';
import { searchEvidence } from './tools/evidence.js';
import { analyzeDependencies } from './tools/readiness.js';
import { getChallenge, challenges } from './catalog.js';
import { getRecipe } from './recipes.js';
import type { Challenge } from './types.js';
import { timestampDescription, timestampPattern } from './tools/validation.js';

const id = Type.String({minLength:1,maxLength:200});
const num = Type.Integer({minimum:0,maximum:1_000_000_000});
const list = (schema: TSchema, maxItems = 100) => Type.Array(schema,{maxItems});
const ids = Type.Array(id,{maxItems:100,uniqueItems:true});
const obj = (properties: Record<string,TSchema>) => Type.Object(properties,{additionalProperties:false});
const window = obj({start:num,end:num});
const revision = obj({id,recordId:id,parents:ids,actor:id,value:Type.Union([Type.String({maxLength:50000}),Type.Null()])});
const timestampInput = Type.String({maxLength:40,pattern:timestampPattern.source,description:timestampDescription});
export interface FleetTool {
  name: string; description: string; parameters: TSchema;
  run: (input: any, signal?: AbortSignal) => unknown;
}

export const toolRegistry: FleetTool[] = [
  {name:'fleet_get_challenge', description:'Read an official Norfolk challenge snapshot and its AppYard recipe. Omit id to list the catalog. No live website request.',
    parameters:obj({id:Type.Optional(id)}), run:({id}) => id ? {challenge:getChallenge(id),recipe:getRecipe(getChallenge(id).recipe)} : challenges.map(c => ({id:c.id,title:c.title,recipe:c.recipe,pilot:c.pilot}))},
  {name:'fleet_extract_messages', description:'Parse the documented synthetic EVENT/TASK grammar with exact source spans and ambiguity flags. Not a full USMTF parser.',
    parameters:obj({sourceId:id,text:Type.String({maxLength:200000})}),run:extractMessages},
  {name:'fleet_solve_schedule', description:'Find a feasible allocation over explicit candidate starts, honoring personnel, qualifications, availability, shared resources, rest and horizon duty budgets. Returns infeasible or budget_exhausted distinctly.',
    parameters:obj({windows:list(window), people:list(obj({id,qualifications:ids,windows:list(window),maxMinutes:num,restMinutes:num}),200),
      requests:list(obj({id,duration:Type.Integer({minimum:1,maximum:10080}),starts:list(num),people:ids,resources:ids,qualifications:ids}),24),
      maxNodes:Type.Optional(Type.Integer({minimum:1,maximum:200000}))}),run:solveSchedule},
  {name:'fleet_reconcile_records',description:'Merge supplied immutable revision histories; retain conflicting edit/delete heads, reject ID collisions and missing history. Pure calculation: does not persist or transmit records.',
    parameters:obj({local:list(revision,5000),remote:list(revision,5000)}),run:reconcileRecords},
  {name:'fleet_plan_uploads',description:'Allocate a byte budget by supplied priority and age, resuming from acknowledged offsets. Plans transfers only; does not send data.',
    parameters:obj({budgetBytes:num,items:list(obj({id,bytes:Type.Integer({minimum:1,maximum:1000000000}),uploadedBytes:num,priority:Type.Integer({minimum:0,maximum:5}),createdAt:timestampInput}),2000)}),run:planUploads},
  {name:'fleet_search_evidence',description:'Find lexical matches in a caller-supplied approved corpus with exact excerpts and freshness. Does not infer answers, fetch sources or enforce production access control.',
    parameters:obj({query:Type.String({minLength:1,maxLength:1000}),asOf:timestampInput,maxAgeDays:Type.Optional(Type.Integer({minimum:0,maximum:36500})),limit:Type.Optional(Type.Integer({minimum:1,maximum:20})),
      documents:list(obj({id,title:Type.String({minLength:1,maxLength:500}),source:Type.String({minLength:1,maxLength:2000}),text:Type.String({minLength:1,maxLength:100000}),approved:Type.Boolean(),updatedAt:timestampInput}),200)}),run:searchEvidence},
  {name:'fleet_analyze_dependencies',description:'Calculate a supplied dependency DAG, controlling path and deadline margin; unknown durations remain unknown. Not a validated operational readiness model.',
    parameters:obj({deadline:num,targets:ids,nodes:list(obj({id,dependencies:ids,duration:Type.Union([num,Type.Null()]),readyAt:num,source:Type.String({minLength:1,maxLength:2000})}),200)}),run:analyzeDependencies}
];

export function invokeFleetTool(name: string, input: unknown, signal?: AbortSignal, catalog?: readonly Challenge[]): unknown {
  const tool = toolRegistry.find(t => t.name === name);
  if (!tool) throw new Error(`Unknown AppYard tool: ${name}`);
  if (signal?.aborted) throw new Error('Tool call cancelled.');
  if (JSON.stringify(input)?.length > 2_000_000) throw new Error('Tool input exceeds the 2 MB text limit. Use a smaller fixture batch.');
  if (!Check(tool.parameters, input)) {
    const invalidTimestamp = Errors(tool.parameters, input).find(error => error.keyword === 'pattern' && error.params.pattern === timestampPattern.source);
    const correction = invalidTimestamp ? ` ${invalidTimestamp.instancePath}: ${timestampDescription}` : '';
    throw new Error(`Invalid input for ${name}; see its JSON Schema in .fleet/tool-schemas.json.${correction}`);
  }
  if (name === 'fleet_get_challenge' && catalog) {
    const { id } = input as { id?: string };
    if (!id) return catalog.map(c => ({ id: c.id, title: c.title, recipe: c.recipe, pilot: c.pilot }));
    const challenge = getChallenge(id, catalog);
    return { challenge, recipe: getRecipe(challenge.recipe) };
  }
  return tool.run(input, signal);
}
