import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { extractBearer, validateApiKey, recordUsage } from "@/server/validate";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const token = extractBearer(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const result = await validateApiKey(token);
  if (!result.ok) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = { success: true, data: { message: "Here is your data" } };
  // Schedule usage recording AFTER response is flushed — guaranteed on Vercel
  after(() => recordUsage(result.keyId, 200, Date.now() - start));
  return NextResponse.json(body, { status: 200 });
}
