import {
  ensureDir,
  directoryFileSort,
  selectMigrations,
  MIGRATION_DIRECTION,
} from "../utils";
import * as fs from "fs";

describe("Test Ensure Path", () => {
  const PATH = "/tmp/migrado";

  afterAll(() => {
    fs.rmdirSync(PATH, { recursive: true });
  });

  it("Path does not exist", async () => {
    const stats = fs.existsSync(PATH);
    expect(stats).toBeFalsy();
  });

  describe("WHEN ensureDir is called", () => {
    it("SHOULD creates a directory if exists", async () => {
      const directory = await ensureDir(PATH);
      expect(directory).toBeTruthy();
      const sameDir = await ensureDir(PATH);
      expect(sameDir).toBeTruthy();
      const stats = fs.existsSync(PATH);
      expect(stats).toBeTruthy();
    });
  });
});

describe("Test Find Files", () => {
  it("directoryFileSort", async () => {
    const files: any = await directoryFileSort(__dirname + "/migrations/");
    expect(files).toEqual(
      expect.objectContaining({
        "000_spec": expect.stringMatching("000_spec.js"),
        "001_migration": expect.stringMatching("001_migration.ts"),
        "002_not_good_migration": expect.stringMatching(
          "002_not_good_migration.js"
        ),
      })
    );
  });
});

describe("Test Select Migration", () => {
  const migrations = ["0001", "0002", "0003"];
  describe("When testing forward", () => {
    it("SHOULD 0000 -> 0003 ", () => {
      const { direction, selected } = selectMigrations(
        "0000",
        "0003",
        migrations
      );
      expect(direction).toBe(MIGRATION_DIRECTION.FORWARD);
      expect(selected).toEqual(["0001", "0002", "0003"]);
    });
    it("SHOULD 0001 -> 0003 ", () => {
      const { direction, selected } = selectMigrations(
        "0001",
        "0003",
        migrations
      );
      expect(direction).toBe(MIGRATION_DIRECTION.FORWARD);
      expect(selected).toEqual(["0002", "0003"]);
    });
  });
  describe("When testing reverse", () => {
    it("SHOULD 0003 -> 0001 ", () => {
      const { direction, selected } = selectMigrations(
        "0003",
        "0001",
        migrations
      );
      expect(direction).toBe(MIGRATION_DIRECTION.REVERSE);
      expect(selected).toEqual(["0003", "0002"]);
    });
    it("SHOULD 0001 -> 0003 ", () => {
      const { direction, selected } = selectMigrations(
        "0002",
        "0001",
        migrations
      );
      expect(direction).toBe(MIGRATION_DIRECTION.REVERSE);
      expect(selected).toEqual(["0002"]);
    });
  });
  describe("WHEN for current and target are same", () => {
    it("SHOULD 0003 -> 0003 ", () => {
      const { direction, selected } = selectMigrations(
        "0003",
        "0003",
        migrations
      );
      expect(direction).toBe(null);
      expect(selected).toEqual([]);
    });
  });
});
