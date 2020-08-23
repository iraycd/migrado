import { Database, CollectionType, aql } from 'arangojs';
import { DocumentCollection, CollectionMetadata } from 'arangojs/collection';
import { Document } from 'arangojs/documents';
import { Transaction } from 'arangojs/transaction';

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
    migrationPath: string | null;
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
            return await this.migrationCollection.get();
        } else {
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
                SORT state.migrationPath DESC
                RETURN state
            `);
            state = await stateList?.next();
            if (!state) {
                return null;
            }
        } else {
            state = { migrationPath: null }
        }
        return state.migrationPath;
    }

    /**
     * Write State
     */
    writeState = async (migrationPath: string, trx: Transaction) => {
        let state = {
            migrationPath
        }
        return await trx.step(() => this.migrationCollection.save(state));
    }
}