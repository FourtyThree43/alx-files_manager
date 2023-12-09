import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';

import { MongoClient, ObjectID } from 'mongodb';
import { promisify } from 'util';
import redis from 'redis';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('gET /files', () => {
    let testClientDb;
    let testRedisClient;
    let redisDelAsync;
    let redisGetAsync;
    let redisSetAsync;
    let redisKeysAsync;

    let initialUser = null;
    let initialUserId = null;
    let initialUserToken = null;

    const initialFiles = [];

    const fctRandomString = () => Math.random().toString(36).substring(2, 15);
    const fctRemoveAllRedisKeys = async () => {
        const keys = await redisKeysAsync('auth_*');
        keys.forEach(async (key) => {
            await redisDelAsync(key);
        });
    };

    beforeEach(() => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager',
        };
        return new Promise((resolve) => {
            MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, async (err, client) => {
                testClientDb = client.db(dbInfo.database);

                await testClientDb.collection('users').deleteMany({});
                await testClientDb.collection('files').deleteMany({});

                // Add 1 user
                initialUser = {
                    email: `${fctRandomString()}@me.com`,
                    password: sha1(fctRandomString()),
                };
                const createdDocs = await testClientDb.collection('users').insertOne(initialUser);
                if (createdDocs && createdDocs.ops.length > 0) {
                    initialUserId = createdDocs.ops[0]._id.toString();
                }

                // Add folders
                for (let i = 0; i < 25; i += 1) {
                    const item = {
                        userId: ObjectID(initialUserId),
                        name: fctRandomString(),
                        type: 'folder',
                        parentId: '0',
                    };
                    const createdFileDocs = await testClientDb.collection('files').insertOne(item);
                    if (createdFileDocs && createdFileDocs.ops.length > 0) {
                        item.id = createdFileDocs.ops[0]._id.toString();
                    }
                    initialFiles.push(item);
                }

                testRedisClient = redis.createClient();
                redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
                redisGetAsync = promisify(testRedisClient.get).bind(testRedisClient);
                redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
                redisKeysAsync = promisify(testRedisClient.keys).bind(testRedisClient);
                testRedisClient.on('connect', async () => {
                    fctRemoveAllRedisKeys();

                    // Set token for this user
                    initialUserToken = uuidv4();
                    await redisSetAsync(`auth_${initialUserToken}`, initialUserId);
                    resolve();
                });
            });
        });
    });

    afterEach(() => {
        fctRemoveAllRedisKeys();
    });

    it('gET /files with no parentId and no page', () => new Promise((done) => {
        chai.request('http://localhost:5000')
            .get('/files')
            .set('X-Token', initialUserToken)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(200);

                const resList = res.body;
                chai.expect(resList.length).to.equal(20);

                resList.forEach((item) => {
                    const itemIdx = initialFiles.findIndex((i) => i.id == item.id);
                    console.log(itemIdx);
                    chai.assert.isAtLeast(itemIdx, 0);

                    const itemInit = initialFiles.splice(itemIdx, 1)[0];
                    chai.expect(itemInit).to.not.be.null;

                    chai.expect(itemInit.id).to.equal(item.id);
                    chai.expect(itemInit.name).to.equal(item.name);
                    chai.expect(itemInit.type).to.equal(item.type);
                    chai.expect(itemInit.parentId).to.equal(item.parentId);
                });

                chai.expect(initialFiles.length).to.equal(5);

                done();
            });
    })).timeout(30000);
});
