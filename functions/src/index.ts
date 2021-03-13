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
const db = admin.firestore();
const plantCollection = "plants";
const roomCollection = "rooms";

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
    res.status(401).json({
      status: 401,
      data: null,
      message: "Unauthorized"
    });
    return;
  }

  // validate the token passed in and see if it corresponds to an actual user
  logger.log("Found 'Authorization' header: ", req.headers.authorization);
  let idToken = req.headers.authorization.split("Bearer ")[1];

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    logger.log("ID token correctly decoded: ", decodedIdToken);
    // make user information available in the request to identify who is making the request
    req.user = decodedIdToken;
    next();
  } catch (error) {
    logger.error("Error while verifying Firebase ID token: ", error);
    res.status(401).json({
      status: 401,
      data: null,
      message: "Unauthorized"
    });
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
      res.status(200).json({
        status: 200,
        data: respData
      });
    })
    .catch((error) => {
      logger.error("Error fetching user data: ", error);
      res.status(500).json({
        status: 500,
        data: null, 
        message: error
      });
    });
});

// makes sure that each property is present in the request body
const validatePlantRequestBody = (req: any) => {
  if (req.body["name"] == undefined || req.body["waterAt"] == undefined || 
      req.body["treflePlantId"] == undefined) {
    return false;
  }
  return true;
}

// creates a new Plant object in the collection
app.post("/plants", async (req: any, res) => {
  const uid = req.user.uid;
  logger.log("Adding new plant for user ", uid);

  // parse request body
  if (!validatePlantRequestBody(req)) {
    logger.error("Unable to parse request body, one or properties improperly formatted");
    res.status(400).json({
      status: 400,
      data: null,
      message: "Unable to parse request body, one or properties improperly formatted"
    });
    return;
  }

  const newPlant: Plant = {
    uid: req.user.uid,  // new plant belongs to user making the request
    name: req.body["name"],
    waterAt: req.body["waterAt"],
    treflePlantId: req.body["treflePlantId"]
  }

  try {
    // check if the user already has the plant
    // plant names for a particular user must be unique
    const plantsQuerySnapshot = await db.collection(plantCollection)
      .where("uid", "==", uid).where("name", "==", req.body["name"]).get();
    if (!plantsQuerySnapshot.empty) {
      logger.error("Plant " + req.body["name"] + " already exists for user ", uid);
      res.status(409).json({
        status: 409,
        data: null,
        message: "Duplicate entry"
      });
      return;
    }

    // use await to suspend execution until add() completes
    const newDoc = await db.collection(plantCollection).add(newPlant);
    logger.log("Successfully created new plant ", newDoc.id);
    res.status(201).json({
      status: 201,
      data: {
        id: newDoc.id
      }
    });
  } catch (error) {
    // server error trying to write to Firestore
    logger.error("Unable to create new plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// fetch the requesting user's plants
app.get("/plants", async (req: any, res) => {
  const uid = req.user.uid;
  logger.log("Fetching plants for user ", uid);
  try {
    // query plant collections by uid
    const plantsQuerySnapshot = await db.collection(plantCollection)
      .where("uid", "==", uid).get();
    
    const plants: any[] = [];
    let numPlants = 0;
    plantsQuerySnapshot.forEach(
      (doc) => {
        numPlants++;
        plants.push({
          id: doc.id,
          data: doc.data()
        });
      }
    );

    logger.log("Successfully fetched " + numPlants + " plants for user ", uid);
    res.status(200).json({
      status: 200,
      data: plants
    });
  } catch (error) {
    logger.error("Unable to fetch plants for user ", uid);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// deletes a specific plant given its ID
app.delete("/plants/:plantId", async (req: any, res) => {
  const uid = req.user.uid;
  const plantId = req.params.plantId;
  logger.log("Received request to delete plant ", plantId);

  try {
    // check to see if requesting user owns the plant 
    const plant = await db.collection(plantCollection).doc(plantId).get();
    if (!plant.exists) {
      logger.log("Plant " + plantId + " no longer exists");
      res.status(204).json({
        status: 204,
        data: null
      });
    } else {
      if (plant.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        logger.error("User " + uid + " does not have delete permission for plant ", plantId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the deletion
        await db.collection(plantCollection).doc(plantId).delete();
        logger.log("Successfully deleted plant ", plantId);
        res.status(204).json({
          status: 204,
          data: null
        });
      }
    }
  } catch (error) {
    logger.error("Unable to delete plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// updates information for a specific plant
app.put("/plants/:plantId", async (req: any, res) => {
  const uid = req.user.uid;
  const plantId = req.params.plantId;
  logger.log("Received request to update plant ", plantId);

  // parse request body
  if (!validatePlantRequestBody(req)) {
    logger.error("Unable to parse request body, one or properties improperly formatted: ", req.body);
    res.status(400).json({
      status: 400,
      data: null,
      message: "Unable to parse request body, one or properties improperly formatted: " + req.body
    });
    return;
  }

  const plantReq: Plant = {
    uid: req.user.uid,  // new plant belongs to user making the request
    name: req.body["name"],
    waterAt: req.body["waterAt"],
    treflePlantId: req.body["treflePlantId"]
  }

  try {
    // check to see if requesting user owns the plant 
    const plant = await db.collection(plantCollection).doc(plantId).get();
    if (!plant.exists) {
      // plant does not exist - return 404
      // do not create the resource since we rely on Firebase for generating IDs
      logger.error("Plant " + plantId + " does not exist");
      res.status(404).json({
        status: 404,
        data: null,
        message: "Plant with id " + plantId + " does not exist"
      });
    } else {
      if (plant.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        logger.error("User " + uid + " does not have update permission for plant ", plantId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the update
        await db.collection(plantCollection).doc(plantId).set(plantReq, {merge: true});
        logger.log("Successfully updated plant ", plantId);
        res.status(200).json({
          status: 200,
          data: {
            id: plantId
          }
        });
      }
    }
  } catch (error) {
    logger.error("Unable to update plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

/* Rooms API */
app.post("/rooms", async (req: any, res) => {
  const uid = req.user.uid;
  logger.log("Adding new room for user ", uid);

  // parse request body
  if (req.body["name"] == undefined) {
    logger.error("Unable to parse request body, one or properties improperly formatted");
    res.status(400).json({
      status: 400,
      data: null,
      message: "Unable to parse request body, one or properties improperly formatted"
    });
    return;
  }

  const newRoom: Room = {
    uid: req.user.uid,  // new room belongs to user making the request
    name: req.body["name"],
    createdAt: new Date().toLocaleString()
  }

  try {
    // check if the user already has the room
    // room names for a particular user must be unique
    const roomsQuerySnapshot = await db.collection(roomCollection)
      .where("uid", "==", uid).where("name", "==", req.body["name"]).get();
    if (!roomsQuerySnapshot.empty) {
      logger.error("Room " + req.body["name"] + " already exists for user ", uid);
      res.status(409).json({
        status: 409,
        data: null,
        message: "Duplicate entry"
      });
      return;
    }

    // use await to suspend execution until add() completes
    const newDoc = await db.collection(roomCollection).add(newRoom);
    logger.log("Successfully created new room ", newDoc.id);
    res.status(201).json({
      status: 201,
      data: {
        id: newDoc.id
      }
    });
  } catch (error) {
    // server error trying to write to Firestore
    logger.error("Unable to create new plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// creation function for API, assign express server to handle HTTPS requests
// makes CRUD API in app available at:
//  'https://<region>-<project-name>.cloudfunctions.net/webApi
export const webApi = functions.https.onRequest(main);
