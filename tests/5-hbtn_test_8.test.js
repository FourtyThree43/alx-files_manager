import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import MongoClient from 'mongodb';
import { promisify } from 'util';
import redis from 'redis';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('POST /files', () => {
    let testClientDb;
    let testRedisClient;
    let redisDelAsync;
    let redisGetAsync;
    let redisSetAsync;
    let redisKeysAsync;

    let initialUser = null;
    let initialUserId = null;
    let initialUserToken = null;

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
        fctRemoveTmp();
    });

    it('POST /files creates a file at the root', (done) => {
        const fileClearContent = fctRandomString();
        const fileData = {
            name: fctRandomString(),
            type: 'file',
            data: Buffer.from(fileClearContent, 'binary').toString('base64')
        }
        
        let filesInTmpFilesManager = [];
        if (fs.existsSync(folderTmpFilesManagerPath)) {
            filesInTmpFilesManager = fs.readdirSync(folderTmpFilesManagerPath);
        }
        
        chai.request('http://localhost:5000')
            .post('/files')
            .set('X-Token', initialUserToken)
            .send(fileData)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(201);

                const resFile = res.body;
                chai.expect(resFile.name).to.equal(fileData.name);
                chai.expect(resFile.userId).to.equal(initialUserId);
                chai.expect(resFile.type).to.equal(fileData.type);
                chai.expect(resFile.parentId).to.equal(0);
                
                testClientDb.collection('files')
                    .find({})
                    .toArray((err, docs) => {
                        chai.expect(err).to.be.null;
                        chai.expect(docs.length).to.equal(1);
                        const docFile = docs[0];
                        chai.expect(docFile.name).to.equal(fileData.name);
                        chai.expect(docFile._id.toString()).to.equal(resFile.id);
                        chai.expect(docFile.userId.toString()).to.equal(initialUserId);
                        chai.expect(docFile.type).to.equal(fileData.type);
                        chai.expect(docFile.parentId.toString()).to.equal('0');

                        let newFilesInTmpFilesManager = [];
                        if (fs.existsSync(folderTmpFilesManagerPath)) {
                            newFilesInTmpFilesManager = fs.readdirSync(folderTmpFilesManagerPath);
                        }
                        chai.expect(newFilesInTmpFilesManager.length).to.equal(filesInTmpFilesManager.length + 1);
                        const newFileInDiskPath = newFilesInTmpFilesManager.filter(x => !filesInTmpFilesManager.includes(x));
                        
                        const newFileInDiskContent = fs.readFileSync(`${folderTmpFilesManagerPath}/${newFileInDiskPath[0]}`).toString();
                        chai.expect(newFileInDiskContent).to.equal(fileClearContent);

                        done();
                    })
            });
    }).timeout(30000);
});