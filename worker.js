import dbClient from './utils/db';

const Bull = require('bull');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');

const userQueue = new Bull('userQueue');
const fileQueue = new Bull('fileQueue');

const createImageThumbnail = async (path, options) => {
  try {
    const thumbNail = await imageThumbnail(path, options);
    const pathNail = `${path}_${options.width}`;

    await fs.writeFileSync(pathNail, thumbNail);
  } catch (error) {
    console.log(error);
  }
};

fileQueue.process(async (job) => {
  const { fileId } = job.data;
  if (!fileId) throw Error('Missing fileId');

  const { userId } = job.data;
  if (!userId) throw Error('Missing userId');

  const fileDoc = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!fileDoc) throw Error('File not found');

  createImageThumbnail(fileDoc.localPath, { width: 500 });
  createImageThumbnail(fileDoc.localPath, { width: 250 });
  createImageThumbnail(fileDoc.localPath, { width: 100 });
});

userQueue.process(async (job) => {
  const { userId } = job.data;
  if (!userId) throw Error('Missing userId');

  const userDocument = await db.findOne({ _id: ObjectId(userId) });
  if (!userDocument) throw Error('User not found');

  console.log(`Welcome ${userDocument.email}`);
});
