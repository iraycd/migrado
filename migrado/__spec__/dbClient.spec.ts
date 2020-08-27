import { MigrationClient } from "../dbClient";
import { Database } from "arangojs";

const MIGRADO_HOST = process.env.HOST || 'localhost'
const MIGRADO_PORT = 8529
const MIGRADO_DB = 'db_client'
const MIGRADO_USERNAME = 'root'


describe('WHILE testing migration client', () => {
    let systemDatabase: Database;
    beforeAll(async () => {
        systemDatabase = new Database({
            url: `http://${MIGRADO_HOST}:${MIGRADO_PORT}`,
            databaseName: '_system'
        });
        await systemDatabase.createDatabase(MIGRADO_DB);
    })

    afterAll(async () => {
        await systemDatabase.dropDatabase(MIGRADO_DB);
    })

    describe('WHEN testing the constructor', () => {
        it('SHOULD connect to the DB', async () => {
            new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
            new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
        });
    });

    describe('WHILE testing read and write migration state', () => {
        let client: MigrationClient
        let collectionList: string[];
        beforeAll(async () => {
            client = new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
        })
        describe('WHILE testing before write', () => {
            it('SHOULD get the not be written data', async () => {
                expect(await client.readState()).toBe(null);
                collectionList = await client.listCollection();
            })
        })

        describe('WHILE testing write and read', () => {
            it('SHOULD write data', async () => {
                const trx = await client.database.beginTransaction({
                    write: collectionList
                })
                expect(await client.writeState('001_initial', trx)).toBeDefined();
                trx.commit();
            })
            it('SHOULD get the not be written data', async () => {
                expect(await client.readState()).toBe('001_initial');
            })
        })

        describe('WHILE testing read after 3 writes', () => {
            it('SHOULD write data', async () => {
                const trx = await client.database.beginTransaction({
                    write: collectionList
                })
                expect(await client.writeState('0002_low_than_001', trx)).toBeDefined();
                trx.commit();
            })
            it('SHOULD get the not be written data', async () => {
                expect(await client.readState()).toBe('001_initial');
            })
            it('SHOULD write data', async () => {
                const trx = await client.database.beginTransaction({
                    write: collectionList
                })
                expect(await client.writeState('002_greater_than_001', trx)).toBeDefined();
                trx.commit();
            })
            it('SHOULD get the not be written data', async () => {
                expect(await client.readState()).toBe('002_greater_than_001');
            })
        })
    })
})



// def test_read_write_state(clean_arango):

//     client = MigrationClient(TLS, HOST, PORT, USERNAME, PASSWORD, DB, COLL)
//     current = client.read_state()

//     assert current == '0000'

//     success = client.write_state('0001')
//     current = client.read_state()

//     assert success
//     assert current == '0001'

// client = MigrationClient(TLS, HOST, PORT, USERNAME, PASSWORD, DB, COLL)
// client_two = MigrationClient(TLS, HOST, PORT, USERNAME, PASSWORD, DB, COLL)
