import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';

import { MongoClient, ObjectID } from 'mongodb';
import { promisify } from 'util';
import redis from 'redis';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('GET /files/:id', () => {
    let testClientDb;
    let testRedisClient;
    let redisDelAsync;
    let redisGetAsync;
    let redisSetAsync;
    let redisKeysAsync;

    let initialUser = null;
    let initialUserId = null;
    let initialUserToken = null;

    let initialFolder = null;
    let initialFolderId = null;

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
                await testClientDb.collection('files').deleteMany({})

                // Add 1 user
                initialUser = { 
                    email: `${fctRandomString()}@me.com`,
                    password: sha1(fctRandomString())
                }
                const createdDocs = await testClientDb.collection('users').insertOne(initialUser);
                if (createdDocs && createdDocs.ops.length > 0) {
                    initialUserId = createdDocs.ops[0]._id.toString();
                }

                // Add 1 folder
                initialFolder = { 
                    userId: ObjectID(initialUserId), 
                    name: fctRandomString(), 
                    type: "folder", 
                    parentId: '0' 
                };
                const createdFileDocs = await testClientDb.collection('files').insertOne(initialFolder);
                if (createdFileDocs && createdFileDocs.ops.length > 0) {
                    initialFolderId = createdFileDocs.ops[0]._id.toString();
                }

                testRedisClient = redis.createClient();
                redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
                redisGetAsync = promisify(testRedisClient.get).bind(testRedisClient);
                redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
                redisKeysAsync = promisify(testRedisClient.keys).bind(testRedisClient);
                testRedisClient.on('connect', async () => {
                    fctRemoveAllRedisKeys();

                    // Set token for this user
                    initialUserToken = uuidv4()
                    await redisSetAsync(`auth_${initialUserToken}`, initialUserId)
                    resolve();
                });
            }); 
        });
    });
        
    afterEach(() => {
        fctRemoveAllRedisKeys();
    });

    it('GET /files/:id with correct :id of the owner', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialFolderId}`)
            .set('X-Token', initialUserToken)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(200);

                const resFile = res.body;
                chai.expect(resFile.name).to.equal(initialFolder.name);
                chai.expect(resFile.type).to.equal(initialFolder.type);
                chai.expect(resFile.parentId.toString()).to.equal(initialFolder.parentId.toString());
                chai.expect(resFile.userId.toString()).to.equal(initialFolder.userId.toString());

                done();
            });
    }).timeout(30000);
});