/* eslint-disable */

/* Contains definitions for data models to be written to DB */

// Plant collection model
interface Plant {
  uid: String,                // uid of plant's owner
  name: String,               // custom, user-defined name for the plant
  waterAt: Date,              // time of day to water the plant
  roomId: String,             // ID of the room the plant belongs to
  treflePlantId: Number       // ID for plant data in Trefle API,
  hasConnectedDevice: Boolean // indicates if a plant has an IoT device connected
  // TODO: in the future, if a plant were to use multiple devices, we would need to store a list of device IDs
  updatedAt: String           // timestamp for when plant was most recently updated
}

// Rooms collection model
interface Room {
  uid: String,           // uid of room's owner
  roomIconId: Number,    // icon in the frontend
  name: String,          // custom, user-defined name for the plant
  updatedAt: String      // timestamp for when the room was most recently updated
}

// Waterings collection model
interface Watering {
  id: String,            // server generated ID for this watering instance
  wateredAt: String,     // timestamp of when plant was watered
  health: Number         // subjective rating of the plant's health
}