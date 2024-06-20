import {
  expect, use, request,
} from 'chai';
import chaiHttp from 'chai-http';
import app from '../../server';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';

use(chaiHttp);

describe('testing Authentication Endpoints', () => {
  const credentials = 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=';
  const token = '';
  const userId = '';
  const user = {
    email: 'bob@dylan.com',
    password: 'toto1234!',
  };
  before(async () => {
    await redisClient.client.flushall('ASYNC');
  });

  describe('GET /connect', () => {
    before(async () => {
      await dbClient.usersCollection.insertOne({ email: 'test@test.com', password: 'password' });
    });

    it('should return token for valid credentials', async () => {

      const response = await request(app)
        .get('/connect')
        .set('Authorization', credentials)
        .send();
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body).to.have.property('token');
    });

    it('should return unauthorized for invalid credentials', async () => {
      const response = await request(app)
        .get('/connect')
        .auth('test@test.com', 'wrongpassword');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });
  });

  describe('gET /disconnect', () => {
    let token;

    before(async () => {
      const user = await dbClient.usersCollection.insertOne({ email: 'test@test.com', password: 'password' });
      token = 'someRandomToken';
      await redisClient.set(`auth_${token}`, user.insertedId.toString(), 60);
    });

    it('should disconnect user with valid token', async () => {
      const response = await request(app)
        .get('/disconnect')
        .set('X-Token', token);
      expect(response.statusCode).to.equal(204);
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).get('/disconnect');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return unauthorized for invalid token', async () => {
      const response = await request(app)
        .get('/disconnect')
        .set('X-Token', 'invalidToken');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });
  });
});
