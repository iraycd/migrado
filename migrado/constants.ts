const MIGRATION_TEMPLATE = `
module.exports = {
    forward: async (db, trx) => {
        // add your forward migration here
    }, reverse: async (db, trx) => {
        // add your reverse migration here
    }
}
`;
