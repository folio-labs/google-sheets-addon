//INVOICE REPORT
//DISPLAYS ALL PAYMENT TYPE TRANSACTIONS FOR A GIVEN FISCAL YEAR

function getSpent() {
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
  
  
  activeSheet.toast("...report started");
  
  //HEADER/OPTIONS FOR ALL OF THE API REQUESTS THAT FOLLOW
  var getHeaders = {
    "Accept" : "application/json",
     "x-okapi-tenant" : tenant,
    "x-okapi-token" : token
  };
  var getOptions = {
     'headers':getHeaders,
     'muteHttpExceptions': true
  };
  
  //CLEAR OLD DATA AND FORMATS FROM THIS SHEET
  spreadsheet.clearFormats();
  spreadsheet.clearContents();
  spreadsheet.setFrozenRows(0);
  if (spreadsheet.getLastRow > 1) {
    spreadsheet.deleteRows(2, spreadsheet.getLastRow()-1);
  }
  
  //CURRENT FISCAL YEAR FROM SETTINGS
  //THERE SHOULD ALWAYS BE A FISCAL YEAR SELECTED
  //THE FIRST ONE OR THE 'ONLY' ONE IS SELECTED BY DEFAULT
  //WHEN FISCAL YEARS ARE RETREIVED acqReports.html -> Code.gs
  var fiscalYearCode = getStoredProperty('currentFiscalYear');
 
  //GET THE NAME OF THE FISCAL YEAR
  var fiscalYearQuery = baseOkapi + "/finance/fiscal-years/" + fiscalYearCode;
  var fiscalYears = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
  var fiscalYear = JSON.parse(fiscalYears.getContentText());
  var fiscalYearLabel = fiscalYear.name + "--" + fiscalYear.code;

  //USED TO HOLD A LIST OF ORGANIZATIONS
  //AND FUNDS FOR LOOKUP LATER IN THE PROCESS
  var collectionOfFunds = [];
  var collectionOfVendors = [];
  
  
  //GET ALL OF THE ACCOUNTS
  var bAccountQuery = baseOkapi + "/finance/budgets?limit=1000&query=(fiscalYearId==" + fiscalYearCode + ") sortby name";
  var accounts = UrlFetchApp.fetch(bAccountQuery,getOptions);
  var accountsCollection = JSON.parse(accounts.getContentText()).budgets;
  for (i = 0; i < accountsCollection.length; i++) {
    var anAccount = accountsCollection[i];
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
  
  //MAIN LOOP - GET ALL OF THE 'PAYMENT' TRANSACTONS FOR THIS FISCAL YEAR
  //& GATHER DETAILS ABOUT EACH 
  var spentQuery = baseOkapi + "/finance/transactions?limit=99999&query=(fiscalYearId==" + fiscalYearCode + " and transactionType='Payment') sortby transactionDate/sort.descending";
  var spentResponse = UrlFetchApp.fetch(spentQuery,getOptions);
  var dataAll = JSON.parse(spentResponse.getContentText()).transactions;
  var paymentTransactions = [];
  
  var counter = 0;
  dataAll.forEach(function( row, index ) { 

    var values = []; 
    var sourceInvoiceLine = row.sourceInvoiceLineId;
    //...SO USER KNOWS THE SCRIPT IS PROCESSING
    counter++;
    if (counter % 50 == 0) {
       activeSheet.toast("...processing...." + counter);
    }
    
    //GET INVOICE
    var invoiceQuery = baseOkapi + "/invoice/invoices/" + row.sourceInvoiceId;
    var invoiceR = UrlFetchApp.fetch(invoiceQuery,getOptions);
    var anInvoice = JSON.parse(invoiceR.getContentText());
    var invoiceTotal = anInvoice.total;
    
    if (row.sourceInvoiceLineId == null) {
       Logger.log("source invoice line id missing: " + row.id);
    }
    
    if (row.sourceInvoiceLineId != null) {
      //GET INVOICE LINE
      var invoiceLineQuery = baseOkapi + "/invoice/invoice-lines/" + row.sourceInvoiceLineId;
      var invoiceResponse = UrlFetchApp.fetch(invoiceLineQuery,getOptions);
      var invoices = JSON.parse(invoiceResponse.getContentText());
      var desc = invoices.description;
      var poLineId = invoices.poLineId;
      if (poLineId != null) {
        var poLineQuery = baseOkapi + "/orders/order-lines/" + poLineId;
        var poLineResponse = UrlFetchApp.fetch(poLineQuery,getOptions);
        var poLine = JSON.parse(poLineResponse.getContentText());
        var purchaseOrderLineId = poLine.poLineNumber;
      }
      else {
        var purchaseOrderLineId = "-";
      }
     }
     else {
       var desc = "no description";
       var purchaseOrderLineId = "-";
     }
     
     try {
       var createDate = row.metadata.createdDate;
       var createDateArray = createDate.split("T");
       var formattedCreateDate = Utilities.formatDate(new Date(createDateArray[0]), "GMT+1", "MM/dd/yyyy");
     }
     catch(e) {
       createDate = "n/a";
       formattedCreateDate = "n/a";
     }
     
     values.push(formattedCreateDate); 
     values.push(fiscalYearLabel);
     values.push(row.transactionType);
     values.push(anInvoice.folioInvoiceNo);
     values.push(purchaseOrderLineId);
     values.push(collectionOfFunds[row.fromFundId]);
     values.push(desc);
     values.push(collectionOfVendors[anInvoice.vendorId]);
     values.push(anInvoice.vendorInvoiceNo);
     var formattedAmount = Utilities.formatString('$%.2f', row.amount);
     values.push(formattedAmount);
     var formattedInvoicetotal = Utilities.formatString('$%.2f', invoiceTotal);
     values.push(formattedInvoicetotal);
     //SAVE ROW  
     paymentTransactions[index]=values;
                          

  });

  //PULL TOGETHER COLUMN HEADERS   
  var colHeaders = [];
  var colHeader = [];
  colHeaders.push("Transaction Date");
  colHeaders.push("Fiscal Year");
  colHeaders.push("Trans Type");
  colHeaders.push("Invoice Number");
  colHeaders.push("PO Line");
  colHeaders.push("Fund");
  colHeaders.push("Description");
  colHeaders.push("Vendor");
  colHeaders.push("Vendor invoice number");
  colHeaders.push("Amount");
  colHeaders.push("Invoice total");
  colHeader.push(colHeaders);
   
  var date = Utilities.formatDate(new Date(), "GMT+1", "MM/dd/yyyy HH:mm:ss")  ;
  
  var filteredTransactions = paymentTransactions.filter(function (el) {
    return el != null;
  });
  
  if (filteredTransactions.length == 0) {
    spreadsheet.getRange(1, 1).setValue("Nothing to display for " + fiscalYearLabel).setFontFamily("Cabin");
    return;
  }
  
  spreadsheet.getRange(1, 1, 1, 11).setValues(colHeader).setBackground("#7ADAEE").setFontFamily("Cabin");
  spreadsheet.getRange(2, 1, filteredTransactions.length, filteredTransactions[0].length).setValues(filteredTransactions).setFontFamily("Cabin");
  spreadsheet.setName("INVOICE REPORT:" +  fiscalYearLabel + "(" + date + ")");
  spreadsheet.sort(1, false);

  //DISPLAY COMPLETION MESSAGE
  activeSheet.toast("report completed...");
}
