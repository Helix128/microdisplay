import { describe, expect, it, vi } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("generates an id with the provided prefix", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000001");

    expect(createId("screen")).toBe(
      "screen-00000000-0000-4000-8000-000000000001",
    );

    randomUUID.mockRestore();
  });

  it("uses a new uuid on each call", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");

    expect(createId("rect")).toBe(
      "rect-00000000-0000-4000-8000-000000000001",
    );
    expect(createId("rect")).toBe(
      "rect-00000000-0000-4000-8000-000000000002",
    );

    randomUUID.mockRestore();
  });
});
