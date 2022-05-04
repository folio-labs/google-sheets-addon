var baseOkapi = 'https://redacted.folio.redacted.com';



function onOpen() {
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .createMenu('Inventory')
      .addItem('Launch Library Inventory', 'showSidebar')
      .addToUi();
}

function onInstall() {
  onOpen();
}


function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
      .setTitle('Library Inventory:')
      .setWidth(500);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);    
      resetCurrentRow();
}

function resetCurrentRow() {
  Logger.log("reseting current row");
  var userProperties = PropertiesService.getUserProperties();
  PropertiesService.getUserProperties().setProperty("currentInventoryRow",-1);
}

function checkStatus(itemBarcode,scannedIndicator) {
  var itemQuery = baseOkapi + "/item-storage/items?query=(barcode==" + itemBarcode + ")";

  var getHeaders = {
    "Accept" : "application/json",
    "x-okapi-tenant" : "redacted",
    "x-okapi-token" : authenticate(baseOkapi)
  };
  var getOptions = {
     'headers':getHeaders
  }
  var itemResponse = UrlFetchApp.fetch(itemQuery,getOptions);
  var itemInfo = JSON.parse(itemResponse.getContentText()).items;
  var theItem = itemInfo[0];
  var itemId = theItem.id;
  var status = theItem.status.name

  if (status == "Available" && scannedIndicator == false) {
    return status;
  }
  
  if (status == "Available") {
    theItem.statisticalCodeIds.push('9a173eaa-3b9d-468b-bb85-c02e46f4d4ff');
  }
  else {
    theItem.statisticalCodeIds.push('94b67987-48c7-475c-8f58-3b1480298442');
  }
  
   var putHeaders = {
    "Accept" : "text/plain",
    "Content-type" : "application/json",
    "x-okapi-tenant" : "redacted",
    "x-okapi-token" : authenticate(baseOkapi)
  };
  var putOptions = {
   'method' : 'put',
   'payload' : JSON.stringify(theItem),
   'headers':putHeaders
 };

  var itemPutResponse = UrlFetchApp.fetch(baseOkapi + "/item-storage/items/" + itemId,putOptions);
  for(i in itemPutResponse) {
     Logger.log(i + ": " + response[i]);
  }
  if (itemPutResponse.getResponseCode() != 204) {
      var ui = SpreadsheetApp.getUi();
      ui.alert("Failed to save inventory statistical category to FOLIO." + itemPutResponse.getResponseCode());
  }
  return status;
}


