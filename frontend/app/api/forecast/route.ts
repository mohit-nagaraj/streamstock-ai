import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${BACKEND_URL}/api/forecast${queryString ? `?${queryString}` : ''}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forecast' },
      { status: 500 }
    );
  }
}
