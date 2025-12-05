import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId");
    
    const url = new URL(`${API_URL}/iot/sensors/latest`);
    if (areaId) {
      url.searchParams.append("areaId", areaId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch sensor data' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch sensor data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('IoT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
