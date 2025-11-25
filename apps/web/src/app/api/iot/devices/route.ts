import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get("farmId");
    
    const url = new URL(`${API_URL}/iot/devices`);
    if (farmId) {
      url.searchParams.append("farmId", farmId);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch devices");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[DEVICES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
