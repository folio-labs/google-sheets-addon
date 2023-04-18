function authenticate(baseOkapi) {
  //AUTHENTICATE
  // Make a POST request with a JSON payload.
   var headers = {
    "Accept" : "application/json,text/plain",
     "x-okapi-tenant" : "lu"
  };
  var data = {
    'tenant': 'redacted',
    'username': 'redacted',
    'password': 'redacted',
  };
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers':headers,
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };
  var response = UrlFetchApp.fetch(baseOkapi + '/authn/login', options);
  var returnHeaders = response.getHeaders();
  var token = returnHeaders['x-okapi-token'];
  return token;
}