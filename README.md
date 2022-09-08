WiscShop
An online shopping application used as a platform for UW students and alumni to buy school merchants (using javascrip and react). On top of that, write a shopping assistant chatbot (using Dialogflow tool on Google cloud platform) which could help the people with disabilities to search products and make the purchase, also have functionality on navigation, querying and filters.


# WiscShop API

The following API can be accessed at `https://mysqlcs639.cs.wisc.edu`

| Endpoint                                       | Auth Required | Token Required | Get | Post | Put | Delete |
|------------------------------------------------|---------------|----------------|-----|------|-----|--------|
| /login                                         | ✔︎             |                | ✔︎   |      |     |        |
| /users                                         |               |                |     | ✔︎    |     |        |
| /users/`<username>`                            |               | ✔︎              | ✔︎   | ✔︎    | ✔︎   | ✔︎      |
| /tags                                          |               |                | ✔︎   |      |     |        |
| /categories                                    |               |                | ✔︎   |      |     |        |
| /categories/<category_title>/tags              |               |                | ✔︎   |      |     |        |
| /products                                      |               |                | ✔︎   |      |     |        |
| /products/`<product_id>`                       |               |                | ✔︎   |      |     |        |
| /products/`<product_id>`/tags                  |               |                | ✔︎   |      |     |        |
| /products/`<product_id>`/reviews               |               |                | ✔︎   |      |     |        |
| /products/`<product_id>`/reviews/`<review_id>` |               |                | ✔︎   |      |     |        |
| /application                                   |               | ✔︎              | ✔︎   |      | ✔︎   |        |
| /application/tags                              |               | ✔︎              | ✔︎   |      |     | ✔︎      |
| /application/tags/`<tag_value>`                |               | ✔︎              |     | ✔︎    |     | ✔︎      |
| /application/messages                          |               | ✔︎              | ✔︎   | ✔︎    |     | ✔︎      |
| /application/messages/`<message_id>`           |               | ✔︎              | ✔︎   |      | ✔︎   | ✔︎      |
| /application/products                          |               | ✔︎              | ✔︎   |      |     | ✔︎      |
| /application/products/`<product_id>`           |               | ✔︎              |     | ✔︎    |     | ✔︎      |

### Auth and Tokens

For this API, users need to provide credentials in order to access information specific to themselves. They get these credentials by requesting tokens, which are short-lived codes which tell the server that you are who you are saying you are, without having to provide username and password each time. The steps to get these tokens are outlined below.

#### Signup

So you want the user to sign up. This can be done with a `POST` request to the `/users` endpoint. You will need to tell the API a bit about the user. You should provide this data in the message body (stringified) in the following form:

```
{username:<str>,                 // Required
 password:<str>,                 // Required
 firstName:<str>,                // Optional
 lastName:<str>,                 // Optional
 goalDailyCalories:<float>,      // Optional
 goalDailyProtein:<float>,       // Optional
 goalDailyCarbohydrates:<float>, // Optional
 goalDailyFat:<float>,           // Optional
 goalDailyActivity:<float>       // Optional
}
```

Only the `username` and `password` fields are required. Don't worry about the other ones for creating a user, as they can be updated later with `PUT` requests.

If the user is successfully created, you will recieve a positive message back from the server. You will then need to login with that user.

#### Login

Alright, now you have a user and their password, but you need to log them in. You can do this via the `/login` endpoint, with a `GET` request. Effectively, you will be sending the username and password in the authorization header (Basic Auth) of the `GET`, and will recieve back a token that you can use to access information from the API. This call takes in no message body. The token you receive can then be added in the header under the `x-access-token` field.


