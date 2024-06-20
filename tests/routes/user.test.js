import {
  expect, use, request,
} from 'chai';
import chaiHttp from 'chai-http';
import app from '../../server';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';

use(chaiHttp);

describe('testing User Endpoints', () => {
  before(async () => {
    await dbClient.usersCollection.deleteMany({});
  });

  describe('pOST /users', () => {
    it('should create a user', async () => {
      const response = await request(app).post('/users').send({
        email: 'test@test.com',
        password: 'password',
      });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(201);
      expect(body).to.have.property('id');
      expect(body).to.have.property('email', 'test@test.com');
    });

    it('should return error if email is missing', async () => {
      const response = await request(app).post('/users').send({
        password: 'password',
      });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(400);
      expect(body).to.eql({ error: 'Missing email' });
    });

    it('should return error if password is missing', async () => {
      const response = await request(app).post('/users').send({
        email: 'test@test.com',
      });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(400);
      expect(body).to.eql({ error: 'Missing password' });
    });

    it('should return error if email already exists', async () => {
      await dbClient.usersCollection.insertOne({ email: 'test@test.com', password: 'password' });

      const response = await request(app).post('/users').send({
        email: 'test@test.com',
        password: 'password',
      });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(400);
      expect(body).to.eql({ error: 'Already exist' });
    });
  });

  describe('gET /users/me', () => {
    let userId;
    let token;

    before(async () => {
      await dbClient.usersCollection.deleteMany({});
      const user = await dbClient.usersCollection.insertOne({ email: 'test@test.com', password: 'password' });
      userId = user.insertedId.toString();
      token = 'someRandomToken';
      await redisClient.set(`auth_${token}`, userId, 60);
    });

    it('should return user info for valid token', async () => {
      const response = await request(app).get('/users/me').set('X-Token', token).send();
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body).to.eql({ id: userId, email: 'test@test.com' });
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).get('/users/me').send();
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return unauthorized for invalid token', async () => {
      const response = await request(app).get('/users/me').set('X-Token', 'invalidToken').send();
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });
  });
});
