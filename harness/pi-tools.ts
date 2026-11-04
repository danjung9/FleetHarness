import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { invokeFleetTool, toolRegistry } from './tool-registry.js';

/** Runtime adapter; no SDK initialization, credentials or model request occurs here. */
export function createFleetTools(names: readonly string[] = toolRegistry.map(tool => tool.name)): ToolDefinition[] {
  return toolRegistry.filter(tool => names.includes(tool.name)).map(tool => ({
    name:tool.name, label:tool.name.replace(/^fleet_/,'').replaceAll('_',' '), description:tool.description,
    promptSnippet:tool.description, parameters:tool.parameters,
    async execute(_id, parameters, signal) {
      const result = invokeFleetTool(tool.name, parameters, signal);
      return { content:[{type:'text' as const,text:JSON.stringify(result,null,2)}], details:{tool:tool.name,scope:'synthetic-toolkit',result} };
    }
  }));
}
