import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');
const path = require('path');

class FilesController {
  static async postUpload(request, response) {
    try {
      const userId = await this.authenticateUser(request, response);
      if (!userId) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) return response.status(401).send({ error: 'Unauthorized' });
      const {
        name,
        type,
        isPublic = false,
        data,
      } = request.body;
      let parentId = request.body.parentId || 0;

      this.validateRequest(name, type, data, response);
      parentId = parentId === '0' ? 0 : parentId;
      if (parentId !== 0) {
        const parent = await dbClient.filesCollection.findOne({ _id: ObjectId(parentId) });
        if (!parent) {
          return response.status(400).send({ error: 'Parent not found' });
        }

        if (parent.type !== 'folder') {
          return response.status(400).send({ error: 'Parent is not a folder' });
        }
      }
      const fileDoc = {
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      };
      if (type === 'folder') {
        await dbClient.filesCollection.insertOne(fileDoc);
        return response.status(201).send(this.formatResponse(fileDoc._id, fileDoc));
      }
      const filePath = this.saveFileToDisk(data, response);
      await dbClient.filesCollection.insertOne(fileDoc);
      fileDoc.localPath = filePath;
      return response.status(201).json(this.formatResponse(fileDoc._id, fileDoc));
    } catch (err) {
      console.log(err);
      return response.status(400).json({ error: err.message });
    }
  }

  static async authenticateUser(request, response) {
    const token = request.header('X-Token');
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return userId;
  }

  static validateRequest(name, type, data, response) {
    if (!name) {
      return response.status(400).send({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).send({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return response.status(400).send({ error: 'Missing data' });
    }
    return null;
  }

  static formatResponse(id, fileDoc) {
    const response = {
      id,
      userId: fileDoc.userId,
      name: fileDoc.name,
      type: fileDoc.type,
      isPublic: fileDoc.isPublic,
      parentId: fileDoc.parentId,
    };

    return response;
  }

  static saveFileToDisk(data, response) {
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fieldId = uuidv4();
    const filePath = path.join(folderPath, fieldId);
    fs.writeFile(filePath, Buffer.from(data, 'base64'), (err) => {
      if (err) return response.status(400).send({ error: err.message });
      return true;
    });
    return filePath;
  }

  static async getShow(request, response) {
    try {
      const userId = await this.authenticateUser(request, response);
      if (!userId) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = request.params.id;

      const file = await dbClient.filesCollection.findOne({
        id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) {
        return response.status(404).send({ error: 'Not found' });
      }
      return response.status(200).send({ file });
    } catch (err) {
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(request, response) {
    try {
      const userId = await this.authenticateUser(request, response);
      if (!userId) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      const { parentId = 0, page = 0 } = request.query;
      const perPage = 20;
      const skip = parseInt(page) * perPage;
      const files = await dbClient.filesCollection
        .find({ userId: ObjectId(userId), parentId })
        .skip(skip)
        .limit(perPage)
        .toArray();

      return response.status(200).send(files);
    } catch (err) {
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
