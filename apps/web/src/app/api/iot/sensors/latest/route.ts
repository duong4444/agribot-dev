import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Note: Currently IoT endpoints are public, so no need for auth token
    // If auth is added later, copy the pattern from api/farms/route.ts

    const response = await fetch(`${API_URL}/iot/sensors/latest`, {
      cache: 'no-store', // Ensure real-time data
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sensor data' },
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
