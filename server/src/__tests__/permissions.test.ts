import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

async function getToken(email: string, password = 'demo1234') {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  return res.body.accessToken as string
}

describe('Role-based access control', () => {
  it('Estudiante NO puede acceder a /api/admin/users', async () => {
    const token = await getToken('student@school-intranet.test')
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('Admin SÍ puede acceder a /api/admin/users', async () => {
    const token = await getToken('admin@school-intranet.test')
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('Token expirado o inválido retorna 401', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer invalid.token.here')
    expect(res.status).toBe(401)
  })

  it('GET /api/health retorna status ok sin autenticación', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
