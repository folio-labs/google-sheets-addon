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
  var tenant = "fs09000000"; //2 -> TENANT ID
  var spreadsheet = SpreadsheetApp.getActiveSheet();
  
  //CLEAR OLD DATA AND FORMATS FROM THIS SHEET
  spreadsheet.clearFormats();
  spreadsheet.clearContents();
  spreadsheet.setFrozenRows(0);
  if (spreadsheet.getLastRow > 1) {
    spreadsheet.deleteRows(2, spreadsheet.getLastRow()-1);
  }
  
  var collectionOfFunds = []
  var collectionOfVendors = []
  
  //AUTHENTICATE
   var headers = {
    "Accept" : "application/json,text/plain",
     "x-okapi-tenant" : tenant
  };
  //3 --> USERID AND PASSWORD
  //WILL NEED PERMISSIONS
  var data = {
    'tenant': 'tenant,
    'username': '',
    'password': '',
  };
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers':headers,
    'payload' : JSON.stringify(data)
  };
  var response = UrlFetchApp.fetch(baseOkapi + '/authn/login', options);
  var returnHeaders = response.getHeaders();
  var token = returnHeaders['x-okapi-token']
  
  var getHeaders = {
    "Accept" : "application/json",
     "x-okapi-tenant" : tenant,
    "x-okapi-token" : token
  };
  var getOptions = {
     'headers':getHeaders,
     'muteHttpExceptions': true
  }
  
  //GET THE CURRENT FISCAL YEAR
  //4 --> UUID OF LEDGER
  //TODO - LEDGER IS HARDCODED
  var fiscalYearQuery = baseOkapi + "/finance/ledgers/3db30e78-01f7-4d14-a30e-dcff96f7ecb2/current-fiscal-year?limit=1000"
  var fiscalYearResponse = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
  var fiscalYear = JSON.parse(fiscalYearResponse.getContentText());
  var fiscalYearCode = fiscalYear['code'];
  
  
  //GET ALL OF THE ACCOUNTS
  var bAccountQuery = baseOkapi + "/finance/budgets?limit=5000&query=(fiscalYearId==" + fiscalYear['id'] + ") sortby name"
  var accounts = UrlFetchApp.fetch(bAccountQuery,getOptions);
  var accountsCollection = JSON.parse(accounts.getContentText()).budgets;
  for (i = 0; i < accountsCollection.length; i++) {
    var anAccount = accountsCollection[i]
    collectionOfFunds[anAccount.fundId]=anAccount.name;
  }
  
  
  //GET ALL OF THE VENDORS
  var vendorQuery = baseOkapi + "/organizations-storage/organizations?limit=5000";
  var vendors = UrlFetchApp.fetch(vendorQuery,getOptions);
  var vendorCollection = JSON.parse(vendors.getContentText()).organizations;
  for (i = 0; i < vendorCollection.length; i++) {
    var aVendor = vendorCollection[i]
    collectionOfVendors[aVendor.id]=aVendor.name;
  }
  
  
  var spentQuery = baseOkapi + "/finance/transactions?limit=99999&query=(fiscalYearId==" + fiscalYear['id'] + " and transactionType='Payment') sortby transactionDate/sort.descending"
  var spentResponse = UrlFetchApp.fetch(spentQuery,getOptions);
  var dataAll = JSON.parse(spentResponse.getContentText()).transactions;
  var paidInvoices = [];
  
  
  dataAll.forEach(function( row, index ) { 
     var values = []; 
     var amount = row.amount
     var sourceInvoiceLine = row.sourceInvoiceLineId
      
     var invoiceQuery = baseOkapi + "/invoice/invoices/" + row.sourceInvoiceId
     var invoiceR = UrlFetchApp.fetch(invoiceQuery,getOptions);
     var anInvoice = JSON.parse(invoiceR.getContentText());
      
     var invoiceLineQuery = baseOkapi + "/invoice/invoice-lines/" + sourceInvoiceLine
     var invoiceResponse = UrlFetchApp.fetch(invoiceLineQuery,getOptions);
     var invoiceLine = JSON.parse(invoiceResponse.getContentText());
          
     var poLineId = invoiceLine.poLineId
     var poLineQuery = baseOkapi + "/orders/order-lines/" + poLineId;
     var poLineResponse = UrlFetchApp.fetch(poLineQuery,getOptions);
     var poLine = JSON.parse(poLineResponse.getContentText());
     
     var purchaseOrderLineId = poLine.poLineNumber;
     var desc = invoiceLine.description;
     var tags = invoiceLine.tags;
     var values = []; 
 
     var createDate = row.metadata.createdDate;
     var createDateArray = createDate.split("T");
     var formattedCreateDate = Utilities.formatDate(new Date(createDateArray[0]), "GMT+1", "MM/dd/yyyy");
     
          
     var invoiceDate = anInvoice.invoiceDate;
     var invoiceDateArray = invoiceDate.split("T");
     var formattedInvoiceDate = Utilities.formatDate(new Date(invoiceDateArray[0]), "GMT+1", "MM/dd/yyyy");
     
     values.push(formattedCreateDate); 
     values.push(formattedInvoiceDate);
     values.push(fiscalYearCode);
     values.push(row.transactionType);
     var objectCode = "unknown";
     if (tags != null) {
        objectCode = getObjectCodeTag(tags['tagList']);
     }
     var projectCode = "n/a";
     if (tags != null) {
        projectCode = getProjectCodeTag(tags['tagList']);
     }
     values.push(anInvoice.folioInvoiceNo);
     values.push(purchaseOrderLineId);
     values.push(collectionOfFunds[row.fromFundId]);
     values.push(objectCode);
     values.push(projectCode);
     values.push(desc);
     values.push(collectionOfVendors[anInvoice.vendorId]);
     values.push(anInvoice.vendorInvoiceNo);
     var formattedAmount = Utilities.formatString('$%.2f', row.amount)
     values.push(formattedAmount);
     
     paidInvoices[index]=values;
                          

  })
   
   
  var colHeaders = []
  var colHeader = []
  colHeaders.push("Transaction Date")
  colHeaders.push("Invoice Date")
  colHeaders.push("Fiscal Year")
  colHeaders.push("Trans Type")
  colHeaders.push("Invoice Number")
  colHeaders.push("PO Line")
  colHeaders.push("Fund")
  colHeaders.push("Object Code")
  colHeaders.push("Project Code")
  colHeaders.push("Description")
  colHeaders.push("Vendor")
  colHeaders.push("Vendor invoice number")
  colHeaders.push("Amount")
  
 
 
  colHeader.push(colHeaders)
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss")  
  
  spreadsheet.getRange(1, 1, 1, 13).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin")
  spreadsheet.getRange(2, 1, paidInvoices.length, paidInvoices[0].length).setValues(paidInvoices).setFontFamily("Cabin")
  spreadsheet.setName("FOLIO Payments: " + date);
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