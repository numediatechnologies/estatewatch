import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('./db.js', () => ({ query: queryMock }));

import { pipelineRouter } from './routes/pipeline.js';
import { createSessionToken } from './auth.js';

const app = express();
app.use(express.json());
app.use('/api/pipeline', pipelineRouter);

function cookie(role: 'user' | 'admin', sub: string) {
  process.env.AUTH_SESSION_SECRET = 'pipeline-test-session-secret';
  const token = createSessionToken({ sub, email: `${sub}@example.com`, name: sub, role });
  return `estatewatch_session=${token}`;
}

const pipelineItem = {
  estateId: 'estate-1', stage: 'new', notes: 'Follow up', valueEstimate: 50000,
  priority: 'high', tags: ['Gauteng'], updatedAt: '2026-08-11',
};

describe('pipeline ownership', () => {
  beforeEach(() => queryMock.mockReset());

  it('rejects unauthenticated pipeline access and mutations', async () => {
    expect((await request(app).get('/api/pipeline')).status).toBe(401);
    expect((await request(app).post('/api/pipeline').send(pipelineItem)).status).toBe(401);
    expect((await request(app).patch('/api/pipeline/pip-1').send({ notes: 'x' })).status).toBe(401);
    expect((await request(app).delete('/api/pipeline/pip-1')).status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('scopes a signed-in user query to their owner id', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const response = await request(app).get('/api/pipeline').set('Cookie', cookie('user', 'user-1'));
    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("p.owner_id = $2"), ['user', 'user-1']);
  });

  it('writes new pipeline rows with the session owner, not client input', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 1 });
    const response = await request(app).post('/api/pipeline').set('Cookie', cookie('user', 'user-1')).send({ ...pipelineItem, ownerId: 'other-user' });
    expect(response.status).toBe(201);
    expect(queryMock.mock.calls[1][0]).toContain('owner_id');
    expect(queryMock.mock.calls[1][1]).toContain('user-1');
    expect(queryMock.mock.calls[1][1]).not.toContain('other-user');
  });

  it('returns not found when a user updates or deletes another user’s row', async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] });
    const update = await request(app).patch('/api/pipeline/pip-1').set('Cookie', cookie('user', 'user-1')).send({ notes: 'x' });
    const remove = await request(app).delete('/api/pipeline/pip-1').set('Cookie', cookie('user', 'user-1'));
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it('allows administrators to query legacy unowned rows', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const response = await request(app).get('/api/pipeline').set('Cookie', cookie('admin', 'admin-1'));
    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("$1 = 'admin'"), ['admin', 'admin-1']);
  });
});
