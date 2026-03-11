import { describe, expect, it, vi } from "vitest";

// Mock @mariozechner/pi-ai before importing the module under test.
// The hawk provider calls getModels() at module load to build built-in model maps.
vi.mock("@mariozechner/pi-ai", () => {
	const anthropicModels = [
		{
			id: "claude-opus-4-6",
			name: "Claude Opus 4.6",
			api: "anthropic-messages",
			provider: "anthropic",
			baseUrl: "https://api.anthropic.com",
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
			contextWindow: 200000,
			maxTokens: 128000,
		},
		{
			id: "claude-sonnet-4-20250514",
			name: "Claude Sonnet 4",
			api: "anthropic-messages",
			provider: "anthropic",
			baseUrl: "https://api.anthropic.com",
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
			contextWindow: 200000,
			maxTokens: 64000,
		},
	];

	const openaiModels = [
		{
			id: "gpt-4o",
			name: "GPT-4o",
			api: "openai-completions",
			provider: "openai",
			baseUrl: "https://api.openai.com/v1",
			reasoning: false,
			input: ["text", "image"],
			cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
			contextWindow: 128000,
			maxTokens: 16384,
		},
		{
			id: "gpt-5",
			name: "GPT-5",
			api: "openai-responses",
			provider: "openai",
			baseUrl: "https://api.openai.com/v1",
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
			contextWindow: 200000,
			maxTokens: 100000,
		},
	];

	return {
		getModels: (provider: string) => {
			if (provider === "anthropic") return anthropicModels;
			if (provider === "openai") return openaiModels;
			return [];
		},
		streamSimpleAnthropic: vi.fn(),
		streamSimpleOpenAICompletions: vi.fn(),
		streamSimpleOpenAIResponses: vi.fn(),
	};
});

import { buildDiscoveredModels, toProviderModelConfig } from "./index.js";
import type { HawkModelConfig } from "./index.js";

describe("toProviderModelConfig", () => {
	it("sets api to anthropic-messages for anthropic backend", () => {
		const model: HawkModelConfig = {
			id: "claude-opus-4-6",
			name: "Claude Opus 4.6 (Hawk)",
			backend: "anthropic",
			upstreamModel: "claude-opus-4-6",
			reasoning: true,
			input: ["text", "image"],
			contextWindow: 200000,
			maxTokens: 128000,
			cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
		};
		const result = toProviderModelConfig(model);
		expect(result.api).toBe("anthropic-messages");
	});

	it("sets api to openai-responses for openai backend with responses api", () => {
		const model: HawkModelConfig = {
			id: "gpt-5",
			name: "GPT-5 (Hawk)",
			backend: "openai",
			upstreamModel: "gpt-5",
			openaiApi: "openai-responses",
			reasoning: true,
			input: ["text", "image"],
			contextWindow: 200000,
			maxTokens: 100000,
			cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
		};
		const result = toProviderModelConfig(model);
		expect(result.api).toBe("openai-responses");
	});

	it("sets api to openai-completions for openai backend with completions api", () => {
		const model: HawkModelConfig = {
			id: "gpt-4o",
			name: "GPT-4o (Hawk)",
			backend: "openai",
			upstreamModel: "gpt-4o",
			openaiApi: "openai-completions",
			reasoning: false,
			input: ["text", "image"],
			contextWindow: 128000,
			maxTokens: 16384,
			cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
		};
		const result = toProviderModelConfig(model);
		expect(result.api).toBe("openai-completions");
	});

	it("sets api to undefined for openai backend without openaiApi", () => {
		const model: HawkModelConfig = {
			id: "some-model",
			name: "Some Model (Hawk)",
			backend: "openai",
			upstreamModel: "some-model",
			reasoning: false,
			input: ["text"],
			contextWindow: 128000,
			maxTokens: 16384,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		};
		const result = toProviderModelConfig(model);
		expect(result.api).toBeUndefined();
	});
});

describe("buildDiscoveredModels", () => {
	it("produces anthropic-messages api for discovered anthropic models", () => {
		const models = buildDiscoveredModels(["anthropic/claude-opus-4-6"]);
		const opus = models.find((m) => m.id === "claude-opus-4-6");
		expect(opus).toBeDefined();
		expect(opus!.backend).toBe("anthropic");

		const providerModel = toProviderModelConfig(opus!);
		expect(providerModel.api).toBe("anthropic-messages");
	});

	it("produces openai-completions api for discovered openai completions models", () => {
		const models = buildDiscoveredModels(["openai/gpt-4o"]);
		const gpt4o = models.find((m) => m.id === "gpt-4o");
		expect(gpt4o).toBeDefined();
		expect(gpt4o!.backend).toBe("openai");

		const providerModel = toProviderModelConfig(gpt4o!);
		expect(providerModel.api).toBe("openai-completions");
	});

	it("produces openai-responses api for discovered openai responses models", () => {
		const models = buildDiscoveredModels(["openai/gpt-5"]);
		const gpt5 = models.find((m) => m.id === "gpt-5");
		expect(gpt5).toBeDefined();

		const providerModel = toProviderModelConfig(gpt5!);
		expect(providerModel.api).toBe("openai-responses");
	});

	it("assigns correct api to mixed anthropic and openai models", () => {
		const models = buildDiscoveredModels([
			"anthropic/claude-sonnet-4-20250514",
			"anthropic/claude-opus-4-6",
			"openai/gpt-4o",
			"openai/gpt-5",
		]);

		expect(models.length).toBe(4);

		for (const model of models) {
			const providerModel = toProviderModelConfig(model);
			if (model.backend === "anthropic") {
				expect(providerModel.api).toBe("anthropic-messages");
			} else {
				expect(["openai-completions", "openai-responses"]).toContain(providerModel.api);
			}
		}
	});
});
