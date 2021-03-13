/* eslint-disable */

/* Contains definitions for data models to be written to DB */

// Plant collection model
interface Plant {
  uid: String,           // uid of plant's owner
  name: String,          // custom, user-defined name for the plant
  waterAt: Date,         // time of day to water the plant
  treflePlantId: Number  // ID for plant data in Trefle API
}

// Rooms collection model
interface Room {
  uid: String,           // uid of room's owner
  name: String,          // custom, user-defined name for the plant
  createdAt: String      // timestamp for when the room was created
}