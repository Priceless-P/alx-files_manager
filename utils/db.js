import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();

    this.db = this.client.db(database);
    this.usersCollection = this.db.collection('users');
    this.filesCollection = this.db.collection('files');
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      return await this.usersCollection.countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      return await this.filesCollection.countDocuments();
    } catch (err) {
      console.error('Error counting files:', err);
      return 0;
    }
  }
}

module.exports = new DBClient();
