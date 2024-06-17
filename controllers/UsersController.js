import dbClient from '../utils/db';

const sha1 = require('sha1');

class UsersController {
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
}

export default UsersController;
