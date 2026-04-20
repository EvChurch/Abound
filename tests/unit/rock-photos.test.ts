import { describe, expect, it } from "vitest";

import { rockGetImageUrl, rockPersonPhotoPath } from "@/lib/rock/photos";

describe("Rock photo helpers", () => {
  it("returns null for missing or invalid person photo ids", () => {
    expect(rockPersonPhotoPath(null)).toBeNull();
    expect(rockPersonPhotoPath(undefined)).toBeNull();
    expect(rockPersonPhotoPath(0)).toBeNull();
    expect(rockPersonPhotoPath(-1)).toBeNull();
    expect(rockPersonPhotoPath(12.5)).toBeNull();
  });

  it("builds local and Rock photo URLs for valid ids", () => {
    expect(rockPersonPhotoPath(12345)).toBe("/api/rock/person-photo/12345");
    expect(String(rockGetImageUrl("https://rock.example.test", 12345))).toBe(
      "https://rock.example.test/GetImage.ashx?id=12345",
    );
  });
});
