// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // /admin 配下だけ保護
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Authorization ヘッダを取得
  const authHeader = req.headers.get('authorization') || ''
  const [scheme, encoded] = authHeader.split(' ')
  if (scheme !== 'Basic' || !encoded) {
    return unauthorized()
  }

  // ID とパスワードを取得
  const [id, pwd] = Buffer.from(encoded, 'base64').toString().split(':')

  // .env と照合
  if (
    id !== process.env.ADMIN_USER ||
    pwd !== process.env.ADMIN_PASS
  ) {
    return unauthorized()
  }

  // 認証成功
  return NextResponse.next()

  /* ────────── 共通：401 を返す ────────── */
  function unauthorized() {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    })
  }
}

// matcher で /admin 配下だけに限定
export const config = {
  matcher: ['/admin/:path*'],
}