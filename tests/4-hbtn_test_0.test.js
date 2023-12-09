import chai from 'chai';
import chaiHttp from 'chai-http';

import MongoClient from 'mongodb';
import { promisify } from 'util';
import redis from 'redis';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('GET /connect', () => {
  let testClientDb;
  let testRedisClient;
  let redisDelAsync;
  let redisGetAsync;
  let redisSetAsync;
  let redisKeysAsync;

  let initialUser = null;
  let initialUserPwd = null;
  let initialUserId = null;

  const fctRandomString = () => {
    return Math.random().toString(36).substring(2, 15);
  }
  const fctRemoveAllRedisKeys = async () => {
    const keys = await redisKeysAsync('auth_*');
    keys.forEach(async (key) => {
      await redisDelAsync(key);
    });
  }

  beforeEach(() => {
    const dbInfo = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '27017',
      database: process.env.DB_DATABASE || 'files_manager'
    };
    return new Promise((resolve) => {
      MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, async (err, client) => {
        testClientDb = client.db(dbInfo.database);

        await testClientDb.collection('users').deleteMany({})

        // Add 1 user
        initialUserPwd = fctRandomString();
        initialUser = {
          email: `${fctRandomString()}@me.com`,
          password: sha1(initialUserPwd)
        }
        const createdDocs = await testClientDb.collection('users').insertOne(initialUser);
        if (createdDocs && createdDocs.ops.length > 0) {
          initialUserId = createdDocs.ops[0]._id.toString();
        }

        testRedisClient = redis.createClient();
        redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
        redisGetAsync = promisify(testRedisClient.get).bind(testRedisClient);
        redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
        redisKeysAsync = promisify(testRedisClient.keys).bind(testRedisClient);
        testRedisClient.on('connect', async () => {
          fctRemoveAllRedisKeys();
          resolve();
        });
      });
    });
  });

  afterEach(() => {
    fctRemoveAllRedisKeys();
  });

  it('GET /connect with invalid Base64 content', (done) => {
    const basicAuth = `Basic ${Buffer.from(`hello`, 'binary').toString('base64')}`;
    chai.request('http://localhost:5000')
      .get('/connect')
      .set('Authorization', basicAuth)
      .end(async (err, res) => {
        chai.expect(err).to.be.null;
        chai.expect(res).to.have.status(401);

        const resError = res.body.error;
        chai.expect(resError).to.equal("Unauthorized");

        const authKeys = await redisKeysAsync('auth_*');
        chai.expect(authKeys.length).to.equal(0);

        done();
      });
  }).timeout(30000);
});
