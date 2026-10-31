const app = require("./app");
const { PORT } = require("./config/env");
const { connectWithRetry } = require("./config/db");

app.listen(PORT, () => {
  console.log(`Placement tracker running at http://localhost:${PORT}`);
  connectWithRetry();
});
