"use client";

import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** Uploads images to /api/uploads and returns `store:` references. */
export function PhotoUpload({ value, onChange, className }: { value: string[]; onChange: (refs: string[]) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 24 - value.length);
    if (list.length === 0) return;
    setBusy(true);
    try {
      const form = new FormData();
      for (const f of list) form.append("files", f);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const body = (await res.json()) as { photos?: string[]; error?: string };
      if (!res.ok || !body.photos) throw new Error(body.error ?? "Upload failed");
      const next = { ...previews };
      body.photos.forEach((ref, i) => {
        const f = list[i];
        if (f) next[ref] = URL.createObjectURL(f);
      });
      setPreviews(next);
      onChange([...value, ...body.photos]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn(
          "text-muted-foreground hover:bg-muted/50 flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-sm transition-colors",
          drag && "border-primary bg-primary/5",
        )}
      >
        {busy ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
        <span>{busy ? "Uploading…" : "Add photos (drag & drop or tap) — optional"}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((ref) => (
            <div key={ref} className="bg-muted relative size-16 overflow-hidden rounded-md border">
              {previews[ref] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[ref]} alt="" className="size-full object-cover" />
              )}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onChange(value.filter((v) => v !== ref))}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
