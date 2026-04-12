export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return new Response(
      JSON.stringify({
        ok: true,
        time: Date.now(),
        node: process.version,
        env: process.env.NODE_ENV,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasDbUrl: !!process.env.DATABASE_URL,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ error: String(e), stack: (e as Error)?.stack }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
