import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    service: 'web-frontend'
  });
}
