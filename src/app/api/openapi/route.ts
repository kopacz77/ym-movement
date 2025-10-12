import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";

export async function GET() {
  // Only allow access in development environment
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(openApiDocument);
}
