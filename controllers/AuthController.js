import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class AuthController {
  static async getConnect(request, response) {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const base64Creds = auth.split(' ')[1];
    const creds = Buffer.from(base64Creds, 'base64').toString();
    const [email, password] = creds.split(':');
    const hashedPassword = sha1(password);

    try {
      const user = await dbClient.usersCollection.findOne({ email, password: hashedPassword });
      if (!user) { return response.status(401).send({ error: 'Unauthorized' }); }
      const token = uuidv4();
      const key = `auth_${token}`;
      const userId = user._id.toString();
      await redisClient.set(key, userId, 86400);
      return response.status(200).send({ token });
    } catch (err) {
      console.error('Error authenticating user:', err);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getDisconnect(request, response) {
    try {
      const token = request.header('X-Token') || '';
      if (token) {
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
          return response.status(401).json({ error: 'Unauthorized' });
        }
        await redisClient.del(`auth_${token}`);
        return response.status(204).send('Disconnected');
      }
    } catch (_err) {
      return response.status(500).send({ error: 'Internal Server error' });
    }
  }
}

export default AuthController;
