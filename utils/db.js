import mongoDBCore from 'mongodb/lib/core';

const { MongoClient } = require('mongodb');

/**
 * MongoDB client class.
 * @class DBClient
 * @property {object} db - The MongoDB client.
 * @method {boolean} isAlive - Checks if the MongoDB client is connected to the server.
 * @method {Promise} nbUsers - Returns the number of documents in the collection users.
 * @method {Promise} nbFiles - Returns the number of documents in the collection files.
 */

class DBClient {
  /**
   * Creates a new DBClient instance.
   */
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    this.client.connect((err) => {
      if (!err) {
        // console.log(`Connected to MongoDB at ${host}:${port}/${database}`);
        this.dbAlive = true;
      } else {
        console.error(err.message);
        this.dbAlive = false;
      }
    });
  }

  /**
   * Checks if the MongoDB client is connected to the server.
   * @returns {boolean} true if connected, false otherwise.
   */
  isAlive() {
    return !!this.dbAlive;
  }

  /**
   * Returns the number of documents in the collection users.
   * @returns {Promise<number>} The number of documents in the collection users.
   */
  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  /**
   * Returns the number of documents in the collection files.
   * @returns {Promise<number>} The number of documents in the collection files.
   */
  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

  /**
   * Retrieves a reference to the `users` collection.
   * @returns {Promise<Collection>}
   */
  async usersCollection() {
    return this.client.db().collection('users');
  }

  /**
   * Retrieves a user by their email.
   * @param {string} email - The user's email.
   * @returns {Promise<Document>} The user document.
   */
  async findUserByEmail(email) {
    const usersCollection = await this.usersCollection();
    return usersCollection.findOne({ email });
  }

  /**
   * Retrieves a user by their ID.
   * @param {string} userId - The user's ID.
   * @returns {Promise<Document>} The user document.
   */
  async findUserById(userId) {
    const usersCollection = await this.usersCollection();
    return usersCollection.findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
  }

  /**
   * Retrieves a reference to the `files` collection.
   * @returns {Promise<Collection>}
   */
  async filesCollection() {
    return this.client.db().collection('files');
  }

  /**
   * Retrives a file by their ID.
   * @param {string} fileId - The file's ID.
   * @return {Promise<Document>} The file document.
   */
  async getFileById(fileId) {
    const filesCollection = await this.filesCollection();
    return filesCollection.findOne({ _id: new mongoDBCore.BSON.ObjectId(fileId) });
  }

  /**
   * Retrives a file by their ID and User ID.
   * @param {string} fileId - The file's ID.
   * @return {Promise<Document>} The file document.
   */
  async getFileByIdAndUserId(fileId, userId) {
    const filesCollection = await this.filesCollection();
    return filesCollection.findOne({
      _id: new mongoDBCore.BSON.ObjectId(fileId),
      userId: new mongoDBCore.BSON.ObjectId(userId),
    });
  }

  /**
   * Retrives all files by their Parent ID and User ID.
   * @param {string} queryParam - The query parameter.
   * @return {Promise<Document[]>} The file document.
   */
  async getFilesByQueryFilters(pipeline) {
    const filesCollection = await this.filesCollection();
    return filesCollection.aggregate(pipeline).toArray();
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
