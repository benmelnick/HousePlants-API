# Plants

## Data Model

Stored plant data contains the following fields:

| **Name**           | **Type**  | **Description**                                                                                                                                                                              |
| ------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name               | `String`  | A user-defined name to identify a plant in the user's collection                                                                                                                             |
| uid                | `String`  | Firebase generated user ID to identify the owner of the entity                                                                                                                               |
| waterAt            | `Date`    | Timestamp of when the plant needs to be watered                                                                                                                                              |
| roomId             | `String`  | ID of the room that the plant belongs to                                                                                                                                                     |
| treflePlantId      | `Number`  | Unique ID used to query Trefle to get biological information about the plant                                                                                                                 |
| hasConnectedDevice | `Boolean` | Boolean value indicating if the plant has a physical IoT sensor reading moisture data from the plant. This value is used to tell the front end to try to pull data from that plant's sensor. |

## Available Endpoints

### Plants

#### `GET /plants`

Returns JSON payload of all plants belonging to the user issuing the request.

Response body:

```json
{
     "status": 200,
     "data": [
         {
             "id": "w9zjO15oTDTdGcJ4g4W2", // id of the plant
             "data": {
                 "uid": "3OnPPgflNNMJu7pNwmUvVitgZqH2",
                 "updatedAt": "2018-03-12T13:37:27+00:00",
                 "waterAt": "2021-05-12T13:37:27+00:00",
                 "treflePlantId": 834556,
                 "roomId": "ccf7pzjVZUXdtjTWa9pf",
                 "hasConnectedDevice": true,
                 "name": "My first plant"
             }
         }
     ]
}
```

Possible response codes:

- `500`: Server error; could not reach Firebase.

#### `POST /plants`

Adds a new plant to the user's collection.

Request body:

```json
{    
    "name": "My second plant",    
    "waterAt": "2021-02-4T12:00:00+00:00",   
    "roomId": "gzf1bajQKUXdtjTWa6cw"
    "treflePlantId": 834556,
    "hasConnectedDevice": true
}
```

Response body:

```json
{    
    "status": 201,    
    "data": {        
        "id": "KD3NG4W6JeVE3pUmvPFc"    
    }
}
```

Possible response codes:

- `400`: Improperly formatted request body (i.e. missing properties or improper types)

- `409`: Plant already exists for user. A user cannot have two plants of the same name.

- `201`: Successfully created a new plant.

- `500`: Server error; could not reach Firebase.

#### `DELETE /plants/{plantId}`

Deletes the plant specified by `plantId` if it exists and belongs to the user issuing the requests.

No response body is return, just a `204 No Content` status code.

Possible response codes:

- `403`: The plant does not belong to the user; users can only delete their own plants.

- `500`: Server error; could not reach Firebase.

#### `PUT /plants/{plantId}`

Updates the plant specified by `plantId` if it exists and belongs to the user issuing the requests.

The request body must contain at least one updated value from the plant collection data model. For example to change the name of a plant, the request body would be:

```json
{    
    "name": "My new plant name"
}
```

Response body:

```json
{
    "status": 200,
    "data": {
        "id": "KD3NG4W6JeVE3pUmvPFc"
    }
}
```

Possible response codes:

- `400`: Improperly formatted request body (i.e. missing properties or improper types)

- `403`: The plant does not belong to the user; users can only update their own plants.

- `404`: The plant does not exist.

- `200`: Successfully updated the plant.

- `500`: Server error; could not reach Firebase.

### Waterings

A watering for a plant consists of a timestamp for when the plant was watered, and a  user-determined "health" rating. This value is purely subjective and subject to the user, but offers an early way to track plant health over time. In the future, better measures can be collected and analyzed.

#### `GET /plants/{plantId}/waterings`

Fetches all of the times a specific plant was watered.

Response body:

```json
{
    "status": 200,
    "data": [
        {
            "health": 8,
            "wateredAt": "2021-04-03T03:14:19.351Z",
            "id": "6e8bc19b-7211-4ea2-8c08-70b149a07782"
        }
    ]
}
```

Possible response codes:

- `403`: The plant does not belong to the user; users can only update their own plants.

- `200`: Successfully fetched data.

- `500`: Server error; could not reach Firebase.

#### `POST /plants/{plantId}/waterings`

Log a new watering for a plant.

Request body:

```json
{
    "wateredAt": "2021-05-01T03:14:19.351Z",
    "health": 5
}
```

Response body:

```json
{
    "status": 201,
    "data": {
        "id": "776d9e41-5574-4496-8492-be13c7c608fa" // id of watering
    }
}
```

Possible response codes:

- `403`: The plant does not belong to the user; users can only update their own plants.

- `201`: Successfully added data.

- `500`: Server error; could not reach Firebase.

#### `DELETE /plants/{plantId}/waterings/{wateringId}`

Delete a watering from a plant's watering history if the watering exists and the plant belongs to the user issuing the requests.

No response body is return, just a `204 No Content` status code.

Other possible response codes:

- `403`: The plant does not belong to the user; users can only delete their own plants.

- `500`: Server error; could not reach Firebase.

#### `PUT /plants/{plantId}/waterings/{wateringId}`

Updates the data of a specific watering if it exists and the plant belongs to the user issuing the requests. As with plant updates, one of the fields must be specified. For waterings, either the "wateredAt" timestamp or the health rating can be updated. For example, to change the health rating:

```json
{
    "health": "6"
}
```

Response body:

```json
{    
    "status": 200,    
    "data": {        
        "id": "776d9e41-5574-4496-8492-be13c7c608fa"    
    }
}
```

Possible response codes:

- 

- `403`: The plant does not belong to the user; users can only update their own plants.

- `404`: The watering does not exist.

- `200`: Successfully updated the watering.

- `500`: Server error; could not reach Firebase.
