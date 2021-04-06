/* eslint-disable */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// initialize firebase to access firestore services
admin.initializeApp(functions.config().firebase);

// initialize Firestore DB
export const db = admin.firestore();
export const plantCollection = "plants";
export const roomCollection = "rooms";
export const wateringCollection = "waterings";

export const logger = functions.logger;

// Express middleware function to validate Firebase ID tokens passed in
// Authorization HTTP header. Token must be passed as a Bearer token:
//   'Authorization: Bearer <Token>'
// If the user is authorized, then it will add the user information in req
// Actual endpoint handlers will then be able to see who the user is
export const validateFirebaseIdToken = async (req: any, res: any, next: any) => {
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

// function to check if the user is authorized to access the plant it is trying to delete/update
export const doesUserOwnPlant = async (req: any, res: any, next: any) => {
  const uid = req.user.uid;
  const plantId = req.params.plantId;

  // plantId is not a part of the HTTP request endpoint
  // this request is not trying to edit a plant's specific data (including waterings)
  if (plantId == undefined) {
    next();
    return;
  }

  try {
    // lookup the plant given its id
    const plant = await db.collection(plantCollection).doc(plantId).get();
    if (!plant.exists) {
      // doesn't exist, can just return
      next();
      return;
    }
    if (plant.get("uid") != uid) {
      logger.error("User " + uid + " does not own plant ", plantId);
      res.status(403).json({
        status: 403,
        data: null,
        message: "Forbidden"
      });
    }
  } catch (error) {
    logger.error("Error while trying to verify user " + uid + " ownership of plant " + plantId);
    logger.error(error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    })
  }
};