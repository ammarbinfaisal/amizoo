import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { amizoneApi } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Validate credentials by calling profile endpoint
    try {
      await amizoneApi.getProfile({ username, password });
    } catch {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const auth = btoa(`${username}:${password}`);
    const cookieStore = await cookies();
    cookieStore.set("amizone_auth", auth, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
