/* eslint-disable */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as utils from "./utils";
import * as plants from "./routes/plants";
import * as rooms from "./routes/rooms";

// initialize firebase to access firestore services
//admin.initializeApp(functions.config().firebase);

// initialize express server
const main = express();
const app = express();

// add path and middleware for handling CRUD requests
main.use("/api/v1", app);

app.use("/plants", plants.router);
app.use("/rooms", rooms.router);

// parse message body when request is handled
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: false}));

// get information about current user
// GET /users
app.get("/users/me", async (req: any, res) => {
  utils.logger.log("Fetching information for user ", req.user.uid);
  admin.auth().getUser(req.user.uid)
    .then((userRecord) => {
      utils.logger.log("Successfully fetched user data for user ", userRecord.uid);
      const respData = {
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        email: userRecord.email
      }
      res.status(200).json({
        status: 200,
        data: respData
      });
    })
    .catch((error) => {
      utils.logger.error("Error fetching user data: ", error);
      res.status(500).json({
        status: 500,
        data: null, 
        message: error
      });
    });
});

// creation function for API, assign express server to handle HTTPS requests
// makes CRUD API in app available at:
//  'https://<region>-<project-name>.cloudfunctions.net/webApi
export const webApi = functions.https.onRequest(main);
