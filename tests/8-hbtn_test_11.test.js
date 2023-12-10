import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { promisify } from 'util';
import redis from 'redis';

import { MongoClient, ObjectID } from 'mongodb';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('GET /files/:id/data', () => {
    let testClientDb;
    let testRedisClient;
    let redisDelAsync;
    let redisGetAsync;
    let redisSetAsync;
    let redisKeysAsync;

    let fileUser = null;
    let fileUserId = null;

    let initialUser = null;
    let initialUserId = null;
    let initialUserToken = null;

    let initialUnpublishedFileId = null;
    let initialPublishedFileId = null;

    const folderTmpFilesManagerPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    const fctRandomString = () => {
        return Math.random().toString(36).substring(2, 15);
    }
    const fctRemoveAllRedisKeys = async () => {
        const keys = await redisKeysAsync('auth_*');
        keys.forEach(async (key) => {
            await redisDelAsync(key);
        });
    }
    const fctCreateTmp = () => {
        if (!fs.existsSync(folderTmpFilesManagerPath)) {
            fs.mkdirSync(folderTmpFilesManagerPath);
        }
    }
    const fctRemoveTmp = () => {
        if (fs.existsSync(folderTmpFilesManagerPath)) {
            fs.readdirSync(`${folderTmpFilesManagerPath}/`).forEach((i) => {
                fs.unlinkSync(`${folderTmpFilesManagerPath}/${i}`)
            })
        }
    }

    beforeEach(() => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager'
        };
        return new Promise((resolve) => {
            fctRemoveTmp();
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

                // Add 1 user owner of file
                fileUser = {
                    email: `${fctRandomString()}@me.com`,
                    password: sha1(fctRandomString())
                }
                const createdUserFileDocs = await testClientDb.collection('users').insertOne(fileUser);
                if (createdUserFileDocs && createdUserFileDocs.ops.length > 0) {
                    fileUserId = createdUserFileDocs.ops[0]._id.toString();
                }

                // Add 1 file publish
                fctCreateTmp();
                const initialFileP = {
                    userId: ObjectID(fileUserId),
                    name: fctRandomString(),
                    type: "file",
                    parentId: '0',
                    isPublic: true,
                    localPath: `${folderTmpFilesManagerPath}/${uuidv4()}`
                };
                const createdFilePDocs = await testClientDb.collection('files').insertOne(initialFileP);
                if (createdFilePDocs && createdFilePDocs.ops.length > 0) {
                    initialPublishedFileId = createdFilePDocs.ops[0]._id.toString();
                }

                // Add 1 file unpublish
                const initialFileUP = {
                    userId: ObjectID(fileUserId),
                    name: fctRandomString(),
                    type: "file",
                    parentId: '0',
                    isPublic: false,
                    localPath: `${folderTmpFilesManagerPath}/${uuidv4()}`
                };
                const createdFileUPDocs = await testClientDb.collection('files').insertOne(initialFileUP);
                if (createdFileUPDocs && createdFileUPDocs.ops.length > 0) {
                    initialUnpublishedFileId = createdFileUPDocs.ops[0]._id.toString();
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
        fctRemoveTmp();
    });

    it('GET /files/:id/data with an unpublished file not present locally linked to :id and user unauthenticated', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialUnpublishedFileId}/data`)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(404);

                const resError = res.body.error;
                chai.expect(resError).to.equal("Not found");

                done();
            });
    }).timeout(30000);

    it('GET /files/:id/data with a published file not present locally linked to :id and user unauthenticated', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialPublishedFileId}/data`)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(404);

                const resError = res.body.error;
                chai.expect(resError).to.equal("Not found");

                done();
            });
    }).timeout(30000);
});
