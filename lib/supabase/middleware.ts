import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // The app uses tournament codes for access control instead
  return NextResponse.next({
    request,
  })
}
