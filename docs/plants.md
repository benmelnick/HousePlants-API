# Plants

## Data Model

Stored plant data contains the following fields:

| **Name**      | **Type** | **Description**                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| name          | `string` | A user-defined name to identify a plant in the user's collection             |
| uid           | `string` | Firebase generated user ID to identify the owner of the entity               |
| waterAt       | `Date`   | Timestamp of when the plant needs to be watered                              |
| roomId        | `string` | ID of the room that the plant belongs to                                     |
| treflePlantId | `Number` | Unique ID used to query Trefle to get biological information about the plant |

## Available Endpoints

#### `GET /plants`

Returns JSON payload of all plants belonging to the user issuing the request.

Response body:

```json
{
     "status": 200,
     "data": [
         {
             "id": "w9zjO15oTDTdGcJ4g4W2",
             "data": {
                 "uid": "3OnPPgflNNMJu7pNwmUvVitgZqH2",
                 "waterAt": "2018-03-12T13:37:27+00:00",
                 "treflePlantId": 834556,
                 "roomId": "ccf7pzjVZUXdtjTWa9pf",
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
    "treflePlantId": 834556
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

Request body:

```json
{    
    "name": "My second favorite plant",    
    "waterAt": "2021-02-4T12:00:00+00:00", 
    "roomId": "gzf1bajQKUXdtjTWa6cw",   
    "treflePlantId": 834556
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
