import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL ?? "http://localhost:3000"));
}

export async function GET() {
  await clearSessionCookies();
  return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL ?? "http://localhost:3000"));
}
