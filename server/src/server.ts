import express from "express";
import cors from "cors";
import path from "path";

const app = express();

/**
 * Middleware configuration
 */

app.use(cors({}));

(async () => {
  try {
    /* Set a path between client and server */
    app.use(express.static(path.join(__dirname, "client/build")));

    app.get(/^\/(?!api).*/, (req, res) => {
      // Match all except /api routes
      res.sendFile(path.join(__dirname, "client/build/index.html"));
    });

    // Server configuration and middleware setup can be added here
    app.listen(5000, () => {
      console.log(`Server is running on port 5000`);
    });
  } catch (error) {
    console.error(`Error occurred while starting the server: ${error}`);
  }
})();
