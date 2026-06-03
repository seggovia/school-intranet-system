import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Auth endpoints', () => {
  it('POST /api/auth/login con credenciales correctas retorna tokens', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@school-intranet.test',
      password: 'demo1234'
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
  })

  it('POST /api/auth/login con credenciales incorrectas retorna 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@school-intranet.test',
      password: 'wrongpassword'
    })
    expect(res.status).toBe(401)
  })

  it('GET /api/me sin token retorna 401', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('GET /api/admin sin token retorna 401', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/login con email inválido retorna 400', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'notanemail',
      password: 'demo1234'
    })
    expect(res.status).toBe(400)
  })
})
