Migrado
=======

[![Node package](https://badge.fury.io/js/migrado.svg)](https://www.npmjs.com/package/migrado)
[![Build status](https://travis-ci.org/iraycd/migrado.svg?branch=master)](https://travis-ci.org/iraycd/migrado)

🥑 ArangoDB migrations and batch processing manager.

migrado is a command-line client that can help build and run schema or data migrations against your ArangoDB instance.

migrado utilizes ArangoDB Transactions when running data migrations to ensure failed scripts are rolled back automatically. arangosh from the [ArangoDB Client Tools](https://www.arangodb.com/download-major/) is required to run schema migrations, however no transaction safety is available at this point.

**migrado should be considered alpha software.** Make sure you test well before using in a production setting.

If you have trouble, open an issue. Contributions are welcome.

## Features List

- [x] feat: Basic Migration with Tests
- [ ] fix: Readable code.
- [ ] fix: Testing more with transaction and failing.
- [ ] feat: Command Line for Migration
- [ ] feat: Multiple Database with tests.
- [ ] feat: Testing with multi-tenancy example.
- [ ] feat: Backup db before migrations.

Installation
------------

migrado requires Node.js 12 or higher.

```bash
$ yarn add migrado
```
or 

```bash
$ npm install -s migrado
```


### Data migrations

You need to declare all collections subject to write operations using the syntax `// write collection_name`, because ArangoDB needs this information for locking during transactions. We've made the declaration explicit to reduce errors. _Attempting to write to collections not declared in this way will cause the migration to fail._

In general, a reverse migration should do the logical opposite of a forward migration. `forward()` and `reverse()` functions can contain anything that the ArangoDB V8 engine understands, but must be fully self-contained. _Anything outside these functions is ignored and unavailable when running migrations._

Here's an example migration script for adding `new_field` in collection `things`:

```javascript
// write things

function forward(db) {
    var db = require("@arangodb").db
    db.query(`
        FOR thing IN things
            UPDATE thing WITH { new_field: "some value" } IN things
    `)
}

function reverse(db) {
    db.query(`
        FOR thing IN things
            REPLACE thing WITH UNSET(thing, "new_field") IN things
    `)
}
```

[More Examples](/migrado/__spec__/migrations)

Please make sure you read [limitations when running transactions](https://www.arangodb.com/docs/stable/transactions-limitations.html) in the ArangoDB documentation. In particular, _creation and deletion of databases, collections, and indexes_ is not allowed in transactions.

### Schema migrations

Schema migrations are stuctured in the same way as data migrations, but are run against `arangosh` as opposed to the HTTP API. There is no transaction safety when running schema migrations.

Schema migrations are structured the same way as data migrations, but `// write` declarations are not required. All operations are allowed.

Here's an example migration script generated from the YAML schema above:

```javascript
function forward(db) {
    db._createDocumentCollection("books")
    db._createDocumentCollection("authors")
    db._createEdgeCollection("author_of")
}

function reverse(db) {
    db._drop("books")
    db._drop("authors")
    db._drop("author_of")
}
```

Please be careful when running schema migrations in reverse. As you can see, the `reverse()` function above would drop your collections if you were to reverse beyond this point. Currently, you will not be able to do so for an initial migration.

References
----------
+ [Multitenancy in Laravel: Migrations, Testing, and switching tenants](https://www.youtube.com/watch?v=592EgykFOz4)

Influenced From
---------------

- Django ORM - Python
- [Umzug](https://www.npmjs.com/package/umzug)
- [Migrado - Python](https://github.com/protojour/migrado)