import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResourceImage } from "./ResourceImage";

describe("ResourceImage", () => {
  it("replaces a broken image with a retry and reloads the original URL", async () => {
    const onError = vi.fn();
    render(<ResourceImage src="/image.png" alt="希伯来原文" onError={onError} />);
    fireEvent.error(screen.getByRole("img"));
    expect(onError).toHaveBeenCalledOnce();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试加载图片：希伯来原文" }));
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/image.png");
    fireEvent.load(img);
    expect(screen.queryByText("图片暂时无法加载")).not.toBeInTheDocument();
  });

  it("uses its existing image button to retry without opening a lightbox or nesting controls", async () => {
    const open = vi.fn();
    render(<button onClick={open} type="button" aria-label="打开大图"><ResourceImage src="/image.png" alt="原图" /></button>);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByText("图片暂时无法加载"));
    expect(open).not.toHaveBeenCalled();
    fireEvent.error(screen.getByRole("img"));
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole("img")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(open).toHaveBeenCalledOnce();
  });

  it("clears a previous failure when the resource URL changes", () => {
    const { rerender } = render(<ResourceImage src="/old.png" alt="图片" />);
    fireEvent.error(screen.getByRole("img"));
    rerender(<ResourceImage src="/new.png" alt="图片" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/new.png");
    expect(screen.queryByText("图片暂时无法加载")).not.toBeInTheDocument();
  });
});
