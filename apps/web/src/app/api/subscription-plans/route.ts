import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// GET - Fetch active subscription plans (public - for pricing page)
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/subscription-plans/active`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching active subscription plans:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
