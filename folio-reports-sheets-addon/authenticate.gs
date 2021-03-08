function authFolio(form) {
   var ui = SpreadsheetApp.getUi();
   var ss = SpreadsheetApp.getActiveSpreadsheet();

   //GET CONNECTION DETAILS PASSED IN FROM
   //FORM ON SIDEBAR
   var userid = form.userid;
   var password = form.password;
   var endpoint = form.okapi;
   var tenant = form.tenant;
   
   //REMOVE FINAL '/' IF PRESENT IN THE OKAPI ENDPOINT
   var lastChar = endpoint.slice(endpoint.length-1);
   if (lastChar == "/") {
     endpoint = endpoint.slice(0,-1);
   }

   
   try {
     ss.toast("...authenticate");
   }
   catch(e) {
     Logger.log(e);
     return "ACCESS ERROR";
   }

   response = auth(userid,password,tenant,endpoint);

   if (response.getResponseCode() > 399) {
    ui.alert("Unable to authenticate. Response: " + response.getContentText()); 
    return;
   }
   else {
    //SAVE CONNECTION DETAILS
    var newProperties = {'userid': userid, 'password': password, 'tenant': tenant, 'okapi' : endpoint};
    PropertiesService.getUserProperties().setProperties(newProperties);
    //NEW FOLIO CONNECTION SO 
    //REMOVE PREVIOUSLY SAVED FISCAL YEAR
    PropertiesService.getUserProperties().deleteProperty('currentFiscalYear');
    ss.toast("...authenticated - connection saved");
   }
  
  var token = response.getAllHeaders()["x-okapi-token"];
  return "ok";
  

}

function auth(userid, password, tenant, endpoint) {
  //AUTHENTICATE
  //THIS FUNCTION IS USED BY ALL OF THE SCRIPTS
  //TO AUTHENTICATE
  var data = {
    'username': userid,
    'password': password,
    'tenant': tenant
  };
  var url = endpoint + "/authn/login";
  var options = {
         "method" : "POST",
         "headers" : {
           "x-okapi-tenant" : tenant,
           "Accept":"application/json"
         },
         'contentType': 'application/json',
         'payload' : JSON.stringify(data),
         'muteHttpExceptions': true 
       };
 
  var response = UrlFetchApp.fetch(url,options);
  return response;
}
