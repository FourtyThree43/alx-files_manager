import { promisify } from 'util';
import path from 'path';
import {
  mkdir, writeFile, existsSync,
} from 'fs';

// Convert callback-based fs functions to promise-based
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

/**
 * Create a new file document in the database.
 * @param {Object} fileData - The data for the new file.
 * @param {Object} dbClient - The database client.
 * @returns {Promise<Object>} The created file document.
 */
const saveFileInDB = async (fileData, dbClient) => {
  const filesCollection = await dbClient.filesCollection();
  const result = await filesCollection.insertOne(fileData);
  return result.ops[0];
};

/**
 * Create a new file on disk.
 * @param {string} base64Data - The file data in base64 format.
 * @param {string} filename - The name of the file.
 * @returns {Promise<string>} The path of the created file.
 */
const saveFileInDisk = async (base64Data, filename) => {
  if (!existsSync(FOLDER_PATH)) {
    await mkDirAsync(FOLDER_PATH);
  }
  const filePath = path.join(FOLDER_PATH, filename);
  await writeFileAsync(filePath, base64Data, { encoding: 'base64' });
  return filePath;
};

// const createThumbnail = async (newFile) => {
// }

const fileService = {
  saveFileInDB,
  saveFileInDisk,
};

export default fileService;
