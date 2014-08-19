for cc:
to get token: curl --user officialApiClient:C0FFEE -X POST -d "grant_type=client_credentials" http://localhost:8080/token
to use token: curl -H "Authorization: Bearer <access token here>" http://localhost:8080/secret

to get header data: i.e. -H "username:trooper", then use req.username
to get post data: i.e. POST -d "username=trooper", then use req.body.username