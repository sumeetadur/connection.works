import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApiPath = pathname.startsWith('/api/admin/')

  // Allow access to login page
  if (pathname === '/admin/login') {
    return next()
  }

  if (!isAdminPath && !isAdminApiPath) {
    return next()
  }

  // Check for auth cookie
  const authCookie = context.cookies.get('admin_auth')?.value

  if (authCookie !== 'authenticated') {
    // Redirect to login page for web requests
    if (!isAdminApiPath) {
      return context.redirect('/admin/login')
    }
    // Return 401 for API requests
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  return next()
})
