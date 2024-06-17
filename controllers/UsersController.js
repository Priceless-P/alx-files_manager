import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class UsersController {
  /**
   * Creates a user using email and password
   *
   * To create a user, you must specify an email and a password
   * If the email is missing, return an error Missing email with
   * a status code 400
   * If the password is missing, return an error Missing password with
   * a status code 400
   * If the email already exists in DB, return an error Already exist with
   * a status code 400
   * The password must be stored after being hashed in SHA1
   * The endpoint is returning the new user with only the email and the id
   * (auto generated by MongoDB) with a status code 201
   * The new user must be saved in the collection users:
   * email: same as the value received
   * password: SHA1 value of the value received
   */
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) {
      return response.status(400).send({ error: 'Missing email' });
    }
    if (!password) {
      return response.status(400).send({ error: 'Missing password' });
    }

    const emailInDB = await dbClient.usersCollection.findOne({ email });
    if (emailInDB) {
      return response.status(400).send({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);

    try {
      const user = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword,
      });
      return response
        .status(201)
        .send({ id: user.insertedId.toString(), email });
    } catch (err) {
      return response.status(500).send({ error: err });
    }
  }

  static async getMe(request, response) {
    try {
      const token = request.header('X-Token') || '';
      if (token) {
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
          return response.status(401).send({ error: 'Unauthorized' });
        }
        const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
        return response.status(200).send({ email: user.email, id: user._id.toString() });
      }
    } catch (_err) {
      return response.status(500).send({ error: 'Internal Server error' });
    }
  }
}

export default UsersController;
