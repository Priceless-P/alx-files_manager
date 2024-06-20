const { expect } = require('chai');
const sinon = require('sinon');
const redisClient = require('../../utils/redis');

describe('redisClient', () => {
  let getAsyncStub, setAsyncStub, expireAsyncStub, delAsyncStub;

  before(() => {
    getAsyncStub = sinon.stub(redisClient, 'getAsync').resolves('value');
    setAsyncStub = sinon.stub(redisClient, 'setAsync').resolves();
    expireAsyncStub = sinon.stub(redisClient, 'expireAsync').resolves();
    delAsyncStub = sinon.stub(redisClient, 'delAsync').resolves();
  });

  after(() => {
    getAsyncStub.restore();
    setAsyncStub.restore();
    expireAsyncStub.restore();
    delAsyncStub.restore();
  });

  it('isAlive should return true when connected', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('get should return the correct value', async () => {
    const value = await redisClient.get('key');
    expect(value).to.equal('value');
  });

  it('set should set the value with expiration', async () => {
    await redisClient.set('key', 'value', 10);
    sinon.assert.calledWith(setAsyncStub, 'key', 'value');
    sinon.assert.calledWith(expireAsyncStub, 'key', 10);
  });

  it('del should delete the key', async () => {
    await redisClient.del('key');
    sinon.assert.calledWith(delAsyncStub, 'key');
  });
});
