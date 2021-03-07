//OVERDUE REPORT
//DISPLAYS ALL OPEN LOANS WHERE THE
//DUE DATE < TODAY
function overdueReport() {

  var spreadsheet = SpreadsheetApp.getActiveSheet();
  var activeSheet = SpreadsheetApp.getActiveSpreadsheet();
  
  var ui = SpreadsheetApp.getUi();
  
  var baseOkapi = getStoredProperty('okapi');
  var userid = getStoredProperty('userid');
  var password = getStoredProperty('password');
  var tenant = getStoredProperty('tenant');
  
  if (baseOkapi == null) {
    ui.alert("Set up a FOLIO connection to run reports");
    return;
  }
  
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
  
  
  //HEADER/OPTIONS FOR ALL OF THE REQUESTS BELOW
  var getHeaders = {
    "Accept" : "application/json",
     "x-okapi-tenant" : tenant,
    "x-okapi-token" : token
  };
  var getOptions = {
     'headers':getHeaders,
     'muteHttpExceptions': true
  };
    
  activeSheet.toast("...report started");


  //PULL TOGETHER 'TODAY' TO PASS INTO THE API
  var today = new Date();
  var dd = today.getDate();
  
  var mm = today.getMonth()+1; 
  var yyyy = today.getFullYear();
  if(dd<10) {
      dd='0'+dd;
  } 
  
  if(mm<10) {
      mm='0'+mm;
  } 
  
  today = yyyy + '-' + mm + '-' +dd;

  //WILL ASK THE API FOR 500 RESULTS PER REQUEST
  var limit = 500;
  var offset = 0;
  var counter = 0;
  
  var loansToDisplay = [];
  var collectionEmpty = false;
  while (collectionEmpty == false) {
  
    var loanQuery = baseOkapi + "/circulation/loans?query=(dueDate %3C " + today 
        + " AND status.name %3C%3E Closed)sortby dueDate/sort.descending&limit=" + limit + "&offset=" + offset;
    var loanResponse = UrlFetchApp.fetch(loanQuery,getOptions);
    var loans = JSON.parse(loanResponse.getContentText()).loans;
    activeSheet.toast("...processing " + counter);
    if (loans.length == 0) {
      collectionEmpty = true;
    }
    else {
      //SAVE THE LOAN IN THE COLLECTION
      loans.forEach(function( row, index ) { 
        var values = []; 
        var name, patronBarcode, title, materialType, itemBarcode, callNoPrefix, enumeration;
        var copyNo, callNo, instanceId, holdingsId, itemId, itemStatus, location;
        if (row.borrower != null) {
          name = row.borrower.lastName + ", " + row.borrower.firstName;
          patronBarcode = row.borrower.barcode;
        }
        
        if (row.item != null) {
          title = row.item.title;
          materialType = row.item.materialType.name;
          itemBarcode = row.item.barcode;
          itemStatus = row.item.status.name;
          callNoPrefix = row.item.callNumberComponents.prefix;
          enumeration = row.item.enumeration;
          copyNo = row.item.copyNumber;
          callNo = row.item.callNumberComponents.callNumber;
          instanceId = row.item.instanceId;
          holdingsId = row.item.holdingsRecordId;
          itemId = row.item.id;
          
          if (row.item.location != null) {
             location = row.item.location.name;
          }
        }
        var dueDate = row.dueDate;
        var loanPolicy = row.loanPolicy.name;
        var outstandingFine = row.feesAndFines.amountRemainingToPay;
        var loanStatus = row.status.name;
        var callNoSuffix = '';  //?
        var firstContri = '';
        try {
          if (row.item.contributors != null)
            firstContri = row.item.contributors[0].name;
        }
        catch(e) {
          //NO CONTRIBUTOR TO DISPLAY
        }

        values.push(name);
        values.push(patronBarcode);
        values.push(dueDate);
        values.push(itemStatus);
        values.push(loanPolicy);
        values.push(outstandingFine);
        values.push(title);
        values.push(materialType);
        values.push(loanStatus);
        values.push(itemBarcode);
        values.push(callNoPrefix);
        values.push(callNo);
        values.push(callNoSuffix);
        values.push(enumeration);
        values.push(copyNo);
        values.push(firstContri);
        values.push(location);
        values.push(instanceId);
        values.push(holdingsId);
        values.push(itemId);
        
        loansToDisplay[counter]=values;
        counter++;
      });
    }
    offset = offset + limit;
    //for testing
    //collectionEmpty = true;
  
 }

  //PULL TOGETHER COLUMN HEADERS  
  var colHeaders = [];
  var colHeader = [];
  colHeaders.push("Patron Name");
  colHeaders.push("Patron Barcode");
  colHeaders.push("Due Date");
  colHeaders.push("Item Status");
  colHeaders.push("Loan Policy");
  colHeaders.push("Outstanding Fines");
  colHeaders.push("Title");
  colHeaders.push("Material Type");
  colHeaders.push("Loan Status");
  colHeaders.push("Item Barcode");
  colHeaders.push("Call Number Prefix");
  colHeaders.push("Call Number");
  colHeaders.push("Call Number Suffix");
  colHeaders.push("Enumeration");
  colHeaders.push("Copy No");
  colHeaders.push("Contributor");
  colHeaders.push("Location");
  colHeaders.push("Instance Id");
  colHeaders.push("Holdings Id");
  colHeaders.push("Item Id");
  
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss");
  colHeader.push(colHeaders);
  spreadsheet.setName("OVERDUE REPORT " + "(" + date + ")");
  spreadsheet.getRange(1, 1, 1, colHeader[0].length).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin");
  spreadsheet.getRange(2, 1, loansToDisplay.length, loansToDisplay[0].length).setValues(loansToDisplay).setFontFamily("Cabin");
  spreadsheet.setFrozenRows(1);
  activeSheet.toast("report completed...");
  
 }