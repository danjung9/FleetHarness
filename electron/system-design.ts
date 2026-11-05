import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { constants, promises as fs } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { atomicHostWrite } from '../shared/host-files.js';
import type { Project, StageId } from '../shared/types.js';
import { parseSystemDefinition, type ComponentStatus } from '../shared/system-design.js';
import { safeFile } from './storage.js';

export const systemDesignFile = 'system-design.json';
const string = (maxLength: number) => Type.String({ minLength: 1, maxLength });
const designSchema = Type.Object({
  title: string(120), description: string(800),
  components: Type.Array(Type.Object({
    id: Type.String({ pattern: '^[a-z][a-z0-9-]*$', maxLength: 40 }), label: string(64), description: string(500),
    kind: Type.Union(['interface', 'logic', 'data', 'integration'].map(v => Type.Literal(v))),
    files: Type.Array(string(200), { minItems: 1, maxItems: 12 })
  }), { minItems: 1, maxItems: 12 }),
  connections: Type.Array(Type.Object({ from: string(40), to: string(40), label: string(100) }), { maxItems: 24 })
});

export function systemDesignPrompt(stage: StageId) {
  if (!['plan', 'build', 'verify'].includes(stage)) return '';
  return stage === 'plan'
    ? 'Publish the architecture of the APPLICATION being built using fleet_system_design early in planning, before writing the remaining planning documents. Describe roughly 3–8 major components and their labeled data-flow connections, tailored to this challenge. These are application components, not factory stages or implementation tasks. Map components to the exact source filenames the builder should produce; multiple components may share index.html. Label simulated integrations explicitly. The tool saves system-design.json and immediately displays the diagram to the user. You must call this tool before completing planning.'
    : 'Read system-design.json. Keep its architecture and filenames consistent with the application. Use fleet_component_progress for each component: building before working on it, generated only once its implementation and mapped files exist, or blocked with a concrete reason. Report incremental progress as you work, not just at the end. Generated means agent-reported implementation, not verified correctness. Before finishing, report every implemented component as generated. Preserve system-design.json. During verification or repair, move affected components back to building and then generated when fixed.';
}

export function createSystemDesignTools(project: Project, stage: StageId, signal: AbortSignal, changed: () => Promise<void>): ToolDefinition[] {
  if (!['plan', 'build', 'verify'].includes(stage)) return [];
  const response = (text: string) => ({ content: [{ type: 'text' as const, text }], details: {} });
  const check = () => signal.throwIfAborted();
  if (stage === 'plan') return [{
    name: 'fleet_system_design', label: 'Publish system design',
    description: 'Publish the application architecture to the live UI and save system-design.json. Include components, source files, and labeled connections. Planning only.',
    parameters: designSchema,
    async execute(_id, parameters) {
      check();
      const definition = parseSystemDefinition(parameters);
      await atomicHostWrite(project.workspace!, systemDesignFile, JSON.stringify(definition, null, 2) + '\n');
      check();
      const updatedAt = new Date().toISOString();
      project.systemDesign = { definition, updatedAt, progress: Object.fromEntries(definition.components.map(c => [c.id, { status: 'planned', detail: 'Waiting for implementation.', updatedAt }])) };
      await changed();
      return response('System design published. Components: ' + definition.components.map(c => c.id).join(', '));
    }
  }];
  return [{
    name: 'fleet_component_progress', label: 'Update component progress',
    description: 'Update one application component in the live system diagram. Generated requires all mapped source files to exist and means agent-reported implementation, never test verification.',
    parameters: Type.Object({ componentId: string(40), status: Type.Union(['building', 'generated', 'blocked'].map(v => Type.Literal(v))), detail: string(500) }),
    async execute(_id, parameters) {
      check();
      const { componentId, status, detail } = parameters as { componentId: string; status: ComponentStatus; detail: string };
      const design = project.systemDesign;
      const component = design?.definition.components.find(c => c.id === componentId);
      if (!component || !design) throw new Error('Unknown component. Read system-design.json for component IDs.');
      if (!['building', 'generated', 'blocked'].includes(status) || typeof detail !== 'string' || !detail.trim() || detail.length > 500) throw new Error('Provide a valid status and a short progress explanation.');
      if (status === 'generated') {
        for (const file of component.files) {
          const stat = await fs.stat(await safeFile(project.workspace!, file));
          if (!stat.isFile() || !stat.size) throw new Error('Component source is missing or empty: ' + file);
        }
      }
      check();
      design.updatedAt = new Date().toISOString();
      design.progress[componentId] = { status, detail: detail.trim(), updatedAt: design.updatedAt };
      await changed();
      return response(component.label + ': ' + status + '. The live diagram has been updated.');
    }
  }];
}

export async function checkSystemDesign(project: Project) {
  if (!project.systemDesign) return;
  const definition = parseSystemDefinition(JSON.parse(await fs.readFile(await safeFile(project.workspace!, systemDesignFile), 'utf8')));
  // Persistence can reorder object keys without changing the published design.
  if (!isDeepStrictEqual(definition, project.systemDesign.definition)) throw new Error('system-design.json changed outside the planning tool. Keep the published architecture consistent with the application.');
}

export function incompleteComponents(project: Project): string[] {
  return project.systemDesign?.definition.components.filter(c => project.systemDesign!.progress[c.id]?.status !== 'generated').map(c => c.id) ?? [];
}
