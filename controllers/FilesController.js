import { v4 as uuidv4 } from 'uuid';
import { createFileInDB, createFileInDisk } from '../middlewares/fileService';
import dbClient from '../utils/db';

const VALID_FILE_TYPES = { folder: 'folder', file: 'file', image: 'image' };

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
      const newFolder = await createFileInDB(fileData, dbClient);
      return res.status(201).json(newFolder);
    }
    const filename = uuidv4();
    const localPath = await createFileInDisk(data, filename);
    fileData.localPath = localPath;
    const newFile = await createFileInDB(fileData, dbClient);
    return res.status(201).json(newFile);
  }
}

export default FilesController;
