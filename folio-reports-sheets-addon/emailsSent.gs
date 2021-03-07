//SENT EMAIL REPORT
//SHOW ALL SENT EMAILS FROM THE /EMAIL API
function emailsSent() {
  
  var ui = SpreadsheetApp.getUi();
  
  var baseOkapi = getStoredProperty('okapi');
  var userid = getStoredProperty('userid');
  var password = getStoredProperty('password');
  var tenant = getStoredProperty('tenant');
  
  if (baseOkapi == null) {
    ui.alert("Set up a FOLIO connection to run reports");
    return;
  }
  
  var spreadsheet = SpreadsheetApp.getActiveSheet();
  
  //AUTHENTICATE - GET TOKEN
  var token = "";
  var response = auth(userid,password,tenant,baseOkapi);
  if (response.getResponseCode() > 399) {
    Logger.log("Unable to authenticate. Response: " + response.getContentText()); 
    ui.alert("Unable to authenticate.  Resonse: " + response.getContentText());
    return;
  }
  else {
    token = response.getAllHeaders()["x-okapi-token"];
  }
  
  //CLEAR OLD DATA AND FORMATS FROM THIS SHEET
  spreadsheet.clearFormats();
  spreadsheet.clearContents();
  spreadsheet.setFrozenRows(0);
  if (spreadsheet.getLastRow > 1) {
    spreadsheet.deleteRows(2, spreadsheet.getLastRow()-1);
  }
  
  
  emailQuery = baseOkapi + '/email?limit=99999';

  var getHeaders = {
    "Accept" : "application/json",
     "x-okapi-tenant" : tenant,
    "x-okapi-token" : token
  };
  var getOptions = {
     'headers':getHeaders,
     'muteHttpExceptions': true
  };
  var emailResponse = UrlFetchApp.fetch(emailQuery,getOptions);
  var dataAll = JSON.parse(emailResponse.getContentText()).emailEntity;
  var emailsSent = [];
 
  
   dataAll.forEach(function( row, index ) { 
     var values = []; 
     //GET PATRON EMAIL
     body = row.body;
     //body = body.substring(0,100)
     values.push(row.to);
     values.push(row.header);
     values.push(row.status);
     values.push(row.date);
     //values.push(body +  " ...");
     values.push(body);
       
     emailsSent[index]=values;
                          

  });
   
  //PULL TOGETHER HEADERS 
  var colHeaders = [];
  var colHeader = [];
  colHeaders.push("Email To");
  colHeaders.push("Subject");
  colHeaders.push("Status");
  colHeaders.push("Date");
  colHeaders.push("Body");
  colHeader.push(colHeaders);
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss");  

  spreadsheet.getRange(1, 1, 1, 5).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin");
  spreadsheet.getRange(2, 1, emailsSent.length, emailsSent[0].length).setValues(emailsSent).setFontFamily("Cabin");
  spreadsheet.setName("email report: " + date);
  //WRAP & WIDEN THE COLUMN THE EMAIL IS DISPLAYED IN
  spreadsheet.getRange(1, 5,spreadsheet.getLastRow(),1).setWrap(true);
  spreadsheet.setColumnWidth(5, 400);
  
}

