/* eslint-disable */

/* middleware for handling requests to plants API */
/* files in ./routes provide middleware for the main express() in index.ts */

import * as express from "express";
import * as utils from "../utils";
import * as waterings from "./waterings";

// the middleware to be added to main express app
// used to create moduler route handlers 
// router does not listen for requests on its own
export const router = express.Router();

// all requests to endpoints in main server must pass token check
// thus all HTTPS endpoints can only be accessed by Firebase users
router.use(utils.validateFirebaseIdToken);
router.use(waterings.router);

// makes sure that each property is present in the request body
const validatePlantRequestBody = (req: any) => {
  if (req.body["name"] == undefined || req.body["waterAt"] == undefined || 
      req.body["roomId"] == undefined || req.body["treflePlantId"] == undefined ||
      req.body["hasConnectedDevice"] == undefined) {
    return false;
  }
  return true;
}

// creates a new Plant object in the collection
router.post("/", async (req: any, res) => {
  const uid = req.user.uid;
  utils.logger.log("Adding new plant for user ", uid);

  // parse request body
  if (!validatePlantRequestBody(req)) {
    utils.logger.error("Unable to parse request body, one or properties improperly formatted");
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
    roomId: req.body["roomId"],
    treflePlantId: req.body["treflePlantId"],
    hasConnectedDevice: req.body["hasConnectedDevice"],
    updatedAt: new Date().toISOString()
  }

  try {
    // check if the user already has the plant
    // plant names for a particular user must be unique
    const plantsQuerySnapshot = await utils.db.collection(utils.plantCollection)
      .where("uid", "==", uid).where("name", "==", req.body["name"]).get();
    if (!plantsQuerySnapshot.empty) {
      utils.logger.error("Plant " + req.body["name"] + " already exists for user ", uid);
      res.status(409).json({
        status: 409,
        data: null,
        message: "Duplicate entry"
      });
      return;
    }

    // use await to suspend execution until add() completes
    const newDoc = await utils.db.collection(utils.plantCollection).add(newPlant);
    // also add a new entry in the waterings collection for this plant
    await utils.db.collection(utils.wateringCollection).add({
      plantId: newDoc.id,
      waterings: []
    });
    utils.logger.log("Successfully created new plant ", newDoc.id);
    res.status(201).json({
      status: 201,
      data: {
        id: newDoc.id
      }
    });
  } catch (error) {
    // server error trying to write to Firestore
    utils.logger.error("Unable to create new plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// fetch the requesting user's plants
router.get("/", async (req: any, res) => {
  const uid = req.user.uid;
  utils.logger.log("Fetching plants for user ", uid);
  try {
    // query plant collections by uid
    const plantsQuerySnapshot = await utils.db.collection(utils.plantCollection)
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

    utils.logger.log("Successfully fetched " + numPlants + " plants for user ", uid);
    res.status(200).json({
      status: 200,
      data: plants
    });
  } catch (error) {
    utils.logger.error("Unable to fetch plants for user ", uid);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// deletes a specific plant given its ID
router.delete("/:plantId", async (req: any, res) => {
  const uid = req.user.uid;
  const plantId = req.params.plantId;
  utils.logger.log("Received request to delete plant ", plantId);

  try {
    // check to see if requesting user owns the plant 
    const plant = await utils.db.collection(utils.plantCollection).doc(plantId).get();
    if (!plant.exists) {
      utils.logger.log("Plant " + plantId + " no longer exists");
      res.status(204).json({
        status: 204,
        data: null
      });
    } else {
      if (plant.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        utils.logger.error("User " + uid + " does not have delete permission for plant ", plantId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the deletion
        await utils.db.collection(utils.plantCollection).doc(plantId).delete();
        utils.logger.log("Successfully deleted plant ", plantId);
        res.status(204).json({
          status: 204,
          data: null
        });
      }
    }
  } catch (error) {
    utils.logger.error("Unable to delete plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// looks at each request body field that could be provided in a PUT /plants/plantId request
// if the field is present in the request body, adds it to the passed in object 'updates' to be used in a 
//   firestore update() operation
const collectPutValues = (req: any, updates: any) => {
  let newValue = false;
  if (req.body["name"] != undefined) {
    updates.name = req.body["name"];
    newValue = true;
  }
  if (req.body["waterAt"] != undefined) {
    updates.waterAt = req.body["waterAt"];
    newValue = true;
  }
  if (req.body["roomId"] != undefined) {
    updates.roomId = req.body["roomId"];
    newValue = true;
  } 
  if (req.body["treflePlantId"] != undefined) {
    updates.treflePlantId = req.body["treflePlantId"];
    newValue = true;
  }
  if (req.body["hasConnectedDevice"] != undefined) {
    updates.hasConnectedDevice = req.body["hasConnectedDevice"];
    newValue = true;
  }

  // update the "updatedAt" timestamp if any other value has been updated
  if (newValue) {
    updates.updatedAt = new Date().toISOString();
  }
}

// updates information for a specific plant
router.put("/:plantId", async (req: any, res) => {
  const uid = req.user.uid;
  const plantId = req.params.plantId;
  utils.logger.log("Received request to update plant ", plantId);

  try {
    // check to see if requesting user owns the plant 
    const plant = await utils.db.collection(utils.plantCollection).doc(plantId).get();
    if (!plant.exists) {
      // plant does not exist - return 404
      // do not create the resource since we rely on Firebase for generating IDs
      utils.logger.error("Plant " + plantId + " does not exist");
      res.status(404).json({
        status: 404,
        data: null,
        message: "Plant with id " + plantId + " does not exist"
      });
    } else {
      if (plant.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        utils.logger.error("User " + uid + " does not have update permission for plant ", plantId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the update
        let updates = {};
        collectPutValues(req, updates);

        const plantDoc = utils.db.collection(utils.plantCollection).doc(plantId);
        plantDoc.update(updates);
        utils.logger.log("Successfully updated plant ", plantId);
        res.status(200).json({
          status: 200,
          data: {
            id: plantId
          }
        });
      }
    }
  } catch (error) {
    utils.logger.error("Unable to update plant: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});
