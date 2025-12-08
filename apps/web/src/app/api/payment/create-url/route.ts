import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    console.log("_Body forward đến /payment/create-url: ",body);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Proxy to backend
    const res = await fetch(`${apiUrl}/payment/create-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("[data----routes api/payment/create-url]: ",data);
    
    if (!res.ok) {
      return new NextResponse(JSON.stringify(data), { status: res.status });
    }


    return NextResponse.json(data);
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
    });
  }
}
