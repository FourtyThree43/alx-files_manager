import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull/lib/queue';
import fileService from '../utils/fileService';
import dbClient from '../utils/db';
import { getUserFromXToken } from '../middlewares/authenticate';

const VALID_FILE_TYPES = { folder: 'folder', file: 'file', image: 'image' };
const MAX_FILES_PER_PAGE = 20;
const { ObjectId } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');

const fileQueue = new Queue('thumbnail generation');

/**
 * Controller for the index route.
 * @class FilesController
 * @method postUpload
 */
class FilesController {
  /**
   * Method for the route POST /files.
   * Create's a new file in DB and in disk.
   * @param {object} _req - The express request object.
   * @param {object} res - The express response object.
   * @returns {object}
   */
  static async postUpload(req, res) {
    const name = req.body ? req.body.name : null;
    const type = req.body ? req.body.type : null;
    const parentId = req.body && req.body.parentId ? req.body.parentId : 0;
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const data = req.body && req.body.data ? req.body.data : '';

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !VALID_FILE_TYPES[type]) return res.status(400).json({ error: 'Missing type' });
    if (type !== VALID_FILE_TYPES.folder && !data) return res.status(400).json({ error: 'Missing data' });

    if (parentId) {
      const parentFile = await dbClient.getFileById(parentId);
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== VALID_FILE_TYPES.folder) return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileData = {
      userId: req.user._id,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
    };

    if (type === VALID_FILE_TYPES.folder) {
      const newFolder = await fileService.saveFileInDB(fileData, dbClient);
      return res.status(201).json({
        id: newFolder._id.toString(),
        userId: newFolder.userId,
        name: newFolder.name,
        type: newFolder.type,
        isPublic: newFolder.isPublic,
        parentId: newFolder.parentId,
      });
    }
    const filename = uuidv4();
    const localPath = await fileService.saveFileInDisk(data, filename);
    fileData.localPath = localPath;
    const newFile = await fileService.saveFileInDB(fileData, dbClient);
    const fileId = newFile._id.toString();

    // start thumbnail generation worker
    const userId = req.user._id;
    if (type === VALID_FILE_TYPES.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }

    return res.status(201).json({
      id: fileId,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
      // localPath: newFile.localPath,
    });
  }

  /**
   * Method for the route GET /files/:id
   * Get's a file by it's ID.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @return {object}
   */
  static async getShow(req, res) {
    const fileId = req.params ? req.params.id : '';
    const file = await dbClient.getFileById(fileId);
    if (!file) return res.status(404).json({ error: 'Not found' });
    if (file.userId.toString() !== req.user._id.toString()) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
      // localPath: file.localPath,
    });
  }

  /**
   * Method for the route GET /files/
   * Get's all files for a user.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @return {object} A list of file documents.
   */
  static async getIndex(req, res) {
    const parentId = req.query.parentId || 0;
    const userId = req.user._id;
    const pagination = req.query.page || 0;

    const filesFilter = { $and: [{ parentId }, { userId }] };
    let aggregateData = [
      { $match: filesFilter },
      { $skip: pagination * MAX_FILES_PER_PAGE },
      { $limit: MAX_FILES_PER_PAGE },
    ];

    if (parentId === 0) {
      aggregateData = [
        { $skip: pagination * MAX_FILES_PER_PAGE },
        { $limit: MAX_FILES_PER_PAGE },
      ];
    }

    const files = await dbClient.getFilesByQueryFilters(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });
    console.log(filesArray.length);
    console.log(files.length);
    return res.send(filesArray);
  }

  /**
   * Method for the route PUT /files/:id/publish
   * Publish a file by it's ID.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @return {object}    - The published file.
   */
  static async putPublish(req, res) {
    const id = req.params.id || '';
    const userId = req.user._id;

    const file = await dbClient.getFileByIdAndUserId(id, userId);
    if (!file) return res.status(404).json({ error: 'Not found' });

    const fileFilter = {
      _id: ObjectId(id),
      userId: ObjectId(userId),
    };
    await (await dbClient.filesCollection()).updateOne(fileFilter, { $set: { isPublic: true } });

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === '0'
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Method for the route PUT /files/:id/unpublish
   * Unpublish a file by it's ID.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @return {object}    - The unpublished file.
   */
  static async putUnpublish(req, res) {
    const id = req.params.id || '';
    const userId = req.user ? req.user._id : '';

    const file = await dbClient.getFileByIdAndUserId(id, userId);
    if (!file) return res.status(404).json({ error: 'Not found' });

    const fileFilter = {
      _id: ObjectId(id),
      userId: ObjectId(userId),
    };
    await (await dbClient.filesCollection())
      .updateOne(fileFilter, { $set: { isPublic: false } });

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === '0'
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Method for the route GET /files/:id/data
   * Get's a file by it's ID.
   * @param {object} req - The express request object.
   * @param {object} res - The express response object.
   * @return {object}    - The file data.
   */
  static async getFile(req, res) {
    const id = req.params.id || '';
    const size = req.query.size || 0;

    const file = await dbClient.getFileById(id);
    if (!file) return res.status(404).json({ error: 'Not found' });

    const { userId, isPublic } = file;

    // Get user from X-token
    const XToken = req.headers['x-token'];
    let user = null;
    let owner = false;

    user = await getUserFromXToken(XToken);
    if (user) owner = (user._id.toString() === userId.toString());

    if (!isPublic && !owner) return res.status(404).json({ error: 'Not found' });
    if (file.type === VALID_FILE_TYPES.folder) {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    const filePath = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const dataFile = fs.readFileSync(filePath);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.send(dataFile);
    } catch (error) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
