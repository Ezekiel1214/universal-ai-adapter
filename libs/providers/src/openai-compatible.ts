import OpenAI from 'openai';
import { AITool, ToolCall } from '../../shared/src/types.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isToolFunction(value: unknown): value is { name?: string; arguments?: string } {
  return isObject(value);
}

function hasToolCallId(value: unknown): value is { id: string; function?: unknown } {
  return isObject(value) && typeof value.id === 'string';
}

export function toOpenAITools(tools?: AITool[]): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }
  }));
}

export function mapOpenAIToolCalls(toolCalls: ReadonlyArray<unknown> | null | undefined): ToolCall[] | undefined {
  const mapped = toolCalls
    ?.filter(hasToolCallId)
    .map(toolCall => {
      const fn = isToolFunction(toolCall.function) ? toolCall.function : undefined;
      return {
        id: toolCall.id,
        type: 'function' as const,
        function: {
          name: typeof fn?.name === 'string' ? fn.name : '',
          arguments: typeof fn?.arguments === 'string' ? fn.arguments : ''
        }
      };
    })
    .filter(toolCall => toolCall.function.name.length > 0);

  return mapped && mapped.length > 0 ? mapped : undefined;
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
