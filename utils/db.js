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
}

const dbClient = new DBClient();
module.exports = dbClient;
