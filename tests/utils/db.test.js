const { expect } = require('chai');
const sinon = require('sinon');
const {MongoClient} = require('mongodb');
const dbClient = require('../../utils/db');

describe('dBClient', () => {
  let connectStub, countDocumentsStub;

  before(() => {
    connectStub = sinon.stub(MongoClient.prototype, 'connect').resolves();
    countDocumentsStub = sinon.stub();
    dbClient.usersCollection = { countDocuments: countDocumentsStub };
    dbClient.filesCollection = { countDocuments: countDocumentsStub };
  });

  after(() => {
    connectStub.restore();
  });

  it('isAlive should return true when connected', () => {
    expect(dbClient.isAlive()).to.be.true;
  });

  it('nbUsers should return the correct number of users', async () => {
    countDocumentsStub.resolves(5);
    const count = await dbClient.nbUsers();
    expect(count).to.equal(5);
  });

  it('nbFiles should return the correct number of files', async () => {
    countDocumentsStub.resolves(3);
    const count = await dbClient.nbFiles();
    expect(count).to.equal(3);
  });
});
