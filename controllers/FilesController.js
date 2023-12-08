import { v4 as uuidv4 } from 'uuid';
import fileService from '../utils/fileService';
import dbClient from '../utils/db';

const VALID_FILE_TYPES = { folder: 'folder', file: 'file', image: 'image' };
const MAX_FILES_PER_PAGE = 20;

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
      parentId: parentId || '0',
    };

    if (type === VALID_FILE_TYPES.folder) {
      const newFolder = await fileService.saveFileInDB(fileData, dbClient);
      return res.send({
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

    return res.send({
      id: fileId,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
      localPath: newFile.localPath,
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
    const { fileId } = req.params ? req.params.id : ' ';
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
   * @param {object} _req - The express request object.
   * @param {object} res - The express response object.
   * @return {object} A list of file documents.
   */
  static async getIndex(req, res) {
    const parentId = req.query.parentId || '0';
    const page = req.query.page || 0;

    const filesFilter = {
      userId: req._id,
      parentId,
    };

    const aggregatePipeline = [
      { $match: filesFilter },
      { $sort: { _id: -1 } },
      { $skip: page * MAX_FILES_PER_PAGE },
      { $limit: MAX_FILES_PER_PAGE },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: {
            $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
          },
        },
      },
    ];
    const files = await dbClient.getFilesByQueryFilters(aggregatePipeline);

    return res.json(files);
  }
}

export default FilesController;
