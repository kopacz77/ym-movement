// src/app/api/wardrobe/upload/route.ts
//
// Next.js route handler for Vercel Blob upload-token minting.
// This is the canonical upload entry point for wardrobe dress images:
// the browser calls upload() from @vercel/blob/client, which POSTs here to
// obtain a short-lived upload token. Auth, content-type whitelisting, byte
// cap, and per-dress image cap are ALL enforced inside onBeforeGenerateToken
// (i.e., BEFORE the token is minted), so the actual upload to Vercel Blob
// can only happen for a request we have already authorized.
//
// Primary persistence path: after upload() resolves on the client, the client
// calls wardrobe.images.attachImage({ dressId, url }) to create the DressImage
// row. The onUploadCompleted callback below is intentionally a logging stub
// because Vercel cannot reach back to localhost without a public tunnel.

import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";

const MAX_IMAGES_PER_DRESS = 8;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB pre-compression cap
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Authentication required");
        }

        const parsed = JSON.parse(clientPayload ?? "{}") as { dressId?: string };
        const dressId = parsed.dressId;
        if (!dressId) {
          throw new Error("dressId required in clientPayload");
        }

        const dress = await prisma.dress.findUnique({
          where: { id: dressId },
          select: { ownerId: true },
        });
        if (!dress) {
          throw new Error("Dress not found");
        }

        const role = session.user.role;
        const isOwner = dress.ownerId === session.user.id;
        const isAdmin = isAdminRole(role);
        if (!isOwner && !isAdmin) {
          throw new Error("Forbidden");
        }

        const count = await prisma.dressImage.count({ where: { dressId } });
        if (count >= MAX_IMAGES_PER_DRESS) {
          throw new Error(`Image cap reached (${MAX_IMAGES_PER_DRESS} per dress)`);
        }

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            dressId,
            uploaderId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Defense-in-depth log only. Primary persistence is via the
        // wardrobe.images.attachImage TRPC mutation called by the client
        // after upload() resolves. This callback does NOT fire on localhost
        // (Vercel cannot reach back to the dev machine without ngrok).
        // Phase 14+ may revisit to add idempotent persistence here.
        console.log("[wardrobe/upload] upload completed:", {
          url: blob.url,
          tokenPayload,
        });
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
