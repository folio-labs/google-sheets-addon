/*
  PROTOTYPE CREATED 2-10-2021
  AUTHOR: MS
  PURPOSE: POC - CREATE INVOICES FROM A LIST OF PURCHASE ORDERS
*/

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('BULK INVOICE POC')
    .addItem('1) Create template', 'createTemplate')
    .addItem('2) Lookup purchase orders', 'lookupPOs')
    .addItem('3) Create invoice(s)', 'payThese')
    .addToUi();
}

function onInstall() {
  onOpen();
}


function createTemplate() {

  var rand = Math.floor((Math.random() * 1000) + 1);
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActive();
  settingsSheet = spreadsheet.insertSheet();
  try {
    settingsSheet.setName("Invoices");
  }
  catch (err) {
    //IN CASE TAB WITH THIS NAME ALREADY EXISTS
    settingsSheet.setName("Invoices" + rand);
  }

  var outputRange = settingsSheet.getRange(1, 1, 37, 15);
  outputRange.getCell(1, 1).setValue("INVOICE DATE (yyyy-mm-dd):").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 2).setValue("PO ID:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 3).setValue("TITLE:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 4).setValue("VENDOR:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 5).setValue("ENCUMBERED:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 6).setValue("VENDOR INVOICE #:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 7).setValue("ACTUAL:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 8).setValue("SHIPPING:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 9).setValue("FEES:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 10).setValue("OTHER:").setFontWeight("bold").setBackground("#F5F5F5");
  outputRange.getCell(1, 11).setValue("FOLIO DOC LINK:").setFontWeight("bold").setBackground("#F5F5F5");
  //settingsSheet.autoResizeColumns(1, 15);
  //outputRange.setNumberFormat("@");
  settingsSheet.getRange(2, 1, 50, 1).setNumberFormat('yyyy-mm-dd');
  settingsSheet.setColumnWidth(1, 100);
  settingsSheet.getRange(1, 1).setWrap(true);
  settingsSheet.getRange(1, 1, 50, 50).setFontFamily('Cabin');



}

function authenticate() {
  let config = {
    environment: 'prod'
  }
  PropertiesService.getScriptProperties().setProperty("config", JSON.stringify(config));
  config.username = PropertiesService.getScriptProperties().getProperty("username");
  config.password = Utilities.newBlob(Utilities.base64Decode(
    PropertiesService.getScriptProperties().getProperty("password")))
    .getDataAsString();
  FOLIOAUTHLIBRARY.authenticateAndSetHeaders(config);
}

