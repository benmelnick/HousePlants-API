/* eslint-disable */

import * as express from "express";
import * as utils from "../utils"

// middleware router
export const router = express.Router();

// all requests to endpoints in main server must pass token check
// thus all HTTPS endpoints can only be accessed by Firebase users
router.use(utils.validateFirebaseIdToken);

router.post("/", async (req: any, res) => {
  const uid = req.user.uid;
  utils.logger.log("Adding new room for user ", uid);

  // parse request body
  if (req.body["name"] == undefined) {
    utils.logger.error("Unable to parse request body, one or properties improperly formatted");
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
    updatedAt: new Date().toISOString()
  }

  try {
    // check if the user already has the room
    // room names for a particular user must be unique
    const roomsQuerySnapshot = await utils.db.collection(utils.roomCollection)
      .where("uid", "==", uid).where("name", "==", req.body["name"]).get();
    if (!roomsQuerySnapshot.empty) {
      utils.logger.error("Room " + req.body["name"] + " already exists for user ", uid);
      res.status(409).json({
        status: 409,
        data: null,
        message: "Duplicate entry"
      });
      return;
    }

    // use await to suspend execution until add() completes
    const newDoc = await utils.db.collection(utils.roomCollection).add(newRoom);
    utils.logger.log("Successfully created new room ", newDoc.id);
    res.status(201).json({
      status: 201,
      data: {
        id: newDoc.id
      }
    });
  } catch (error) {
    // server error trying to write to Firestore
    utils.logger.error("Unable to create new room: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// fetch the requesting user's rooms
router.get("/", async (req: any, res) => {
  const uid = req.user.uid;
  utils.logger.log("Fetching rooms for user ", uid);
  try {
    // query plant collections by uid
    const roomsQuerySnapshot = await utils.db.collection(utils.roomCollection)
      .where("uid", "==", uid).get();
    
    const rooms: any[] = [];
    let numRooms = 0;
    roomsQuerySnapshot.forEach(
      (doc) => {
        numRooms++;
        rooms.push({
          id: doc.id,
          data: doc.data()
        });
      }
    );

    utils.logger.log("Successfully fetched " + numRooms + " rooms for user ", uid);
    res.status(200).json({
      status: 200,
      data: rooms
    });
  } catch (error) {
    utils.logger.error("Unable to fetch rooms for user ", uid);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// deletes a specific room given its ID
router.delete("/:roomId", async (req: any, res) => {
  const uid = req.user.uid;
  const roomId = req.params.roomId;
  utils.logger.log("Received request to delete room ", roomId);

  try {
    // check to see if requesting user owns the plant 
    const room = await utils.db.collection(utils.roomCollection).doc(roomId).get();
    if (!room.exists) {
      utils.logger.log("Room " + roomId + " no longer exists");
      res.status(204).json({
        status: 204,
        data: null
      });
    } else {
      if (room.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        utils.logger.error("User " + uid + " does not have delete permission for room ", roomId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the deletion
        await utils.db.collection(utils.roomCollection).doc(roomId).delete();
        utils.logger.log("Successfully deleted room ", roomId);
        res.status(204).json({
          status: 204,
          data: null
        });
      }
    }
  } catch (error) {
    utils.logger.error("Unable to delete room: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});

// updates information for a specific plant
router.put("/:roomId", async (req: any, res) => {
  const uid = req.user.uid;
  const roomId = req.params.roomId;
  utils.logger.log("Received request to update room ", roomId);

  // parse request body
  if (req.body["name"] == undefined) {
    utils.logger.error("Unable to parse request body, one or properties improperly formatted: ", req.body);
    res.status(400).json({
      status: 400,
      data: null,
      message: "Unable to parse request body, one or properties improperly formatted: " + req.body
    });
    return;
  }

  const roomReq: Room = {
    uid: req.user.uid,  // new plant belongs to user making the request
    name: req.body["name"],
    updatedAt: new Date().toISOString()
  }

  try {
    // check to see if requesting user owns the plant 
    const room = await utils.db.collection(utils.roomCollection).doc(roomId).get();
    if (!room.exists) {
      // plant does not exist - return 404
      // do not create the resource since we rely on Firebase for generating IDs
      utils.logger.error("Room " + roomId + " does not exist");
      res.status(404).json({
        status: 404,
        data: null,
        message: "Room with id " + roomId + " does not exist"
      });
    } else {
      if (room.get("uid") != uid) {
        // this plant does not belong to user who tried to delete it
        utils.logger.error("User " + uid + " does not have update permission for room ", roomId);
        res.status(403).json({
          status: 403,
          data: null,
          message: "Forbidden"
        });
      } else {
        // perform the update
        await utils.db.collection(utils.roomCollection).doc(roomId).set(roomReq, {merge: true});
        utils.logger.log("Successfully updated room ", roomId);
        res.status(200).json({
          status: 200,
          data: {
            id: roomId
          }
        });
      }
    }
  } catch (error) {
    utils.logger.error("Unable to update room: ", error);
    res.status(500).json({
      status: 500,
      data: null,
      message: error
    });
  }
});
