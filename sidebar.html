
function onOpen() {
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .createMenu('Custom Menu')
      .addItem('FOLIO UM TESTING - PERMISSIONS', 'showSidebar')
      .addToUi();
}

function onInstall() {
  onOpen();
}


function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
      .setTitle('FOLIO USER PERMISSIONS:')
      .setWidth(500);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);    
}


function startLookup(form) {
  
  var folioOperators = {};
  
  var endpoint = form.endpoint;
  var userid = form.userid;
  var password = form.password;
  var tenant = form.tenant;
  
  //var up = PropertiesService.getUserProperties();
  //Logger.log("--before-------->" + [up.getProperty("endpoint"), up.getProperty("userid"), up.getProperty("password")]);
  
  var ui = SpreadsheetApp.getUi();
  
  //BETTER WAY TO VALIDATE MISSING FIELDS?
  if (endpoint == null || endpoint == "") {
     ui.alert("endpoint is Required");
     return;
  }
  
  if (userid == null || userid == "") {
     ui.alert("userid is Required");
     return;
  }
  
  if (password == null || password == "") {
     ui.alert("password is Required");
     return;
  }
  
  if (tenant == null || tenant == "") {
     ui.alert("tenant is Required");
     return;
  }
  
  PropertiesService.getUserProperties().setProperty('endpoint', endpoint);
  PropertiesService.getUserProperties().setProperty('userid', userid);
  PropertiesService.getUserProperties().setProperty('password', password);
  PropertiesService.getUserProperties().setProperty('tenant', tenant);
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("...starting");
  var data = {
    'username': userid,
    'password': password
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
  if (response.getResponseCode() > 399) {
    ui.alert("Unable to authenticate. Response: " + response.getContentText()); 
    return;
  }
  
  var token = response.getAllHeaders()["x-okapi-token"];

  //GET LIST OF PERMISSIONS
  var permissionsEndPoint = endpoint + "/perms/permissions?length=10000&query=(visible==true)";
  
  var getOptions = {
    "method":"GET",
    "headers": {
      "x-okapi-token": token,
      "x-okapi-tenant": tenant,
      "Accept":"application/json",
      "muteHttpExceptions": true 
    }
  };
  var spreadsheet = SpreadsheetApp.getActiveSheet();
  var response = UrlFetchApp.fetch(permissionsEndPoint,getOptions); 
  
  if (response.getResponseCode() > 399) {
    ui.alert("Error calling perms/permissions. Response: " + response.getContentText()); 
    return;
  }
  
  
  var dataAll = JSON.parse(response.getContentText()).permissions;

  dataAll.forEach(function( row, index ) { 
    //This function will be executed for every row in the rows array

    //Set the index of the row to the first column in the sheet
    //2 is added to the index for the row number because index starts at 0 and we want to start adding data at row 2
    spreadsheet.getRange(index + 3, 1).setValue(index);

    //Set the value of string to the second column
    spreadsheet.getRange(index + 3, 2).setValue(row.permissionName);

    //Set the value of number to the third column
    spreadsheet.getRange(index + 3, 3).setValue(row.displayName);
    
    row.grantedTo.forEach(function(row,index) {
       folioOperators[row] = row;
      
    });
                          

  });
  
  
  //show the values stored
  var colCounter = 4;
  for (var k in folioOperators) {
    spreadsheet.getRange(1, colCounter).setValue(k);
    colCounter++;
  }
  
  var lastColumn = spreadsheet.getLastColumn();
    
  
  //display the name for each operator uuid
  for (var i = 4; i <= lastColumn; i++) {
    if (spreadsheet.getRange(1, i).isBlank()) continue;
    var operatorUUid = spreadsheet.getRange(1, i).getValue();
    //GETS THE PERMISSION WHICH CONTAINS THE UUID FOR THE OPERATOR
    var permEndpoint = endpoint +  "/perms/users/" + operatorUUid;
    var permResponse = UrlFetchApp.fetch(permEndpoint,getOptions); 
    
    if (permResponse.getResponseCode() > 399) {
      ui.alert("Error calling perms/permissions. Response: " + permResponse.getContentText()); 
      return;
    }
    
    var perm = JSON.parse(permResponse.getContentText());
    var userId = perm.userId;
    
    var userEndpoint = endpoint + "/users?query=id==" + userId;
    var operatorResponse = UrlFetchApp.fetch(userEndpoint,getOptions); 
    
    if (operatorResponse.getResponseCode() > 399) {
      ui.alert("Error calling perms/permissions. Response: " + operatorResponse.getContentText()); 
      return;
    }
    
    var operator = JSON.parse(operatorResponse.getContentText());
    var firstName = operator.users[0].personal.firstName;
    var lastName = operator.users[0].personal.lastName;
    spreadsheet.getRange(2, i).setValue(firstName + " " + lastName);
    //Logger.log(firstName + lastName);
  }
  
  ss.toast("done");

 }



  function getStoredEndpoint() {
     return PropertiesService.getUserProperties().getProperty('endpoint')
  }
  
  function getStoredUserid() {
    return PropertiesService.getUserProperties().getProperty('userid')
  }

  function getStoredPassword() {
    return PropertiesService.getUserProperties().getProperty('password')
  }

  function getStoredTenant() {
    return PropertiesService.getUserProperties().getProperty('tenant')
  }
