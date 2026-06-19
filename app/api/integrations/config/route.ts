import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "integrations-config"
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Integration config placeholder"
  });
}
