import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "ClickUp sync placeholder",
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
  });
}
