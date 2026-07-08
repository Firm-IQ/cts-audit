import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const redirectUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(redirectUrl, 303); // Use 303 See Other to force GET redirect
  response.cookies.delete('cts_session');
  return response;
}
export async function GET(request: Request) {
  const redirectUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.delete('cts_session');
  return response;
}