function payThese() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  //var range = sheet.getActiveRange()
  var range = sheet.getDataRange();
  range.setBackground('white')
  var firstRow = range.getRow()
  var numRows = range.getNumRows();
  Logger.log("firstRow " + firstRow);
  Logger.log("numRows " + numRows);


  var columnValues = range.getValues();

  authenticate();
  let config = JSON.parse(PropertiesService.getScriptProperties().getProperty("config"));

  //LOOP THROUGH EACH ROW

  var listOfInvoices = {}
  var listOfPos = {};
  for (var i = 1; i < numRows; i++) {
    var absoluteRow = firstRow + i;
    Logger.log("absoluteRow " + absoluteRow);
    vendorInvoiceNumber = range.getCell(i + 1, 6).getValue();
    Logger.log(vendorInvoiceNumber);

    poNumber = range.getCell(i + 1, 2).getValue();

    var poQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/orders/composite-orders?limit=30&query=(poNumber==" + poNumber + ")"
    Logger.log(poQuery)
    let getOptions = FOLIOAUTHLIBRARY.getHttpGetOptions();
    var onePoQueryResults = UrlFetchApp.fetch(poQuery, getOptions);
    var aPo = JSON.parse(onePoQueryResults.getContentText());
    Logger.log(aPo.purchaseOrders[0].vendor);


    purchaseOrderUuid = aPo.purchaseOrders[0].id;
    var poLineQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/orders/order-lines?limit=30&query=(purchaseOrderId==" + purchaseOrderUuid + ")";
    //var poLineQuery = baseOkapi + "/orders/order-lines?limit=30&query=(poNumber='" + poNumber  +"')";
    Logger.log(poLineQuery)

    var poLineResults = UrlFetchApp.fetch(poLineQuery, getOptions);
    Logger.log(poLineResults);
    var onePoLine = JSON.parse(poLineResults.getContentText()).poLines[0];
    Logger.log(onePoLine);


    //save for later
    listOfPos[onePoLine.id] = poNumber;




    if (listOfInvoices[vendorInvoiceNumber] == null) {
      //CREATE INVOICE AND ADD IT TO THE LIST
      var newInvoice = new Invoice(vendorInvoiceNumber);
      newInvoice.invoiceDate = range.getCell(i + 1, 1).getValue();



      newInvoice.vendorId = aPo.purchaseOrders[0].vendor;
      listOfInvoices[vendorInvoiceNumber] = newInvoice;

    }



    //GET THE INFORMATION ABOUT THE INVOICE LINE
    var amount = range.getCell(i + 1, 7).getValue();
    var shipping = range.getCell(i + 1, 8).getValue();
    var fees = range.getCell(i + 1, 9).getValue();
    var otherAdj = range.getCell(i + 1, 10).getValue();
    var poNumber = range.getCell(i + 1, 2).getValue();
    var invoiceLine = new InvoiceLine(onePoLine);

    Logger.log("BEFORE--->" + JSON.stringify(invoiceLine))
    if (invoiceLine.fundDistributions[0] != null && invoiceLine.fundDistributions[0].code == null) {
      var fundQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
        "/finance/funds/" + onePoLine.fundDistribution[0].fundId;
      Logger.log(fundQuery);
      var fundResults = UrlFetchApp.fetch(fundQuery, getOptions);
      Logger.log("FOUND CODE FOUND---->" + fundResults);
      var aFund = JSON.parse(fundResults.getContentText()).fund;
      var fundCode = aFund.code;
      Logger.log("ADDING THIS FUND CODE--> " + fundCode);
      invoiceLine.fundDistributions[0].code = fundCode;

    }
    Logger.log("AFTER--->" + JSON.stringify(invoiceLine))

    //IF THE INVOICE LINE CONTAINS NO FUND DISTRIBUTIONS,
    //THE PO MAY NOT HAVE HAD ANY (E.G. ONGOING)
    //LOOK FOR A TAG THAT STARTS WITH 
    //ADDED 3-19-21
    if (invoiceLine.fundDistributions == null || invoiceLine.fundDistributions.length == 0) {
      if (onePoLine.tags == null) {
        SpreadsheetApp.getUi().alert("PO Line Number " + onePoLine.poLineNumber + " has no tags, so this will fail; check that Fund Distribution is assigned.");
      }
      var tags = onePoLine.tags.tagList;
      for (var tag in tags) {
        if (tags[tag].includes("fund-") || tags[tag].includes("FUND-")) {
          Logger.log("found a tag");
          var tagArray = tags[tag].split("-");
          var fundCode = tagArray[1];
          Logger.log("USING FUND CODE: " + fundCode);
          var fundQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
            "/finance/funds?limit=1000&query=(code=" + fundCode + ")";
          Logger.log(fundQuery);
          var fundResults = UrlFetchApp.fetch(fundQuery, getOptions);
          Logger.log("FOUND CODE FOUND---->" + fundResults);
          var aFund = JSON.parse(fundResults.getContentText()).funds[0];
          var fundDist = {};
          fundDist["code"] = fundCode;
          fundDist["fundId"] = aFund.id;
          fundDist["distributionType"] = "percentage";
          fundDist["value"] = 100.0
          var fundDistributions = [];
          fundDistributions.push(fundDist);
          invoiceLine.fundDistributions = fundDistributions;
        }
      }
    }


    if (!range.getCell(i + 1, 7).isBlank()) {
      invoiceLine.subTotal = amount;
    }
    else {
      invoiceLine.subTotal = onePoLine.cost.poLineEstimatedPrice;
    }
    if (!range.getCell(i + 1, 8).isBlank()) invoiceLine.addAdjustment(new Adjustment("shipping", shipping));
    if (!range.getCell(i + 1, 9).isBlank()) invoiceLine.addAdjustment(new Adjustment("fees", fees));
    if (!range.getCell(i + 1, 10).isBlank()) invoiceLine.addAdjustment(new Adjustment("other", otherAdj));


    (listOfInvoices[vendorInvoiceNumber]).addInvoiceLine(invoiceLine);

  }

  Logger.log(listOfInvoices);

  //INSERT NEW INVOICES AND LINES
  for (var invoice in listOfInvoices) {

    //INSERT INVOICE
    var invoiceToInsert = listOfInvoices[invoice];
    var invoiceLines = invoiceToInsert.invoiceLines;
    delete invoiceToInsert.invoiceLines;


    //POST INVOICE
    var createInvoiceQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment)
      + '/invoice/invoices';
    let postHeaders = FOLIOAUTHLIBRARY.getHttpPostHeaders();
    var postOptions = {
      'headers': postHeaders,
      'method': 'post',
      "payload": JSON.stringify(invoiceToInsert)
    }
    Logger.log("--->" + invoiceLines)

    var createdInvoiceResponse = UrlFetchApp.fetch(createInvoiceQuery, postOptions)
    var createdInvoice = JSON.parse(createdInvoiceResponse.getContentText());

    //INSERT EACH INVOICE LINE
    for (var i = 0; i < invoiceLines.length; i++) {
      Logger.log("invoice line loop-->" + JSON.stringify(invoiceLines[i]))
      var invoiceLine = invoiceLines[i];
      invoiceLine.invoiceId = createdInvoice.id;
      postOptions = {
        'headers': postHeaders,
        'method': 'post',
        "payload": JSON.stringify(invoiceLine)
      }
      Logger.log("INVOICE LINE");
      Logger.log(JSON.stringify(invoiceLine));
      var invoiceLineCreateQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
        '/invoice/invoice-lines'
      var createdInvoiceLineResponse = UrlFetchApp.fetch(invoiceLineCreateQuery, postOptions)

      Logger.log("LIST OF POS " + JSON.stringify(listOfPos));
      //var poNo = listOfPos[invoiceLine.poLineId];
      Logger.log("LOOKING FOR: " + listOfPos[invoiceLine.poLineId]);
      var searchResult = findInRow(listOfPos[invoiceLine.poLineId], range)
      Logger.log("search result" + searchResult);
      //var searchResult = columnValues.findIndex(createdInvoice.vendorInvoiceNo);
      range.getCell(searchResult, 11).setValue(
        FOLIOAUTHLIBRARY.getBaseFolio(config.environment) + "/invoice/view/" + createdInvoice.id);


    }

    Logger.log(JSON.stringify(createdInvoice));




  }
}

