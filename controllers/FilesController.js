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
        return response.status(403).send({ error: 'Unauthorized' });
      }
      const {
        name,
        type,
        parentId = '0',
        isPublic = false,
        data,
      } = request.body;

      this.validateRequest(name, type, data, response);
      if (parentId !== '0') {
        return await this.checkParentFolder(parentId, response);
      }
      const fileDoc = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: ObjectId(parentId),
      };
      if (type === 'folder') {
        const result = await dbClient.filesCollection.insertOne(fileDoc);
        return response.status(201).send(this.formatResponse(result.insertedId, fileDoc));
      }
      const filePath = this.saveFileToDisk(data);
      fileDoc.localPath = filePath;
      const result = await dbClient.filesCollection.insertOne(fileDoc);
      return response.status(201).json(this.formatResponse(result.insertedId, fileDoc));
    } catch (err) {
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

  static async checkParentFolder(parentId, response) {
    const parent = await dbClient.filesCollection.findOne({ _id: ObjectId(parentId) });
    if (!parent) {
      return response.status(400).send({ error: 'Parent not found' });
    }

    if (parent.type !== 'folder') {
      return response.status(400).send({ error: 'Parent is not a folder' });
    }
    return null;
  }

  static formatResponse(id, fileDoc) {
    const response = {
      id: id.toString(),
      userId: fileDoc.userId,
      name: fileDoc.name,
      type: fileDoc.type,
      isPublic: fileDoc.isPublic,
      parentId: fileDoc.parentId,
    };

    // if (filePath) {
    //   response.localPath = filePath;
    // }

    return response;
  }

  static saveFileToDisk(data) {
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fieldId = uuidv4();
    const filePath = path.join(folderPath, fieldId);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return filePath;
  }
}

export default FilesController;
