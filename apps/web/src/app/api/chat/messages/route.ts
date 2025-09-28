import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    console.log('AccessToken:', session?.accessToken);
    
    if (!session?.accessToken) {
      console.log('No access token found');
      return NextResponse.json(
        { error: 'Unauthorized no accecssToken' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    // Forward request to backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('API URL:', apiUrl);
    console.log('Full URL:', `${apiUrl}/chat/messages`);
    
    const response = await fetch(`${apiUrl}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log("res server: ",response);
    

    if (!response.ok) {
      const errorData = await response.json();
      console.log("errorData trong routes chat/messages: ",errorData);
      
      return NextResponse.json(
        { error: 'Failed to send message routes chat/messages' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
