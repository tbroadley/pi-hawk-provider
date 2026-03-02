declare module "@mariozechner/pi-ai" {
	export type Api = string;

	export interface AssistantMessageEventStream extends AsyncIterable<unknown> {}

	export interface SimpleStreamOptions {
		temperature?: number;
		maxTokens?: number;
		signal?: AbortSignal;
		apiKey?: string;
		reasoning?: "minimal" | "low" | "medium" | "high";
	}

	export interface Model<TApi extends Api> {
		id: string;
		name: string;
		api: TApi;
		provider: string;
		baseUrl: string;
		reasoning: boolean;
		input: ("text" | "image")[];
		cost: {
			input: number;
			output: number;
			cacheRead: number;
			cacheWrite: number;
		};
		contextWindow: number;
		maxTokens: number;
		headers?: Record<string, string>;
	}

	export interface Context {
		systemPrompt?: string;
		messages: unknown[];
		tools?: unknown[];
	}

	export function streamAnthropic(
		model: Model<"anthropic-messages">,
		context: Context,
		options?: SimpleStreamOptions,
	): AssistantMessageEventStream;

	export function streamOpenAICompletions(
		model: Model<"openai-completions">,
		context: Context,
		options?: SimpleStreamOptions,
	): AssistantMessageEventStream;
}
