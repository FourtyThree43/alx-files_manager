import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import { MongoClient, ObjectID } from 'mongodb';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('GET /files/:id/data', () => {
    let testClientDb;

    let initialUser = null;
    let initialUserId = null;

    let initialUnpublishedFolderId = null;
    let initialPublishedFolderId = null;

    const folderTmpFilesManagerPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    const fctRandomString = () => {
        return Math.random().toString(36).substring(2, 15);
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

                // Add 1 folder unpublished
                const initialUnpublishedFolder = {
                    userId: ObjectID(initialUserId),
                    name: fctRandomString(),
                    type: "folder",
                    parentId: '0',
                    isPublic: false
                };
                const createdUFolderDocs = await testClientDb.collection('files').insertOne(initialUnpublishedFolder);
                if (createdUFolderDocs && createdUFolderDocs.ops.length > 0) {
                    initialUnpublishedFolderId = createdUFolderDocs.ops[0]._id.toString();
                }

                // Add 1 folder published
                const initialPublishedFolder = {
                    userId: ObjectID(initialUserId),
                    name: fctRandomString(),
                    type: "folder",
                    parentId: '0',
                    isPublic: true
                };
                const createdPFolderDocs = await testClientDb.collection('files').insertOne(initialPublishedFolder);
                if (createdPFolderDocs && createdPFolderDocs.ops.length > 0) {
                    initialPublishedFolderId = createdPFolderDocs.ops[0]._id.toString();
                }

                resolve();
            });
        });
    });

    afterEach(() => {
        fctRemoveTmp();
    });

    it('GET /files/:id/data with an unpublished folder linked to :id but user unauthenticated', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialUnpublishedFolderId}/data`)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(404);

                const resError = res.body.error;
                chai.expect(resError).to.equal("Not found");

                done();
            });
    }).timeout(30000);

    it('GET /files/:id/data with a published folder linked to :id but user unauthenticated', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialPublishedFolderId}/data`)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(400);

                const resError = res.body.error;
                chai.expect(resError).to.equal("A folder doesn't have content");

                done();
            });
    }).timeout(30000);
});
