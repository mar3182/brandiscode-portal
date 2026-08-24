/**
 * API: POST /api/auth/login
 * Simple login endpoint for testing
 * In production: use proper Supabase auth
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Simple test authentication
    // In production: use Supabase auth
    if (email === 'admin@brandiscode.com' && password === 'admin') {
      // Create response with cookie
      const response = NextResponse.json(
        { message: 'Login successful', user: { email } },
        { status: 200 }
      )

      // Set auth cookie
      response.cookies.set('auth_token', 'test_token_' + Date.now(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return response
    }

    return NextResponse.json(
      { error: 'Ongeldige email of wachtwoord' },
      { status: 401 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 500 }
    )
  }
}