function findRowNumber(form) {
    var userProperties = PropertiesService.getUserProperties();
    var barcode = form.barcode;
    var status = checkStatus(barcode,true);
    if (status == "Checked out") {
      var ui = SpreadsheetApp.getUi();
      ui.alert("This item is checked out");
    }
    var spreadsheet = SpreadsheetApp.getActive().getActiveSheet();
    var lastCol = spreadsheet.getLastColumn();
    var column = 1;
    var one = 1;
    var columnValues = spreadsheet.getRange(one, column, spreadsheet.getLastRow()).getValues();
    var searchResult = columnValues.findIndex(barcode);
    Logger.log(searchResult);
    
    //1) IF IT DIDN'T FIND A ROW WITH MATCHING BARCODE - RETURN "NOT FOUND"
    if (searchResult < 0) return "NOT FOUND";


    //CONTINUE - FOUND A MATHING ROW (searchResult)
    //ARE THEY MONITORING THE ORDER?
    var monitorOrder = form.monitorOrder;


    //2) IF THE BARCODE WAS FOUND AND THE ORDER DOES NOT MATTER, MARK ROW FOUND & RETURN
    if (monitorOrder == "false" || monitorOrder == null) {
      Logger.log("monitor order was false...returning found");
      spreadsheet.getRange(searchResult, 4).check();
      spreadsheet.getRange(searchResult,5).setValue(status);
      userProperties.setProperty("currentInventoryRow", searchResult)
      return "FOUND";
    }


    if (monitorOrder == "true") {
      Logger.log("-->they are monitoring the order of barcodes");
      var lastRow = userProperties.getProperty("currentInventoryRow");
      Logger.log("last row was: " + lastRow);
      //3) MONITORING ORDER, BUT STARTING FRESH, NO NEED TO CHECK ORDER
      if (lastRow == null || lastRow == -1) {
              Logger.log("last row is: " + lastRow + " and search results are: " + searchResult);
              Logger.log("Last row was null or -1...returning");
              spreadsheet.getRange(searchResult, 4).check();
              spreadsheet.getRange(searchResult,5).setValue(status);
              spreadsheet.getRange(searchResult, 1).setBackground("white");
              userProperties.setProperty("currentInventoryRow", searchResult)
              Logger.log("setting last row to search value: " + searchResult);
              return "FOUND";
      }

      //4) MONITORING ORDER, BARCODE FOUND & SEARCH RESULT MATCHES LAST ROW + 1
      //THE EXPECTED ROW WAS SCANNED
      if (parseInt(lastRow) +1 == searchResult) {
          spreadsheet.getRange(searchResult, 4).check();
          spreadsheet.getRange(searchResult,5).setValue(status);
          spreadsheet.getRange(searchResult, 1).setBackground("white");
          Logger.log("---->last row is: " + lastRow + " and search results are: " + searchResult);
          userProperties.setProperty("currentInventoryRow", searchResult)
          return "FOUND";
      }

      if (parseInt(lastRow) +1 != searchResult) {
        Logger.log("found that last row + 1 is not equal to search result")
        Logger.log("------->last row is: " + lastRow + " and search results are: " + searchResult);

        //IS THE EXPECTED ROW JUST ONE ROW DOWN?
        if (parseInt(lastRow) +2 == parseInt(searchResult)) {
          Logger.log("in the + 2 if");
          Logger.log("last row is: " + lastRow + " and search results are: " + searchResult);
          //CHECK IF THE ONE MISSING ROW IS CHECKED OUT?
          var expectedBarcode = spreadsheet.getRange(parseInt(lastRow) + 1, 1).getValue();
          Logger.log("the expected barcode is" + expectedBarcode);
          var expectedBarcodeStatus = checkStatus(expectedBarcode,false);
          if (expectedBarcodeStatus == "Checked out") {
            //MARK EXPECTED ROW CHECKED, CHECKED OUT
            //MARK NEXT ROW CHECKED AND SAVE IT AS THE LAST ROW
            spreadsheet.getRange(searchResult -1, 4).check();
            spreadsheet.getRange(searchResult -1, 1).setBackground("white");
            spreadsheet.getRange(searchResult -1, 5).setValue("Checked Out");
            spreadsheet.getRange(searchResult, 4).check();
            spreadsheet.getRange(searchResult, 1).setBackground("white");
            spreadsheet.getRange(searchResult, 5).setValue(status);
            userProperties.setProperty("currentInventoryRow", searchResult )
            Logger.log("setting ")
            return "FOUND";
          
          }
          else {
            //A ROW WAS SKIPPED AND THAT ROW WASN'T CHECKED OUT...SO RETURN OUT OF ORDER MESSAGE
            spreadsheet.getRange(searchResult, 1).setBackground("red");
            spreadsheet.getRange(searchResult, 4).check();
            spreadsheet.getRange(searchResult, 5).setValue(status);
            resetCurrentRow();
            return "OUT OF ORDER";
          }

        }
        else {
          spreadsheet.getRange(searchResult, 1).setBackground("red");
          spreadsheet.getRange(searchResult, 4).check();
          spreadsheet.getRange(searchResult, 5).setValue(status);
          resetCurrentRow();
          return "OUT OF ORDER";
        }
      }




    }
    
}


Array.prototype.findIndex = function(search){
  if(search == "") return false;
  for (var i=0; i<this.length; i++)
    if (this[i] == search) return i +1;//because loop starts with zero and row number starts with one

  return -1;
} 
