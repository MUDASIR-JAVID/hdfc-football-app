const sql = require("mssql");

let poolPromise;
function getPool() {
  if (!process.env.AZURE_SQL_CONNECTION_STRING) throw new Error("AZURE_SQL_CONNECTION_STRING is not configured");
  if (!poolPromise) {
    poolPromise = sql.connect(process.env.AZURE_SQL_CONNECTION_STRING).catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}
async function query(text, inputs = {}) {
  const request = (await getPool()).request();
  for (const [name, value] of Object.entries(inputs)) request.input(name, value);
  return request.query(text);
}
module.exports = { sql, query };
