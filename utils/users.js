import { v4 as uuidv4 } from 'uuid';
import redisClient from './redis';

const path = require('path');
const fs = require('fs');

export async function authenticateUser(request, response) {
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

export function validateRequest(name, type, data, response) {
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

export function formatResponse(id, fileDoc) {
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

export function saveFileToDisk(data, response) {
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
