import { Database } from "arangojs";
import { run, inspect } from "../migrado";
import { MigrationClient } from "../dbClient";

const MIGRADO_HOST = process.env.HOST || 'localhost'
const MIGRADO_PORT = 8529
const MIGRADO_DB = 'test'
const MIGRADO_USERNAME = 'root'


describe('WHILE testing migrado client', () => {
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
    describe('WHEN testing inspect', () => {
        beforeAll(async () => {
            await inspect({
                path: __dirname + '/migrations',
                migrationConfig: {
                    username: MIGRADO_USERNAME,
                    databaseName: MIGRADO_DB,
                    host: MIGRADO_HOST,
                    port: MIGRADO_PORT
                }
            })
        })
        it('should log', () => {
            expect('work').toBe('work')
        })
    })


    describe('WHEN testing migration with no current', () => {
        let client: MigrationClient;
        let currentState: any;
        beforeAll(async () => {
            await run({
                path: __dirname + '/migrations',
                migrationConfig: {
                    username: MIGRADO_USERNAME,
                    databaseName: MIGRADO_DB,
                    host: MIGRADO_HOST,
                    port: MIGRADO_PORT
                }
            })

            client = new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
            const userCollection = await client.database.createCollection('users')
            await userCollection.import([{
                _key: 'ray',
                fullName: 'Ray Ch',
            }, {
                _key: 'john',
                fullName: 'John Doe',
            }])
            currentState = await client.readState()
        })
        it('should migrate to', async () => {
            const userList = await client.database.query(`
                FOR user IN users
                RETURN user
            `);
            for await (const user of userList) {
                expect(user.fullName).toBeDefined();
                expect(user.name).toBeUndefined();
            }
            expect(currentState).toBe(null);
        })
    })

    describe('WHEN forward migration', () => {
        let client: MigrationClient;
        let currentState: any;
        beforeAll(async () => {
            await run({
                current: '000_spec',
                path: __dirname + '/migrations',
                migrationConfig: {
                    username: MIGRADO_USERNAME,
                    databaseName: MIGRADO_DB,
                    host: MIGRADO_HOST,
                    port: MIGRADO_PORT
                }
            })

            client = new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
            currentState = await client.readState()
        })
        it('should migrate to', async () => {
            const userList = await client.database.query(`
                FOR user IN users
                RETURN user
            `);
            for await (const user of userList) {
                expect(user.fullName).toBeDefined();
                expect(user.name).toBeDefined();
            }
            expect(currentState).toBe('002_not_good_migration');
        })
    })


    describe('WHEN reserve migration', () => {
        let client: MigrationClient;
        let currentState: any;
        beforeAll(async () => {
            await run({
                target: '000_spec',
                path: __dirname + '/migrations',
                migrationConfig: {
                    username: MIGRADO_USERNAME,
                    databaseName: MIGRADO_DB,
                    host: MIGRADO_HOST,
                    port: MIGRADO_PORT
                }
            })

            client = new MigrationClient({
                username: MIGRADO_USERNAME,
                databaseName: MIGRADO_DB,
                host: MIGRADO_HOST,
                port: MIGRADO_PORT
            })
            currentState = await client.readState()
        })
        it('should migrate to', async () => {
            const userList = await client.database.query(`
                FOR user IN users
                RETURN user
            `);
            for await (const user of userList) {
                expect(user.fullName).toBeDefined();
                expect(user.name).toBeUndefined();
            }
            expect(currentState).toBe('002_not_good_migration');
        })
    })
});