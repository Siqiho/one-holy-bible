import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { cuvGenesis1, kjvGenesis1, sampleResources } from "../data/sampleLibrary";
import { defaultWorkbenchLayout } from "../domain/layout";
import { Workbench } from "./Workbench";

describe("Workbench", () => {
  it("syncs selected verse highlighting across CUV and KJV", async () => {
    render(
      <Workbench
        versions={[cuvGenesis1, kjvGenesis1]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "3 And God said, Let there be light: and there was light." }));
    expect(screen.getByTestId("cuv-Gen.1.3")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("kjv-Gen.1.3")).toHaveAttribute("aria-current", "true");
  });

  it("refreshes resources for the selected verse", async () => {
    render(
      <Workbench
        versions={[cuvGenesis1, kjvGenesis1]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    expect(screen.getAllByText("起初，神创造天地").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "2 地是空虚混沌，渊面黑暗；神的灵运行在水面上。" }));
    expect(screen.getAllByText("空虚混沌").length).toBeGreaterThan(0);
  });

  it("searches Bible text and jumps to a result", async () => {
    render(
      <Workbench
        versions={[cuvGenesis1, kjvGenesis1]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText("搜索经文"), "created");
    await userEvent.click(screen.getByRole("button", { name: "KJV Gen.1.1 In the beginning God created the heaven and the earth." }));
    expect(screen.getByTestId("cuv-Gen.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("kjv-Gen.1.1")).toHaveAttribute("aria-current", "true");
  });

  it("moves modules between sides and saves layout", async () => {
    const onSaveLayout = vi.fn();
    render(
      <Workbench
        versions={[cuvGenesis1, kjvGenesis1]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
        onSaveLayout={onSaveLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "移动 注释时间线 到左侧" }));
    await userEvent.click(screen.getByRole("button", { name: "保存布局" }));
    expect(onSaveLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: expect.arrayContaining([expect.objectContaining({ id: "commentary", side: "left" })]),
      }),
    );
  });
});
