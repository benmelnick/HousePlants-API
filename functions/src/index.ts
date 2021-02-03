import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as uuid from "uuid";

// initialize firebase to access firestore services
admin.initializeApp(functions.config().firebase);

// initialize express server
const app = express();
const main = express();

// add path and middleware for handling requests
main.use("/api/v1", app);

// parse message body when request is handled
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: false}));

// initialize DB and name of user collection in firestore
const db = admin.firestore();
const userCollection = "users";

const logger = functions.logger;

// define function name, assign express server to handle HTTPS requests
export const webApi = functions.https.onRequest(main);

// users collection model
interface User {
  firstName: String,
  lastName:String,
  email: String,
  id: String
}

// create new user
// POST /users
app.post("/users", async (req, res) => {
  try {
    const user: User = {
      firstName: req.body["firstName"],
      lastName: req.body["lastName"],
      email: req.body["email"],
      id: uuid.v4(),
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send("Created a new user: " + newDoc.id);
  } catch (error) {
    logger.log("POST /users " + error);
    res.status(400).send("User should cointain firstName, lastName, email.");
  }
});

// get all users
// GET /users
app.get("/users", async (req, res) => {
  try {
    const userQuerySnapshot = await db.collection(userCollection).get();
    const users: any[] = [];
    userQuerySnapshot.forEach(
        (doc) => {
          users.push({
            id: doc.id,
            data: doc.data(),
          });
        }
    );
    res.status(200).json(users);
  } catch (error) {
    logger.log("GET /users " + error);
    res.status(500).send(error);
  }
});
