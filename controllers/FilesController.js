import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import {
  authenticateUser, validateRequest,
  formatResponse, saveFileToDisk,
} from '../utils/users';

const Queue = require('bull');

const fs = require('fs');

const fileQueue = new Queue('fileQ');

class FilesController {
  static async postUpload(request, response) {
    try {
      const userId = await authenticateUser(request, response);
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

      validateRequest(name, type, data, response);
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
        return response.status(201).send(formatResponse(fileDoc._id, fileDoc));
      }
      const filePath = saveFileToDisk(data, response);
      await dbClient.filesCollection.insertOne(fileDoc);
      fileDoc.localPath = filePath;

      fileQueue.add({
        userId: fileDoc.userId,
        fileId: fileDoc._id,
      });

      return response.status(201).json(formatResponse(fileDoc._id, fileDoc));
    } catch (err) {
      console.log(err);
      return response.status(400).json({ error: err.message });
    }
  }

  static async getShow(request, response) {
    try {
      const userId = await authenticateUser(request, response);
      if (!userId) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = request.params.id;

      const file = await dbClient.filesCollection.findOne({
        _id: ObjectId(fileId),
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
      const userId = await authenticateUser(request, response);
      if (!userId) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      const { parentId = 0, page = 0 } = request.query;
      const perPage = 20;
      const skip = parseInt(page, 10) * perPage;
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

  static async putPublish(request, response) {
    try {
      const userId = await authenticateUser(request, response);
      if (!userId) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = request.params.id;

      let file = await dbClient.filesCollection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) {
        return response.status(404).send({ error: 'Not found' });
      }
      await dbClient.filesCollection.updateOne({ _id: ObjectId(fileId) },
        { $set: { isPublic: true } });
      file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id });

      return response.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (err) {
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(request, response) {
    try {
      const userId = await authenticateUser(request, response);
      if (!userId) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return response.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = request.params.id;

      let file = await dbClient.filesCollection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) {
        return response.status(404).send({ error: 'Not found' });
      }
      await dbClient.filesCollection.updateOne({ _id: ObjectId(fileId) },
        { $set: { isPublic: false } });
      file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id });

      return response.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (err) {
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(request, response) {
    const fileId = request.params.id || '';
    const size = request.query.size || 0;

    const file = await dbClient.filesCollection.findOne({
      _id: ObjectId(fileId),
    });
    if (!file) {
      return response.status(404).send({ error: 'Not found' });
    }
    const { isPublic, userId, type } = file;
    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
    if ((!isPublic && !user) || (user && userId.toString() !== user && !isPublic)) return response.status(404).send({ error: 'Not found' });
    if (type === 'folder') return response.status(400).send({ error: 'A folder doesn\'t have content' });

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const fileData = fs.readFileSync(path);
      const mimeType = mime.contentType(file.name);
      response.setHeader('Content-Type', mimeType);
      return response.status(200).send(fileData);
    } catch (err) {
      return response.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
