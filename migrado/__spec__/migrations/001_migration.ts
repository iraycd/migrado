import { Database, aql } from "arangojs";
import { Transaction } from "arangojs/transaction";

module.exports = {
    forward: async (db: Database, _trx: Transaction) => {
        const userList: any = await db.query(aql`
            FOR user IN users
            RETURN user
        `);
        for await (const user of userList) {
            const name = user.fullName.split(" ");
            const query = aql`
                FOR user IN users
                UPDATE ${user._key} WITH { name: ${name} } IN users
            `
            await db.query(query);
        }
        // add your forward migration here
    }, reverse: async (db: Database, _trx: Transaction) => {
        await db.query(`
            FOR user IN users
                REPLACE user WITH UNSET(user, "name") IN users
        `)
        // add your reverse migration here
    }
}