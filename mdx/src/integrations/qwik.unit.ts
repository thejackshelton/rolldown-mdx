import { describe, expect, it, vi } from "vitest";
import { qwikIntegration } from "./qwik";

describe("qwikIntegration", () => {
	const mockDebug = vi.fn();
	const defaultPlugins = [{ name: "plugin-1" }, { name: "plugin-2" }];

	it("adds qwik plugin after default plugins", async () => {
		const result = await qwikIntegration(
			[...defaultPlugins],
			defaultPlugins,
			mockDebug,
		);

		expect(result.length).toBe(3);
		expect(result[2]).toHaveProperty("name", "rollup-plugin-qwik");
	});

	it("skips adding plugin if user already has qwik plugin", async () => {
		const pluginsWithQwik = [
			...defaultPlugins,
			{ name: "qwik-rollup" },
			{ name: "user-plugin" },
		];

		const result = await qwikIntegration(
			pluginsWithQwik,
			defaultPlugins,
			mockDebug,
		);

		expect(result).toBe(pluginsWithQwik);
		expect(mockDebug).toHaveBeenCalledWith(
			expect.stringContaining("User has qwik-rollup plugin"),
		);
	});

	it("inserts qwik plugin between default and user plugins", async () => {
		const pluginsWithUser = [...defaultPlugins, { name: "user-custom-plugin" }];

		const result = await qwikIntegration(
			pluginsWithUser,
			defaultPlugins,
			mockDebug,
		);

		expect(result[0]).toHaveProperty("name", "plugin-1");
		expect(result[1]).toHaveProperty("name", "plugin-2");
		expect(result[2]).toHaveProperty("name", "rollup-plugin-qwik");
		expect(result[3]).toHaveProperty("name", "user-custom-plugin");
	});
});
