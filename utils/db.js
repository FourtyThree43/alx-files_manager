import { MongoClient } from 'mongodb';

/**
 * MongoDB client class.
 * @class DBClient
 * @property {object} db - The MongoDB client.
 * @method {boolean} isAlive - Checks if the MongoDB client is connected to the server.
 * @method {Promise} nbUsers - Returns the number of documents in the collection users.
 * @method {Promise} nbFiles - Returns the number of documents in the collection files.
 */

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.uri = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.uri, { useUnifiedTopology: true });
  }

  /**
   * Checks if the MongoDB client is connected to the server.
   * @returns {boolean} true if connected, false otherwise.
   */
  async isAlive() {
    try {
      await this.client.connect();
      return true;
    } catch (err) {
      console.error(`MongoDB Connection Error: ${err}`);
      return false;
    } finally {
      await this.client.close();
    }
  }

  /**
   * Returns the number of documents in the collection users.
   * @returns {Promise<number>} The number of documents in the collection users.
   */
  async nbUsers() {
    try {
      await this.client.connect();
      const usersCount = await this.client.db(this.database).collection('users').countDocuments();
      await this.client.close();
      return usersCount;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      await this.client.close();
    }
  }

  /**
   * Returns the number of documents in the collection files.
   * @returns {Promise<number>} The number of documents in the collection files.
   */
  async nbFiles() {
    try {
      await this.client.connect();
      const filesCount = await this.client.db(this.database).collection('files').countDocuments();
      await this.client.close();
      return filesCount;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      await this.client.close();
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
