// src/features/wardrobe/components/admin/DressImageGallery.tsx
//
// Canonical image-management component for a single dress. Composes all four
// Phase 13 wardrobe.images.* TRPC mutations plus the @vercel/blob/client
// upload pipeline.
//
// Lifecycle for an upload:
//   1. User picks files via hidden <input type="file">
//   2. compressForUpload() shrinks each file (1600px / 80% / ~400KB target)
//   3. upload(name, blob, { handleUploadUrl: "/api/wardrobe/upload",
//      clientPayload: JSON.stringify({ dressId }) }) -> blob URL
//      - The route handler mints a short-lived client token only after
//        validating ownership + the 8-image cap (defense in depth)
//   4. api.wardrobe.images.attachImage({ dressId, url }) persists the row
//      and auto-flags isPrimary=true on the first image (server-side)
//   5. onMutated() bubbles up so the parent edit page invalidates the byId
//      query and re-renders with the new image set
//
// The 8-image cap is enforced at THREE places:
//   - This component: button disabled when images.length >= 8, counter "(N/8)"
//   - attachImage TRPC mutation: throws BAD_REQUEST at the 9th attach
//   - /api/wardrobe/upload route handler: refuses to mint the 9th token
//
// Reorder is up/down arrows only. Drag-and-drop is deferred to a polish pass —
// the underlying contract is the same either way (full ordered id list).

"use client";

import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressForUpload } from "@/features/wardrobe/lib/compressImage";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

interface GalleryImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface DressImageGalleryProps {
  dressId: string;
  /** Sorted by sortOrder ascending; parent guarantees this. */
  images: GalleryImage[];
  /**
   * Called after any successful mutation (attach / reorder / setPrimary /
   * delete) so the parent can invalidate the wardrobe.byId query.
   */
  onMutated: () => void;
}

const MAX_IMAGES = 8;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export function DressImageGallery({ dressId, images, onMutated }: DressImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // -----------------------------------------------------------------------
  // Mutation hooks
  // -----------------------------------------------------------------------
  // attachImage's onSuccess is intentionally NOT used to call onMutated()
  // because we batch multiple attaches inside handleFiles() and fire a single
  // onMutated() after the whole batch resolves. The other three mutations are
  // single-shot.

  const attach = api.wardrobe.images.attachImage.useMutation({
    onError: (e) => toast.error("Attach failed", { description: e.message }),
  });
  const reorder = api.wardrobe.images.reorderImages.useMutation({
    onSuccess: () => {
      onMutated();
      toast.success("Images reordered");
    },
    onError: (e) => toast.error("Reorder failed", { description: e.message }),
  });
  const setPrimary = api.wardrobe.images.setPrimary.useMutation({
    onSuccess: () => {
      onMutated();
      toast.success("Primary image updated");
    },
    onError: (e) => toast.error("Set primary failed", { description: e.message }),
  });
  const deleteImg = api.wardrobe.images.deleteImage.useMutation({
    onSuccess: () => {
      onMutated();
      toast.success("Image removed");
    },
    onError: (e) => toast.error("Delete failed", { description: e.message }),
  });

  // -----------------------------------------------------------------------
  // Upload handler
  // -----------------------------------------------------------------------

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images per dress reached`);
      return;
    }

    const filesArr = Array.from(files).slice(0, remaining);
    if (filesArr.length < files.length) {
      toast.warning(
        `Only the first ${filesArr.length} file(s) will be uploaded (max ${MAX_IMAGES} total).`,
      );
    }

    setIsUploading(true);
    try {
      for (const file of filesArr) {
        // Client-side compression: 1600px max / 80% quality / ~400KB target.
        // Throws above 5MB pre-compression to fail fast before bytes leave the device.
        const compressed = await compressForUpload(file);

        // Server-token upload — handleUploadUrl mints the token at /api/wardrobe/upload.
        // clientPayload carries dressId so the route handler can enforce ownership
        // + 8-cap before mint (defense in depth alongside attachImage).
        const blob = await upload(compressed.name, compressed, {
          access: "public",
          handleUploadUrl: "/api/wardrobe/upload",
          clientPayload: JSON.stringify({ dressId }),
        });

        // Persist the DressImage row. Phase 13 attachImage auto-promotes the
        // first image to isPrimary=true; the UI just renders the badge.
        await attach.mutateAsync({ dressId, url: blob.url });
      }
      onMutated();
      toast.success(`${filesArr.length} image(s) uploaded`);
    } catch (e) {
      // Most TRPC errors surface via the mutation onErrors above. This catches
      // upload() throws (network failure, 5MB cap, compression error).
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error("Upload failed", { description: message });
    } finally {
      setIsUploading(false);
      // Reset so the user can re-upload the same file after a fix.
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // -----------------------------------------------------------------------
  // Reorder (up / down arrows)
  // -----------------------------------------------------------------------
  // Phase 13 reorderImages requires the FULL ordered id list — partial reorders
  // are explicitly rejected (BAD_REQUEST). We rebuild the array client-side.

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) {
      return;
    }
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorder.mutate({
      dressId,
      orderedIds: reordered.map((img) => img.id),
    });
  };

  const handleSetPrimary = (imageId: string) => {
    // Phase 13 setPrimary takes only imageId (server looks up dressId via the row).
    setPrimary.mutate({ imageId });
  };

  const handleDelete = (imageId: string) => {
    // NEVER window.confirm — we use the project's toast confirmation pattern.
    showDeleteConfirmation("image", () => {
      // Phase 13 deleteImage takes only imageId; the server handles blob del()
      // + row delete + next-image primary promotion atomically.
      deleteImg.mutate({ imageId });
    });
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const remaining = MAX_IMAGES - images.length;
  const atCap = remaining <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Images</h3>
          <p className="text-sm text-slate-600 mt-1">
            {images.length} of {MAX_IMAGES} uploaded. First image is automatically the primary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atCap || isUploading}
            className="bg-[#0891b2] hover:bg-[#06748f] text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : `Add image (${images.length}/${MAX_IMAGES})`}
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm text-slate-500">
            No images yet. Click <strong>Add image</strong> to upload up to {MAX_IMAGES}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative rounded-xl overflow-hidden border border-slate-200 group shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]"
            >
              {/* Blob URLs aren't pre-configured in next.config.js domains list;
                  using a plain <img> here is the safer choice. Revisit if
                  next/image is wired for the wardrobe surface later. */}
              {/* biome-ignore lint/performance/noImgElement: blob URL not in next/image domains */}
              {/* biome-ignore lint/a11y/useAltText: decorative thumbnail, alt left blank intentionally */}
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />

              {img.isPrimary && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </span>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => moveImage(idx, -1)}
                    disabled={idx === 0 || reorder.isPending}
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => moveImage(idx, 1)}
                    disabled={idx === images.length - 1 || reorder.isPending}
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                {!img.isPrimary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(img.id)}
                    disabled={setPrimary.isPending}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Make primary
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(img.id)}
                  disabled={deleteImg.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