function findInRow(data, range) {

  var rows = range.getValues();

  for (var r = 0; r < rows.length; r++) {
    if (rows[r].join("#").indexOf(data) !== -1) {
      return r + 1;
    }
  }

  return -1;

}


function lookupPOs() {

  var ordersEndPoint = "/orders/composite-orders?limit=30&query=(poNumber={poNumber})";
  var ui = SpreadsheetApp.getUi();

  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var range = sheet.getDataRange();
  //var range = sheet.getActiveRange()
  range.setBackground('white')
  var firstRow = range.getRow()
  var numRows = range.getNumRows();
  Logger.log("firstRow " + firstRow);
  Logger.log("numRows " + numRows);

  authenticate();
  let config = JSON.parse(PropertiesService.getScriptProperties().getProperty("config"));

  let headers = FOLIOAUTHLIBRARY.getHttpGetHeaders();
  let getOptions = FOLIOAUTHLIBRARY.getHttpGetOptions();

  for (var i = 1; i < numRows; i++) {
    var absoluteRow = firstRow + i;
    Logger.log("absoluteRow " + absoluteRow);
    poNumber = range.getCell(i + 1, 2).getValue();
    // poLineAmount = range.getCell(i+1, 14).getValue();
    //Logger.log(range.getCell(absoluteRow, 14));
    //outputRange.getCell(i+2,1).setValue(poLineNumber).setBackgroundColor("#EAEAEA")
    //outputRange.getCell(i+2,2).setNumberFormat("###,##00.00").setValue(poLineAmount).setBackgroundColor("#EAEAEA")
    //outputRange.getCell(i+2,3).setNumberFormat("###,##00.00").setValue(poLineAmount)

    var poQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/orders/composite-orders?query=(poNumber=" + poNumber + ")";
    var poResponse = UrlFetchApp.fetch(poQuery, getOptions);
    var poCollection = JSON.parse(poResponse.getContentText()).purchaseOrders;
    if (poCollection.length == 0) {
      ui.alert("po not found " + poNumber);
      //todo fill in not found - into sheet
      continue;
    }
    Logger.log(poCollection[0]);
    var po = poCollection[0];
    var vendorUuid = po.vendor;
    var poUuid = po.id;
    //GET THE LINE
    var poLinQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/orders/order-lines?query=(purchaseOrderId=" + poUuid + ")";
    var poLineResponse = UrlFetchApp.fetch(poLinQuery, getOptions);
    var poLineCollection = JSON.parse(poLineResponse.getContentText()).poLines;
    Logger.log(poLineCollection[0]);
    var poLine = poLineCollection[0];
    var title = poLine.titleOrPackage;
    var encumbered = poLine.cost.poLineEstimatedPrice;
    Logger.log(encumbered);

    //GET THE VENDOR
    var vendorQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/organizations/organizations/" + vendorUuid;
    Logger.log(vendorQuery);
    var vendorResonse = UrlFetchApp.fetch(vendorQuery, getOptions);
    var vendor = JSON.parse(vendorResonse.getContentText());
    Logger.log(vendor);

    //IS THIS PO LINE ALREADY ATTACHED TO AN INVOICE
    var invoiceQuery = FOLIOAUTHLIBRARY.getBaseOkapi(config.environment) +
      "/invoice/invoice-lines?query=(poLineId=" + poLine.id + ")";
    var invoiceResponse = UrlFetchApp.fetch(invoiceQuery, getOptions);
    var invoices = JSON.parse(invoiceResponse.getContentText());

    //WRITE THE PO INFO TO THE ROW
    range.getCell(i + 1, 3).setValue(title);
    range.getCell(i + 1, 4).setValue(vendor.name);
    range.getCell(i + 1, 5).setValue(encumbered);

    if (invoices.totalRecords > 0) {
      range.getCell(i + 1, 2).setBackground('red');
    }





  }
  var currentSelection = SpreadsheetApp.getActiveSheet();
  //currentSelection.autoResizeColumns(1, 15);
  //currentSelection.setColumnWidth(3, 300);



}