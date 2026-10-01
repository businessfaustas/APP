import { errorResponse, handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { storeUpload } from "@/lib/storage/photos";

export const runtime = "nodejs";

const MAX_FILES = 24;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return errorResponse("No files uploaded.", 400);
    if (files.length > MAX_FILES) return errorResponse(`Upload at most ${MAX_FILES} photos.`, 400);
    const refs: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) return errorResponse(`${f.name} is not an image.`, 400);
      refs.push(await storeUpload(user.id, new Uint8Array(await f.arrayBuffer())));
    }
    return json({ photos: refs }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
