# Rooms

## Data Model

Stored plant data contains the following fields:

| **Name**  | **Type** | **Description**                                                                         |
| --------- | -------- | --------------------------------------------------------------------------------------- |
| name      | `string` | A user-defined name to identify a room in the user's collection                         |
| uid       | `string` | Firebase generated user ID to identify the owner of the entity                          |
| updatedAt | `string` | A timestamp of the last time the room was updated (automatically generated server-side) |

## Available Endpoints

#### `GET /rooms`

Returns JSON payload of all rooms belonging to the user issuing the request.

Response body:

```json
{     
    "status": 200,     
    "data": [         
        {             
            "id": "ccf7pzjVZUXdtjTWa9pf",
            "data": {
                "uid": "3OnPPgflNNMJu7pNwmUvVitgZqH2",
                "updatedAt": "2021-03-13T16:48:59.251Z",
                "name": "Bedroom"
            }        
        }     
    ]
}
```

Possible response codes:

- `500`: Server error; could not reach Firebase.

#### `POST /rooms`

Adds a new room to the user's collection.

Request body:

```json
{
    "name": "Living room"
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

- `409`: Room already exists for user. A user cannot have two rooms of the same name.

- `201`: Successfully created a new room.

- `500`: Server error; could not reach Firebase.

#### `DELETE /rooms/{roomId}`

Deletes the plant specified by `roomId` if it exists and belongs to the user issuing the requests.

No response body is return, just a `204 No Content` status code.

Possible response codes:

- `403`: The room does not belong to the user; users can only delete their own rooms.

- `500`: Server error; could not reach Firebase.

#### `PUT /rooms/{roomId}`

Updates the plant specified by `plantId` if it exists and belongs to the user issuing the requests.

Request body:

```json
{
     "name": "My living room"
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

- `403`: The room does not belong to the user; users can only update their own rooms.

- `404`: The room does not exist.

- `200`: Successfully updated the room.

- `500`: Server error; could not reach Firebase.
