import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutStorageKey } from "./components/Workbench";

describe("project identity", () => {
  it("uses One Holy Bible across app metadata", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { name: string };
    const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
      productName: string;
      identifier: string;
      app: { windows: Array<{ title: string }> };
    };
    const html = readFileSync("index.html", "utf8");

    expect(packageJson.name).toBe("one-holy-bible");
    expect(tauriConfig.productName).toBe("One Holy Bible");
    expect(tauriConfig.identifier).toBe("com.simon.oneholybible");
    expect(tauriConfig.app.windows[0]?.title).toBe("One Holy Bible");
    expect(html).toContain("<title>One Holy Bible</title>");
    expect(layoutStorageKey).toBe("one-holy-bible-layout");
  });
});
