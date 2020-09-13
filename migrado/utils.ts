import * as klawSync from "klaw-sync";
import { Logger } from "tslog";
import * as fs from "fs-extra";

export const ensureDir = async (directory: string): Promise<boolean> => {
  let exists = await fs.pathExists(directory);
  if (!exists) {
    await fs.ensureDir(directory);
    exists = await fs.pathExists(directory);
  }
  return exists;
};

export const logger: Logger = new Logger({ name: "Migrado" });

export interface FilePathObject {
  [field: string]: string;
}

export const directoryFileSort = async (
  directory: string
): Promise<FilePathObject> => {
  // const files = await klaw(directory);
  return new Promise((resolve, reject) => {
    const files: any = {};
    const items: any = klawSync(directory, { nodir: true });
    if (items) {
      items.map((item: any) => {
        const key = item.path.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, "");
        const path = item.path;
        files[key] = path;
      });
      resolve(files);
    } else {
      reject("No files");
    }
  });
};

export const sortKeys = (unordered: FilePathObject): FilePathObject => {
  const ordered: any = {};
  Object.keys(unordered)
    .sort()
    .forEach(function (key) {
      ordered[key] = unordered[key];
    });
  return ordered;
};

export const checkMigrations = (migrations: string[]) => {
  if (migrations?.length > 0) {
    logger.info("No migrations found");
  }
};

export const checkDb = (db: string) => {
  if (!db) {
    logger.info("No migrations found");
  }
};

export enum MIGRATION_DIRECTION {
  FORWARD = "FORWARD",
  REVERSE = "REVERSE",
}

export interface SelectedMigrationResponse {
  direction: MIGRATION_DIRECTION | null;
  selected: string[];
}

export const selectMigrations = (
  current: string,
  target: string,
  migrations: string[]
): SelectedMigrationResponse => {
  if (target > current) {
    return {
      direction: MIGRATION_DIRECTION.FORWARD,
      selected: migrations.filter(
        (migrationPath) => current < migrationPath && migrationPath <= target
      ),
    };
  }
  if (target < current) {
    return {
      direction: MIGRATION_DIRECTION.REVERSE,
      selected: migrations
        .reverse()
        .filter(
          (migrationPath) => target < migrationPath && migrationPath <= current
        ),
    };
  }
  return {
    direction: null,
    selected: [],
  };
};
