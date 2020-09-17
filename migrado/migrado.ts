import {
  ensureDir,
  getMigrationFileAsObject,
  logger,
  checkMigrations,
  checkDb,
  selectMigrations,
  MIGRATION_DIRECTION,
  sortKeys,
  FilePathObject,
} from "./utils";
import { MigrationClient, IMigrationClient } from "./dbClient";


export interface InspectConfig {
  path: string;
  dbConfig: IMigrationClient;
}

/**
 * Title: Inspect the migration
 * Description:
 *  It's used to inspect the migration path and checks if there are any migrations pending.
 *  sends out the log
 * @param config
 *  + Path - Path where the migrations are located
 *  + Migration Config - the configuration of the DB to connect to ArangoDB.
 */
export const inspect = async (config: InspectConfig): Promise<void> => {

  const { path, dbConfig } = config;
  const { databaseName } = dbConfig;

  // Ensuring the migration path
  const migrationPath: any = (await ensureDir(path)) ? path : null;
  if (!migrationPath) {
    logger.error("Migration path does not exist");
  }

  // Getting all the migrations and sorting them
  const migrations: FilePathObject = sortKeys(
    await getMigrationFileAsObject(migrationPath)
  );

  // Making them an object.
  const migrationKeys: string[] = Object.keys(migrations);

  // Note: Continue only if there are migration file in the directory
  if (checkMigrations(migrationKeys)) {
    // Getting the latest key
    const lastMigrationKey = migrationKeys[migrationKeys.length - 1];
    logger.info(`Latest migration on disk is ${lastMigrationKey}`);

    // Getting the latest migration in the Database.
    if (checkDb(databaseName)) {
      const dbClient: MigrationClient = new MigrationClient({
        ...dbConfig,
      });
      const migrationPathInDB = await dbClient.readState();
      logger.info(`Latest migration on DB is ${migrationPathInDB}`);
    }

  }
};

export interface RunConfig {
  path: string;
  target?: string;
  current?: string;
  dbConfig: IMigrationClient;
}


/**
 * Title: Running The Migration
 * Description:
 *  Here we run the migration for a single database.
 * @param config
 *  + Path - Path where the migrations are located
 *  + Migration Config - the configuration of the DB to connect to ArangoDB.
 */
export const run = async (config: RunConfig): Promise<void> => {

  const { path, dbConfig } = config;
  const { databaseName } = dbConfig;

  // Ensuring the migration path
  const migrationPath: any = (await ensureDir(path)) ? path : null;
  if (!migrationPath) {
    logger.error("Migration path does not exist");
  }

  // Getting all the migrations and sorting them
  const migrations: FilePathObject = sortKeys(
    await getMigrationFileAsObject(migrationPath)
  );

  // Making them an object.
  const migrationKeys: string[] = Object.keys(migrations);

  if (!checkMigrations(migrationKeys)) {
    throw Error("No migrations found")
  };

  const lastMigrationKey = migrationKeys[migrationKeys.length - 1];
  logger.info(`Latest migration on disk is ${lastMigrationKey}`);
  checkDb(databaseName);

  const target = config?.target || lastMigrationKey;
  if (!migrationKeys.includes(target)) {
    logger.error(`Target ${target} not found, please correct migration.`);
    throw new Error(`Target ${target} not found, please correct migration.`);
  }

  const dbClient: MigrationClient = new MigrationClient({
    ...dbConfig,
  });
  let state;

  try {
    state = config?.current || (await dbClient.readState());
  } catch (err) {
    logger.error(err);
    throw err;
  }
  const collectionList = await dbClient.listCollection();

  const { direction, selected: selectedMigrations } = selectMigrations(
    state,
    target,
    migrationKeys
  );
  logger.info("Direction", direction);
  logger.info("Selected Migrations", selectedMigrations);
  logger.info("Current", state);
  logger.info("Target", target);
  for await (const migrationKey of selectedMigrations) {
    logger.info(
      `Running ${direction} migration ${migrationKey} in transaction...`
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migration = require(`${migrations[migrationKey]}`);
    const trx = await dbClient.database.beginTransaction({
      write: collectionList,
    });
    try {
      if (direction === MIGRATION_DIRECTION.FORWARD) {
        await migration.forward(dbClient.database, trx);
      }
      if (direction === MIGRATION_DIRECTION.REVERSE) {
        await migration.reverse(dbClient.database, trx);
      }
      await dbClient.writeState(migrationKey, trx);
      await trx.commit();
    } catch (err) {
      await trx.abort();
    }
    logger.info(`State is now at ${migrationKey}`);
  }
  logger.info("DONE.");
};
