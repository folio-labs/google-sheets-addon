//PURCHASE ORDER REPORT
//DISPLAYS PURCHASE ORDERS FOR A GIVEN FISCAL YEAR
function getPos() {

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

  
  
  //HEADER/OPTIONS FOR ALL OF THE BELOW GET REQUESTS
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
  
  //CURRENT FISCAL YEAR FROM SETTINGS
  //THERE SHOULD ALWAYS BE A FISCAL YEAR SELECTED
  //THE FIRST ONE OR THE 'ONLY' ONE IS SELECTED BY DEFAULT
  //WHEN FISCAL YEARS ARE RETREIVED acqReports.html -> Code.gs
  var fiscalYearCode = getStoredProperty('currentFiscalYear');
 
  
  //GET THE NAME OF THE FISCAL YEAR
  var fiscalYearQuery = baseOkapi + "/finance/fiscal-years/" + fiscalYearCode + "?limit=500";
  var fiscalYearResponse = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
  var fiscalYear = JSON.parse(fiscalYearResponse.getContentText());
  var fiscalYearCode = fiscalYear['code'];
  var fiscalYearLabel = fiscalYear.name + "--" + fiscalYear.code;

  //USED TO HOLD A LIST OF ORGANIZATIONS
  //AND FUNDS FOR LOOKUP LATER IN THE PROCESS
  var collectionOfFunds = [];
  var collectionOfVendors = [];
  
  
  //GET ALL OF THE ACCOUNTS
  var bAccountQuery = baseOkapi + "/finance/budgets?limit=1000&query=(fiscalYearId==" + fiscalYear['id'] + ") sortby name";
  var accounts = UrlFetchApp.fetch(bAccountQuery,getOptions);
  var accountsCollection = JSON.parse(accounts.getContentText()).budgets;
  for (var i = 0; i < accountsCollection.length; i++) {
    var anAccount = accountsCollection[i];
    collectionOfFunds[anAccount.fundId]=anAccount.name;
  }
  
  //GET ALL OF VENDORS
  var vendorQuery = baseOkapi + "/organizations-storage/organizations?limit=99999";
  var vendors = UrlFetchApp.fetch(vendorQuery,getOptions);
  var vendorCollection = JSON.parse(vendors.getContentText()).organizations;
  for (var i = 0; i < vendorCollection.length; i++) {
    var aVendor = vendorCollection[i];
    collectionOfVendors[aVendor.id]=aVendor.name;
  }
  
  //MAIN LOOP - GET ALL OF THE 'ENCUMBRANCE' TRANSACTONS FOR THIS FISCAL YEAR
  //& GATHER DETAILS ABOUT EACH 
  var spentQuery = baseOkapi + "/finance/transactions?limit=99999&query=(fiscalYearId==" + fiscalYear['id'] + 
                              " and transactionType='Encumbrance') sortby transactionDate/sort.descending";
  var spentResponse = UrlFetchApp.fetch(spentQuery,getOptions);
  var dataAll = JSON.parse(spentResponse.getContentText()).transactions;

  //WILL HOLD PO DETAILS FOR EACH ROW
  var poLines = [];
  
  var counter = 0;
  dataAll.forEach(function( row, index ) { 
      var values = []; 
      counter++;
      //...SO USER KNOWS THE SCRIPT IS PROCESSING
      if (counter % 10 == 0) {
        activeSheet.toast("...processing...." + counter);
      }
      var amount = row.amount;
      var sourcePOLine = row.encumbrance.sourcePoLineId;
      var poQuery = baseOkapi + "/orders/composite-orders/" + row.encumbrance.sourcePurchaseOrderId;
      var poResult = UrlFetchApp.fetch(poQuery,getOptions);
      var aPO = JSON.parse(poResult.getContentText());
      var poLineQuery = baseOkapi + "/orders/order-lines/" + sourcePOLine;
      var poLineResult = UrlFetchApp.fetch(poLineQuery,getOptions);
      var poLine = JSON.parse(poLineResult.getContentText());
      var desc = poLine.titleOrPackage;     
      if (poLine.errors != null) return;
     
      var tags = poLine.tags;
      createDate = row.metadata.createdDate;
      createDateArray = createDate.split("T");
      var formattedCreateDate = Utilities.formatDate(new Date(createDateArray[0]), "GMT+1", "MM/dd/yyyy");

      values.push(formattedCreateDate); 
      values.push(fiscalYearCode);
      values.push(row.transactionType);
      values.push(row.encumbrance.status);
      values.push(poLine.poLineNumber);
      values.push(collectionOfFunds[row.fromFundId]);
      values.push(poLine.orderFormat);
      values.push(desc);
      values.push(collectionOfVendors[aPO.vendor]);
      values.push(poLine.receiptStatus);
      var formattedAmount = Utilities.formatString('$%.2f', row.amount);
      values.push(formattedAmount);
      var formattedInitEncumbrance = Utilities.formatString('$%.2f', row.encumbrance.initialAmountEncumbered);
      values.push(formattedInitEncumbrance);
      var formattedAmountExpended = Utilities.formatString('$%.2f', row.encumbrance.amountExpended);
      values.push(formattedAmountExpended);
      //SAVE DATA FOR THE ROW
      poLines[index]=values;
                          

  });
  
  
  var filteredPoLines = poLines.filter(function (el) {
    return el != null;
  });
  
  if (filteredPoLines.length == 0) {
    //var range = spreadsheet.getRange("A1:P999");
    //range.clearContent();
    //range.clearFormat();
    spreadsheet.getRange(1, 1).setValue("Nothing to display for " + fiscalYearLabel).setFontFamily("Cabin");
    return;
  }
   
  //PULL TOGETHER COLUMN HEADERS     
  var colHeaders = [];
  var colHeader = [];
  colHeaders.push("Transaction Date");
  colHeaders.push("Fiscal Year");
  colHeaders.push("Trans Type");
  colHeaders.push("Encumbrance Status");
  colHeaders.push("PO Line");
  colHeaders.push("Fund");
  colHeaders.push("Format");
  colHeaders.push("Description");
  colHeaders.push("Vendor");
  colHeaders.push("Receipt Status");
  colHeaders.push("Encumbrance");
  colHeaders.push("Initial Encumbrance");
  colHeaders.push("Amount Expended");
  colHeader.push(colHeaders);
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss")  ;
  
  activeSheet.toast("...adding results to spreadsheet..." + counter);
  
  spreadsheet.getRange(1, 1, 1, 13).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin");
  spreadsheet.getRange(2, 1, filteredPoLines.length, filteredPoLines[0].length).setValues(filteredPoLines).setFontFamily("Cabin");
  spreadsheet.sort(1, false);

  activeSheet.toast("report completed...");
  
  spreadsheet.setName("FOLIO POs: " + fiscalYearLabel + "(" + date + ")");

  
}


