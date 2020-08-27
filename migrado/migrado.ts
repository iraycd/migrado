import { ensureDir, directoryFileSort, logger, checkMigrations, checkDb, selectMigrations, MIGRATION_DIRECTION, sortKeys, FilePathObject } from "./utils";
import { MigrationClient, IMigrationClient } from "./dbClient";


// const init = (schema, path) => {
//     // Use Orango.js For Schema
//     // Create Collection which don't exist
//     // All the collection should be created from migrations?? No.
//     // Not required now.
// }


// const make = () => {
//    // Not required right now.
// }

export interface InspectConfig {
    path: string;
    migrationConfig: IMigrationClient;
}

export const inspect = async (config: InspectConfig) => {
    const { path, migrationConfig } = config;
    const { databaseName } = migrationConfig;
    console.log('path', path)
    const migrationPath: any = await ensureDir(path) ? path : null;
    if (!migrationPath) {
        logger.error('Migration path does not exist')
    }
    const migrations: FilePathObject = sortKeys(await directoryFileSort(migrationPath));
    const migrationKeys: string[] = Object.keys(migrations);
    checkMigrations(migrationKeys);
    const lastMigrationKey = migrationKeys[migrationKeys.length - 1];
    logger.info(`Latest migration on disk is ${lastMigrationKey}`)
    checkDb(databaseName)
    const dbClient: MigrationClient = new MigrationClient({
        ...migrationConfig
    })
    const migrationPathInDB = await dbClient.readState();
    logger.info(`Latest migration on DB is ${migrationPathInDB}`)
}


export interface RunConfig {
    path: string;
    target?: string;
    current?: string;
    migrationConfig: IMigrationClient;
}

export const run = async (config: RunConfig) => {
    const { path, migrationConfig } = config;
    const { databaseName } = migrationConfig;
    console.log('path', path)
    const migrationPath: any = await ensureDir(path) ? path : null;
    if (!migrationPath) {
        logger.error('Migration path does not exist')
    }
    const migrations: FilePathObject = sortKeys(await directoryFileSort(migrationPath));
    const migrationKeys: string[] = Object.keys(migrations);
    checkMigrations(migrationKeys);
    const lastMigrationKey = migrationKeys[migrationKeys.length - 1];
    logger.info(`Latest migration on disk is ${lastMigrationKey}`)
    checkDb(databaseName)

    const target = config?.target || lastMigrationKey
    if (!migrationKeys.includes(target)) {
        logger.error(`Target ${target} not found, please correct migration.`)
        throw new Error(`Target ${target} not found, please correct migration.`);
    }

    const dbClient: MigrationClient = new MigrationClient({
        ...migrationConfig
    })
    let state;

    try {
        state = config?.current || await dbClient.readState();
    } catch (err) {
        logger.error(err);
        throw err;
    }
    const collectionList = await dbClient.listCollection();

    const { direction, selected: selectedMigrations } = selectMigrations(state, target, migrationKeys)
    logger.info('Direction', direction);
    logger.info('Selected Migrations', selectedMigrations);
    logger.info('Current', state);
    logger.info('Target', target);
    for await (let migrationKey of selectedMigrations) {
        logger.info(`Running ${direction} migration ${migrationKey} in transaction...`)
        const migration = require(`${migrations[migrationKey]}`);
        const trx = await dbClient.database.beginTransaction({
            write: collectionList
        })
        try {
            if (direction === MIGRATION_DIRECTION.FORWARD) {
                await migration.forward(dbClient.database, trx)
            }
            if (direction === MIGRATION_DIRECTION.REVERSE) {
                await migration.reverse(dbClient.database, trx)
            }
            await dbClient.writeState(migrationKey, trx)
            await trx.commit()
        } catch (err) {
            await trx.abort();
        }
        logger.info(`State is now at ${migrationKey}`)
    }
    logger.info('DONE.')
}