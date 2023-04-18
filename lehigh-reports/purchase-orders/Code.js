function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('FOLIO Reports')
      .addItem('Refresh FOLIO transactions', 'getSpent')
      .addToUi();
}

function onInstall() {
  onOpen();
}

function getSpent() {
  var baseOkapi = 'https://okapi-bugfest-honeysuckle.folio.ebsco.com';  //1 -> YOUR OKAPI ENDPOINT
  var tenant = "fs09000000"; //2-> TENANT
  
  var spreadsheet = SpreadsheetApp.getActiveSheet();

  //CLEAR OLD DATA AND FORMATS FROM THIS SHEET
  spreadsheet.clearFormats();
  spreadsheet.clearContents();
  spreadsheet.setFrozenRows(0);
  if (spreadsheet.getLastRow > 1) {
    spreadsheet.deleteRows(2, spreadsheet.getLastRow()-1);
  }
  
  var collectionOfFunds = [];
  var collectionOfVendors = [];
  
  //AUTHENTICATE
  var headers = {
    "Accept" : "application/json,text/plain",
     "x-okapi-tenant" : tenant
  };
  //3 --> YOUR USERID AND PASSWORD
  var data = {
    'tenant': tenant,
    'username': '',
    'password': '',
  };
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers': headers,
    'payload' : JSON.stringify(data)
  };
  var response = UrlFetchApp.fetch(baseOkapi + '/authn/login', options);
  var returnHeaders = response.getHeaders();
  var token = returnHeaders['x-okapi-token'];
  
  var getHeaders = {
    "Accept" : "application/json",
     "x-okapi-tenant" : tenant,
    "x-okapi-token" : token
  };
  var getOptions = {
     'headers':getHeaders
  };
  
  //GET THE CURRENT FISCAL YEAR
  //4 --> UUID OF THE LEDGER
  //TODO
  var fiscalYearQuery = baseOkapi + "/finance/ledgers/3db30e78-01f7-4d14-a30e-dcff96f7ecb2/current-fiscal-year?limit=1000";
  var fiscalYearResponse = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
  var fiscalYear = JSON.parse(fiscalYearResponse.getContentText());
  var fiscalYearCode = fiscalYear['code'];
  
  //GET ALL OF THE ACCOUNTS
  var bAccountQuery = baseOkapi + "/finance/budgets?limit=1000&query=(fiscalYearId==" + fiscalYear['id'] + ") sortby name";
  var accounts = UrlFetchApp.fetch(bAccountQuery,getOptions);
  var accountsCollection = JSON.parse(accounts.getContentText()).budgets;
  for (i = 0; i < accountsCollection.length; i++) {
    var anAccount = accountsCollection[i]
    collectionOfFunds[anAccount.fundId]=anAccount.name;
  }
  
  //GET ALL OF VENDORS
  var vendorQuery = baseOkapi + "/organizations-storage/organizations?limit=99999";
  var vendors = UrlFetchApp.fetch(vendorQuery,getOptions);
  var vendorCollection = JSON.parse(vendors.getContentText()).organizations;
  for (i = 0; i < vendorCollection.length; i++) {
    var aVendor = vendorCollection[i];
    collectionOfVendors[aVendor.id]=aVendor.name;
  }
  
  //GET ALL ENCUMBRANCES
  var spentQuery = baseOkapi + "/finance/transactions?limit=99999&query=(fiscalYearId==" + fiscalYear['id'] + " and transactionType='Encumbrance') sortby transactionDate/sort.descending"
  var spentResponse = UrlFetchApp.fetch(spentQuery,getOptions);
  var dataAll = JSON.parse(spentResponse.getContentText()).transactions;
  var purchaseOrders = [];
  
  
  dataAll.forEach(function( row, index ) { 
     var values = []; 
     var amount = row.amount;
     var sourceInvoiceLine = row.encumbrance.sourcePoLineId;
     var poQuery = baseOkapi + "/orders/composite-orders/" + row.encumbrance.sourcePurchaseOrderId;
     var poResponse = UrlFetchApp.fetch(poQuery,getOptions);
     var aPO = JSON.parse(poResponse.getContentText());
     
     var poLineQuery = baseOkapi + "/orders/order-lines/" + sourceInvoiceLine;
     var poLineResponse = UrlFetchApp.fetch(poLineQuery,getOptions);
     var poLine = JSON.parse(poLineResponse.getContentText());     
     
     var desc = poLine.titleOrPackage;   
     var tags = poLine.tags;
     var values = []; 
     
     createDate = row.metadata.createdDate;
     createDateArray = createDate.split("T");
     var formattedCreateDate = Utilities.formatDate(new Date(createDateArray[0]), "GMT+1", "MM/dd/yyyy");
     
     //CIRC COUNT
     var circCount = "";
     if (poLine.orderFormat == "Physical Resource") {
       //GET ITEM
       var itemQuery = baseOkapi + "/inventory/items?query=(purchaseOrderLineIdentifier==" + poLine.id + ")";
       var itemResponse = UrlFetchApp.fetch(itemQuery,getOptions);
       var items = JSON.parse(itemResponse.getContentText()).items;
       if (items.length > 0) {
         Logger.log(items[0]);
         Logger.log(itemQuery);
         if (items[0].barcode != null && items[0].barcode != "") {
             Logger.log(items[0].barcode);
             //circCount = "lookup";
             var loanQuery = baseOkapi + "/circulation/loans?query=(itemId==" + items[0].id + ")";
             var loanResponse = UrlFetchApp.fetch(loanQuery,getOptions);
             circCount = JSON.parse(loanResponse.getContentText()).totalRecords;
         }
       }
     }
     
     values.push(formattedCreateDate); 
     values.push(fiscalYearCode);
     values.push(row.transactionType);
     values.push(row.encumbrance.status);
     var objectCode = "unknown";
     if (tags != null) {
        objectCode = getObjectCodeTag(tags['tagList']);
     }
     var projectCode = "n/a"
     if (tags != null) {
        projectCode = getProjectCodeTag(tags['tagList']);
     }
     values.push(poLine.poLineNumber);
     values.push(objectCode);
     values.push(projectCode);
     values.push(collectionOfFunds[row.fromFundId]);
     values.push(poLine.orderFormat);
     values.push(circCount);
     values.push(desc);
     values.push(collectionOfVendors[aPO.vendor]);
     values.push(poLine.receiptStatus);
     
     var formattedAmount = Utilities.formatString('$%.2f', row.amount);
     values.push(formattedAmount);
     
     var formattedInitEncumbrance = Utilities.formatString('$%.2f', row.encumbrance.initialAmountEncumbered);
     values.push(formattedInitEncumbrance);
     
     var formattedAmountExpended = Utilities.formatString('$%.2f', row.encumbrance.amountExpended);
     values.push(formattedAmountExpended);
     
     purchaseOrders[index]=values;
     
  })
   
   
  var colHeaders = []
  var colHeader = []
  colHeaders.push("Transaction Date")
  colHeaders.push("Fiscal Year")
  colHeaders.push("Trans Type")
  colHeaders.push("Encumbrance Status");
  colHeaders.push("PO Number")
  colHeaders.push("Object Code")
  colHeaders.push("Project Code")
  colHeaders.push("Fund")
  colHeaders.push("Format");
  colHeaders.push("Circs");
  colHeaders.push("Description")
  colHeaders.push("Vendor")
  colHeaders.push("Receipt Status")
  colHeaders.push("Encumbrance")
  colHeaders.push("Initial Encumbrance")
  colHeaders.push("Amount Expended")
  
  colHeader.push(colHeaders)
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss")  
  
  spreadsheet.getRange(1, 1, 1, 16).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin")
  spreadsheet.getRange(2, 1, purchaseOrders.length, purchaseOrders[0].length).setValues(purchaseOrders).setFontFamily("Cabin")
  spreadsheet.setName("FOLIO POs: " + date);
  spreadsheet.sort(1, false);
  
}


function getProjectCodeTag(tagCollection) {
  for(var t = 0; t < tagCollection.length; t++){
    var tag = tagCollection[t].toUpperCase();
    if(tag.includes("PROJ-CD")) return tag;
  }
  return "n/a";
}

function getObjectCodeTag(tagCollection) {
  for(var t = 0; t < tagCollection.length; t++){
   var tag = tagCollection[t].toUpperCase();
   if(tag.includes("OBJ-CD")) return tag;
  }
  return "unknown";
}