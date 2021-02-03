/* eslint-disable */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as bodyParser from "body-parser";

// initialize firebase to access firestore services
admin.initializeApp(functions.config().firebase);

// initialize express server
const app = express();
const main = express();

// initialize Firestore DB
// const db = admin.firestore();

const logger = functions.logger;

// add path and middleware for handling CRUD requests
main.use("/api/v1", app);

// parse message body when request is handled
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: false}));

// Express middleware function to validate Firebase ID tokens passed in
// Authorization HTTP header. Token must be passed as a Bearer token:
//   'Authorization: Bearer <Token>'
const validateFirebaseIdToken = async (req: any, res: any, next: any) => {
  logger.log("Checking if request is authorized with Firebase ID token");

  // check to see if header contains 'Authorization' field
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    logger.error("No Firebase ID token was passed as a Bearer token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "Authorization: Bearer <Firebase ID Token>");
    res.status(403).send("Unauthorized");
    return;
  }

  // validate the token passed in and see if it corresponds to an actual user
  logger.log("Found 'Authorization' header");
  let idToken = req.headers.authorization.split("Bearer ")[1];

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    logger.log("ID token correctly decoded: ", decodedIdToken);
    // make user information available in the request to identify who is making the request
    req.user = decodedIdToken;
    next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token: ", error);
    res.status(403).send("Unauthorized");
  }
};

// all requests to endpoints in main server must pass token check
// thus all HTTPS endpoints can only be accessed by Firebase users
app.use(validateFirebaseIdToken);

// get information about current user
// GET /users
app.get("/users/me", async (req: any, res) => {
  logger.log("Fetching information for user ", req.user.uid);
  admin.auth().getUser(req.user.uid)
    .then((userRecord) => {
      logger.log("Successfully fetched user data for user ", userRecord.uid);
      const respData = {
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        email: userRecord.email
      }
      res.status(200).json(respData);
    })
    .catch((error) => {
      logger.error("Error fetching user data: ", error);
      res.status(500).send(error);
    });
});

// creation function for API, assign express server to handle HTTPS requests
// makes CRUD API in app available at:
//  'https://<region>-house-plants-api.cloudfunctions.net/webApi
export const webApi = functions.https.onRequest(main);
