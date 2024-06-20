import {
  expect, use, request,
} from 'chai';
import chaiHttp from 'chai-http';
import { ObjectId } from 'mongodb';
import app from '../../server';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';

use(chaiHttp);

describe.skip('testing File Endpoints', () => {
  before(async () => {
    // await dbClient.usersCollection.deleteMany({});
    await dbClient.filesCollection.deleteMany({});
  });

  let token;
  let userId;

  beforeEach(async () => {
    // await request(app).post('/users').send({
    //   email: 'test@test.com',
    //   password: 'password',
    // });
    token = "8d8f1f14-7ad7-4d59-8e2c-d987db11352"
  });

  describe('pOST /files', () => {
    it('should create a file', async () => {
      const response = await request(app)
        .post('/files')
        // .set('X-Token', token)
        .send({
          name: 'test file',
          type: 'file',
          isPublic: false,
          data: 'test data',
        });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(201);
      expect(body).to.have.property('id');
      expect(body).to.have.property('name', 'test file');
    });

    it('should return error for missing data', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .post('/files')
        .send({
          name: 'test file',
          type: 'file',
          isPublic: false,
        });
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(400);
      expect(body).to.eql({ error: 'Missing data' });
    });
  });

  describe('gET /files/:id', () => {
    let fileId;

    beforeEach(async () => {
      const file = await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file',
        type: 'file',
        isPublic: false,
        data: 'test data',
      });
      fileId = file.insertedId.toString();
    });

    it('should return file info for valid id', async () => {
      const response = await request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', token);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body.file).to.have.property('name', 'test file');
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).get(`/files/${fileId}`);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return not found for invalid id', async () => {
      const response = await request(app)
        .get('/files/invalidId')
        .set('X-Token', token);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(404);
      expect(body).to.eql({ error: 'Not found' });
    });
  });

  describe('gET /files', () => {
    beforeEach(async () => {
      await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file 1',
        type: 'file',
        isPublic: false,
        data: 'test data',
      });
      await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file 2',
        type: 'file',
        isPublic: false,
        data: 'test data',
      });
    });

    it('should return list of files', async () => {
      const response = await request(app)
        .get('/files')
        .set('X-Token', token);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body.length).to.equal(2);
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).get('/files');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });
  });

  describe('pUT /files/:id/publish', () => {
    let fileId;

    beforeEach(async () => {
      const file = await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file',
        type: 'file',
        isPublic: false,
        data: 'test data',
      });
      fileId = file.insertedId.toString();
    });

    it('should publish file', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .put(`/files/${fileId}/publish`);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body).to.have.property('isPublic', true);
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).put(`/files/${fileId}/publish`);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return not found for invalid id', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .put('/files/invalidId/publish');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(404);
      expect(body).to.eql({ error: 'Not found' });
    });
  });

  describe('pUT /files/:id/unpublish', () => {
    let fileId;

    beforeEach(async () => {
      const file = await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file',
        type: 'file',
        isPublic: true,
        data: 'test data',
      });
      fileId = file.insertedId.toString();
    });

    it('should unpublish file', async () => {
      const response = await request(app)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', token);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(200);
      expect(body).to.have.property('isPublic', false);
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).put(`/files/${fileId}/unpublish`);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return not found for invalid id', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .put('/files/invalidId/unpublish');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(404);
      expect(body).to.eql({ error: 'Not found' });
    });
  });

  describe('gET /files/:id/data', () => {
    let fileId;

    beforeEach(async () => {
      const file = await dbClient.filesCollection.insertOne({
        userId: ObjectId(userId),
        name: 'test file',
        type: 'file',
        isPublic: false,
        data: 'test data',
        localPath: '/path/to/file',
      });
      fileId = file.insertedId.toString();
    });

    it('should return file data for valid id', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .get(`/files/${fileId}/data`);
      expect(response.statusCode).to.equal(200);
    });

    it('should return unauthorized for missing token', async () => {
      const response = await request(app).get(`/files/${fileId}/data`);
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(401);
      expect(body).to.eql({ error: 'Unauthorized' });
    });

    it('should return not found for invalid id', async () => {
      const response = await request(app)
        .set('X-Token', token)
        .get('/files/invalidId/data');
      const body = JSON.parse(response.text);

      expect(response.statusCode).to.equal(404);
      expect(body).to.eql({ error: 'Not found' });
    });
  });
});
