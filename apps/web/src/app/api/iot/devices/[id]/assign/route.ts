import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { areaId } = body;

    const res = await fetch(`${API_URL}/iot/devices/${params.id}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ areaId }),
    });

    if (!res.ok) {
      throw new Error("Failed to assign device");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[DEVICE_ASSIGN_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
