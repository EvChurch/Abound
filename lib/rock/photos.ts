export function rockPersonPhotoPath(photoRockId: number | null | undefined) {
  if (typeof photoRockId !== "number" || photoRockId <= 0) {
    return null;
  }

  if (!Number.isInteger(photoRockId)) {
    return null;
  }

  return `/api/rock/person-photo/${photoRockId}`;
}

export function rockGetImageUrl(baseUrl: string, photoRockId: number) {
  const url = new URL("/GetImage.ashx", baseUrl);
  url.searchParams.set("id", String(photoRockId));
  return url;
}
