function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('FOLIO Reports')
      .addItem('Refresh FOLIO transactions', 'getSpent')
      .addToUi();
}

function onInstall() {
  onOpen();
}

function authenticate() {
  let config = {
    'environment': 'prod'
  }
  PropertiesService.getScriptProperties().setProperty("config", JSON.stringify(config));
  config.username = PropertiesService.getScriptProperties().getProperty("username");
  config.password = Utilities.newBlob(Utilities.base64Decode(
      PropertiesService.getScriptProperties().getProperty("password")))
      .getDataAsString();
  FOLIOAUTHLIBRARY.authenticateAndSetHeaders(config);
}

function getSpent() {
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
  
  authenticate();
  let config = JSON.parse(PropertiesService.getScriptProperties().getProperty("config"));
  let getOptions = FOLIOAUTHLIBRARY.getHttpGetOptions();
  //GET THE CURRENT FISCAL YEAR
  //4 --> UUID OF THE LEDGER
  //TODO
  var fiscalYearQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
    "/finance/ledgers/cdef2609-ba0a-4f42-abfb-14d315698d03/current-fiscal-year?limit=1000";
  var fiscalYearResponse = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
  var fiscalYear = JSON.parse(fiscalYearResponse.getContentText());
  var fiscalYearCode = fiscalYear['code'];
  
  //GET ALL OF THE ACCOUNTS
  var bAccountQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
    "/finance/budgets?limit=1000&query=(fiscalYearId==" + fiscalYear['id'] + ") sortby name";
  var accounts = UrlFetchApp.fetch(bAccountQuery,getOptions);
  var accountsCollection = JSON.parse(accounts.getContentText()).budgets;
  for (i = 0; i < accountsCollection.length; i++) {
    var anAccount = accountsCollection[i]
    collectionOfFunds[anAccount.fundId]=anAccount.name;
  }
  
  //GET ALL OF VENDORS
  var vendorQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
    "/organizations/organizations?limit=99999";
  var vendors = UrlFetchApp.fetch(vendorQuery,getOptions);
  var vendorCollection = JSON.parse(vendors.getContentText()).organizations;
  for (i = 0; i < vendorCollection.length; i++) {
    var aVendor = vendorCollection[i];
    collectionOfVendors[aVendor.id]=aVendor.name;
  }
  
  //GET ALL ENCUMBRANCES
  var spentQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
    "/finance/transactions?limit=99999&query=(fiscalYearId==" + fiscalYear['id'] + " and transactionType='Encumbrance') sortby transactionDate/sort.descending"
  var spentResponse = UrlFetchApp.fetch(spentQuery,getOptions);
  var dataAll = JSON.parse(spentResponse.getContentText()).transactions;
  var purchaseOrders = [];
  
  
  dataAll.forEach(function( row, index ) { 
     var values = []; 
     var amount = row.amount;
     Logger.log(row);
     var sourceInvoiceLine = row.encumbrance.sourcePoLineId;
     var poQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
       "/orders/composite-orders/" + row.encumbrance.sourcePurchaseOrderId;
     Logger.log(poQuery);
     var poResponse = UrlFetchApp.fetch(poQuery,getOptions);
     //ORDER NO LONGER EXISTS (IT'S IN THE ENCUMBRANCE, BUT ORDER HAS BEEN DELETED)
     if (poResponse.getResponseCode == 404) {
       var aPO = {};
       var poLine = {};
       aPO.vendor = "PO DELETED";
       poLine.orderFormat = "PO DELETED"
     }
     else {
      var aPO = JSON.parse(poResponse.getContentText());
      var poLineQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
        "/orders/order-lines/" + sourceInvoiceLine;
      var poLineResponse = UrlFetchApp.fetch(poLineQuery,getOptions);
      var poLine = JSON.parse(poLineResponse.getContentText()); 
     }
     
    
     
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
       var itemQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
         "/inventory/items?query=(purchaseOrderLineIdentifier==" + poLine.id + ")";
       var itemResponse = UrlFetchApp.fetch(itemQuery,getOptions);
       var items = JSON.parse(itemResponse.getContentText()).items;
       if (items.length > 0) {
         Logger.log(items[0]);
         Logger.log(itemQuery);
         if (items[0].barcode != null && items[0].barcode != "") {
             Logger.log(items[0].barcode);
             //circCount = "lookup";
             var loanQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
               "/circulation/loans?query=(itemId==" + items[0].id + ")";
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

     values.push(poLine.id);
//Added Vendor Invoice Number by chm213 on November 15, 2021
    var purchaseOrderLineId = row.encumbrance.sourcePoLineId;
    var invoiceLineQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
      "/invoice/invoice-lines" + "?query=(poLineId==" + purchaseOrderLineId + ")";
    Logger.log("invoiceLineQuery:" + invoiceLineQuery);

    var invoiceResponse = UrlFetchApp.fetch(invoiceLineQuery,getOptions);
    var invoices = JSON.parse(invoiceResponse.getContentText()).invoiceLines;  
    if (invoices.length > 0) {
           Logger.log("Invoice Lines:" + invoices[0]);           
           var theInvoiceId = invoices[0].invoiceId;
           Logger.log("InvoiceId:" + theInvoiceId);  
           var invoiceQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
             "/invoice/invoices/" + theInvoiceId
           var invoiceR = UrlFetchApp.fetch(invoiceQuery,getOptions);
           var anInvoice = JSON.parse(invoiceR.getContentText());
           Logger.log(anInvoice);
           values.push(anInvoice.vendorInvoiceNo);
    } else values.push(" ");
     purchaseOrders[index]=values;

    // Added POL Creator by msl321 for Erin on Jan 9, 2023
    var creatorId = poLine.metadata.createdByUserId;
    var userQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) + 
      "/users/" + creatorId;
    var userResponse = UrlFetchApp.fetch(userQuery,getOptions);
    var username = JSON.parse(userResponse.getContentText()).username;
    values.push(username);
     
  })
   
   
  var colHeaders = []
  var colHeader = []
  colHeaders.push("Transaction Date")
  colHeaders.push("Fiscal Year")
  colHeaders.push("Trans Type")
  colHeaders.push("Encumbrance Status");
  colHeaders.push("POLine Number")
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
  colHeaders.push("line uuid")
  colHeaders.push("Vendor Invoice No")
  colHeaders.push("POLine Created By")
  
  colHeader.push(colHeaders)
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss")  
  
  spreadsheet.getRange(1, 1, 1, 19).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin")
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