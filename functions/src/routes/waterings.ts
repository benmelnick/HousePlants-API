/* eslint-disable */

/*
 * Waterings API
 * each plant has a list of times it was watered - that is,
 *   each plant has a document in the 'waterings' collection
 * each route is a part of the /plants API route
 * 'waterings' Firestore collection has following schema:
 *    plantId: the ID of a record in the 'plants' collection
 *    waterings: an array of watering records
 */

import * as express from "express";
import * as utils from "../utils";
import * as admin from "firebase-admin";
import * as uuid from "uuid";

// middleware router
export const router = express.Router();

// all requests to endpoints in main server must pass token check
// thus all HTTPS endpoints can only be accessed by Firebase users
router.use(utils.validateFirebaseIdToken);
router.use(utils.doesUserOwnPlant);

const validateWateringRequestBody = (req: any) => {
  if (req.body["wateredAt"] == undefined || req.body["health"] == undefined) {
    return false;
  }
  return true;
}

router.post("/:plantId/waterings", async (req: any, res) => {
  const plantId = req.params.plantId;
  utils.logger.log("Adding new watering for plant ", plantId);

  // parse request body
  if (!validateWateringRequestBody(req)) {
    utils.logger.error("Unable to parse request body, one or more properties missing");
    res.status(400).json({
      status: 400,
      data: null,
      message: "Unable to parse request body"
    });
    return;
  }

  const newWatering: Watering = {
    id: uuid.v4(),
    wateredAt: req.body["wateredAt"],
    health: req.body["health"]
  }

  try {
    // find this plant's corresponding doc in the 'waterings' firestore collection
    const queryRes = await utils.db.collection(utils.wateringCollection)
      .where("plantId", "==", plantId).get();
    let docId = "";  
    if (queryRes.empty) {
      // if this plant does not have a record in 'waterings', create one
      // needed to onboard plants in the collection that were added before this API
      utils.logger.info("No watering history set up for plant " + plantId + ", creating entry in 'waterings' collection");
      const newDoc = await utils.db.collection(utils.wateringCollection).add({
        plantId: plantId,
        waterings: []
      });
      docId = newDoc.id;
    } else {
      docId = queryRes.docs[0].id;
    }

    // add to the waterings array in firestore
    const wateringsDoc = utils.db.collection(utils.wateringCollection).doc(docId);
    wateringsDoc.update({
      waterings: admin.firestore.FieldValue.arrayUnion(newWatering)
    });
    utils.logger.log("Successfully added new watering " + newWatering.id + " to plant " + plantId);
    res.status(201).json({
      status: 201,
      data: {
        id: newWatering.id
      }
    });
  } catch (error) {
    utils.logger.error("Error adding new watering: ", error);
    res.status(500).json({
      status: 500,
      data: null, 
      message: error
    });
  }
});

router.get("/:plantId/waterings", async (req: any, res) => {
  let plantId = req.params.plantId;
  utils.logger.log("Fetching waterings for plant ", plantId);

  try {
    // find this plant's corresponding doc in the 'waterings' firestore collection
    const queryRes = await utils.db.collection(utils.wateringCollection)
      .where("plantId", "==", plantId).get();
    let docId = "";  
    if (queryRes.empty) {
      // if this plant does not have a record in 'waterings', create one
      // needed to onboard plants in the collection that were added before this API
      utils.logger.info("No watering history set up for plant " + plantId + ", creating entry in 'waterings' collection");
      const newDoc = await utils.db.collection(utils.wateringCollection).add({
        plantId: plantId,
        waterings: []
      });
      docId = newDoc.id;
    } else {
      // use the first result - should only be 1
      // todo: verify size of results
      docId = queryRes.docs[0].id;  
    }

    const wateringsDoc = await utils.db.collection(utils.wateringCollection).doc(docId).get();
    const waterings: Watering[] = wateringsDoc.get("waterings");

    utils.logger.log("Fetched " + waterings.length + " waterings for plant " + plantId);
    res.status(200).json({
      status: 200,
      data: waterings
    });
  } catch (error) {
    utils.logger.error("Error adding new watering: ", error);
    res.status(500).json({
      status: 500,
      data: null, 
      message: error
    });
  }
});

