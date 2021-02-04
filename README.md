# HousePlants-API

This repository contains a simple CRUD API for interacting with user information stored in Google Firebase's [Cloud Firestore](https://cloud.google.com/firestore). The API is written in TypeScript and built using [ExpressJS](https://expressjs.com/) and deployed to [Firebase Functions](https://firebase.google.com/docs/functions) triggered by HTTPS requests to the following base API endpoint:

```http
https://us-central1-house-plants-api.cloudfunctions.net/webApi/api/v1
```

This API was built to act as a back-end for a simple mobile application for Georgia Tech's CS 4261: Mobile Applications & Services. The application integrates with a 3rd party API, [Trefle](https://docs.trefle.io/), for retrieving plant-specific information to be displayed in the app's UI.

## Data Model

Stored plant data contains the following fields:

| **Name**      | **Type** | **Description**                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| name          | `string` | A user-defined name to identify a plant in the user's collection             |
| uid           | `string` | Firebase generated user ID to identify the owner of the entity               |
| waterAt       | `Date`   | Timestamp of when the plant needs to be watered                              |
| treflePlantId | `Number` | Unique ID used to query Trefle to get biological information about the plant |

## Available Endpoints

All endpoints require user authentication by passing an ID token obtained during user registration and login. Tokens are necessary in order to identify users and permit access to only their own data. All HTTPS requests made to the API must include the following header:

```http
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://us-central1-house-plants-api.cloudfunctions.net/webApi/api/v1/<ENDPOINT_PATH>
```

#### `GET /users/me`

Returns information about the user making the request.

Response body:

```json
{
    "status": 200,
    "data": {
        "uid": "3OnPPgflNNMJu7pNwmUvVitgZqH2",
        "displayName": "Benjamin Melnick",
        "email": "bmelnick3@gatech.edu"
    }
}
```

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
                "name": "My first plant"
            }
        }
    ]
}
```

Possible error codes:

- `500`: Server error; could not reach Firebase.

#### `POST /plants`

Adds a new plant to the user's collection.

Request body:

```json
{
    "name": "My second plant",
    "waterAt": "2021-02-4T12:00:00+00:00",
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

Possible error codes:

- `400`: Improperly formatted request body (i.e. missing properties or improper types)

- `409`: Plant already exists for user. A user cannot have two plants of the same name.

- `201`: Successfully created a new plant.

- `500`: Server error; could not reach Firebase.

#### `DELETE /plants/{plantId}`

Deletes the plant specified by `plantId` if it exists and belongs to the user issuing the requests.

No response body is return, just a `204 No Content` status code.

Possible error codes:

- `403`: The plant does not belong to the user; users can only delete their own plants.

- `500`: Server error; could not reach Firebase.

#### `PUT /plants/{plantId}`

Updates the plant specified by `plantId` if it exists and belongs to the user issuing the requests.

Request body:

```json
{
    "name": "My second favorite plant",
    "waterAt": "2021-02-4T12:00:00+00:00",
    "treflePlantId": 834556
}
```

## Possible error codes:

- `400`: Improperly formatted request body (i.e. missing properties or improper types)

- `403`: The plant does not belong to the user; users can only update their own plants.

- `404`: The plant does not exist. 

- `200`: Successfully updated the plant.

- `500`: Server error; could not reach Firebase.

## Usage

To use the API in your applications, start by signing up for the app. This can be done through the Firebase Auth API for your platform (iOS, Android, Node, etc). For example, to sign up through the REST API:

```http
https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=[API_KEY]
```

```json
{
    "email": "",
    "password":,
    "returnSecureToken": true
}
```

Response body:

```json
{
  "idToken": "[ID_TOKEN]",
  "email": "[user@example.com]",
  "refreshToken": "[REFRESH_TOKEN]",
  "expiresIn": "3600",
  "localId": "tRcfmLH7..."
}
```

For other APIs, see: [https://firebase.google.com/docs/reference/rest/auth/#section-sign-in-email-password](https://firebase.google.com/docs/reference/rest/auth/#section-sign-in-email-password)

You will need to use the provided `idToken` in the `Authorization` request header in order to reach protected endpoints and access your new account's data. Eventually, the token will expire, in which you case you can generate a new token at the sign-in endpoint (with the same request body): 

```http
https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=[API_KEY]
```


