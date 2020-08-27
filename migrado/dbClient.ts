import { Database, CollectionType, aql } from 'arangojs';
import { DocumentCollection, CollectionMetadata } from 'arangojs/collection';
import { Document } from 'arangojs/documents';
import { Transaction } from 'arangojs/transaction';
import { logger } from './utils';

export interface IMigrationClient {
    uri?: string;
    databaseName: string;
    username: string;
    tls?: boolean;
    host?: string;
    port?: number;
    password?: string;
    migrationCollectionName?: string;
}

export interface IStateDocument {
    _key?: 'state';
    migrationKey: string | null;
}

export class MigrationClient {
    public database: Database;
    public migrationCollection: DocumentCollection;
    constructor(config: IMigrationClient) {
        const { uri, databaseName, tls, host, port, username, password, migrationCollectionName } = config;
        const collectionName = migrationCollectionName || 'database__migration'
        const protocol = tls ? 'https' : 'http'
        const url: string = uri ? uri : `${protocol}://${host}:${port}`
        this.database = new Database({
            url,
            databaseName,
            auth: { username, password },
        });
        this.migrationCollection = this.database.collection(collectionName);
    }

    /**
     * Changing the Database Dynamically.
     */
    changeDb = (databaseName: string) => {
        this.database.useDatabase(databaseName);
    }

    collectionExist = async (): Promise<Boolean> => {
        const collectionExist = await this.migrationCollection.exists();
        collectionExist ? logger.info("State Collection Exists") : logger.info("State does not exist");
        return collectionExist;
    }

    listCollection = async (): Promise<Array<string>> => {
        const collectionMdList: CollectionMetadata[] = await this.database.listCollections();
        return collectionMdList.map((collectionMd) => collectionMd.name);
    }

    /**
     * Get or Create state Collection
     */
    stateCollection = async (): Promise<CollectionMetadata> => {
        if (await this.collectionExist()) {
            logger.info("Getting State Collection");
            return await this.migrationCollection.get();
        } else {
            logger.info("Creating State Collection");
            return await this.migrationCollection.create({ type: CollectionType.DOCUMENT_COLLECTION });
        }
    }

    /**
     * Read state from state collection, or return default initial state
     */
    readState = async (): Promise<Document> => {
        let state: IStateDocument
        if (await this.stateCollection()) {
            const stateList = await this.database.query(aql`
                FOR state IN ${this.migrationCollection}
                SORT state.migrationKey DESC
                RETURN state
            `);
            state = await stateList?.next();
            if (!state) {
                return null;
            }
        } else {
            state = { migrationKey: null }
        }
        return state.migrationKey;
    }

    /**
     * Write State
     */
    writeState = async (migrationKey: string, trx: Transaction) => {
        let state = {
            migrationKey
        }
        return await trx.step(() => this.migrationCollection.save(state));
    }
}