router.delete("/:plantId/waterings/:wateringId", async (req: any, res) => {
  let plantId = req.params.plantId;
  let wateringId = req.params.wateringId;

  utils.logger.log("Deleting watering " + wateringId + " for plant " + plantId);

  try {
    // find this plant's corresponding doc in the collection
    const queryRes = await utils.db.collection(utils.wateringCollection)
      .where("plantId", "==", plantId).get();
    if (queryRes.empty) {
      utils.logger.info("No watering history set up for plant " + plantId + ", creating entry in 'waterings' collection");
      await utils.db.collection(utils.wateringCollection).add({
        plantId: plantId,
        waterings: []
      });
    } else {
      // search for the watering with the given ID
      let docId = queryRes.docs[0].id;
      let toDelete: Watering | undefined = undefined;

      const wateringsDoc = utils.db.collection(utils.wateringCollection).doc(docId);
      const docData = await wateringsDoc.get();
      const waterings: Watering[] = docData.get("waterings");

      let found = false;
      waterings.forEach((watering => {
        if (watering.id == wateringId) {
          found = true;
          toDelete = watering;
        }
      }));

      if (found) {
        wateringsDoc.update({
          waterings: admin.firestore.FieldValue.arrayRemove(toDelete)
        });
      }
    }

    // send a 204 response regardless of if the watering existed or not
    res.status(204).json({
      status: 204,
      data: null
    });
  } catch (error) {
    utils.logger.error("Error deleting watering: ", error);
    res.status(500).json({
      status: 500,
      data: null, 
      message: error
    });
  }
});

router.put("/:plantId/waterings/:wateringId", async (req: any, res) => {
  let plantId = req.params.plantId;
  let wateringId = req.params.wateringId;

  utils.logger.log("Updating watering " + wateringId + " for plant " + plantId);

  try {
    // find this plant's corresponding doc in the collection
    const queryRes = await utils.db.collection(utils.wateringCollection)
      .where("plantId", "==", plantId).get();
    if (queryRes.empty) {
      utils.logger.info("No watering history set up for plant " + plantId + ", creating entry in 'waterings' collection");
      await utils.db.collection(utils.wateringCollection).add({
        plantId: plantId,
        waterings: []
      });

      // send a 404 since no waterings existed
      res.status(404).json({
        status: 404,
        data: null,
        message: "Watering " + wateringId + " does not exist for plant " + plantId
      });
    } else {
      // search for the watering with the given ID
      let docId = queryRes.docs[0].id;

      const wateringsDoc = utils.db.collection(utils.wateringCollection).doc(docId);
      const docData = await wateringsDoc.get();
      const currWaterings: Watering[] = docData.get("waterings");

      // firebase does not have option of editing an existing element in array, only atomic add and remove
      // as a workaround, we copy the array from the document, edit the individual element in the array, and write it back to db 

      let found = false;
      currWaterings.forEach((watering => {
        if (watering.id == wateringId) {
          found = true;
          // perform the update in the local copy of the array
          if (req.body["wateredAt"] != undefined) {
            watering.wateredAt = req.body["wateredAt"];
          }
          if (req.body["health"] != undefined) {
            watering.health = req.body["health"];
          }
        }
      }));

      if (found) {
        // write the updated array to the plant's firestore collection
        wateringsDoc.update({
          waterings: currWaterings
        });
        utils.logger.log("Successfully updated watering " + wateringId);
        res.status(200).json({
          status: 200,
          data: {
            id: wateringId
          }
        });
      } else {
        // watering does not exist - send 404
        res.status(404).json({
          status: 404,
          data: null,
          message: "Watering " + wateringId + " does not exist for plant " + plantId
        });
      }
    }
  } catch (error) {
    utils.logger.error("Error updating watering: ", error);
    res.status(500).json({
      status: 500,
      data: null, 
      message: error
    });
  }
});