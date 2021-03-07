function onOpen() {
  SpreadsheetApp.getUi()
  .createMenu("TopMenu")
  .addItem('Set up FOLIO connection', 'showLogin')
  .addSeparator()
  .addSubMenu(SpreadsheetApp.getUi().createMenu('Acquisitions')
              .addItem('Reports', 'acqReports'))
  .addSubMenu(SpreadsheetApp.getUi().createMenu('Circulation')
              .addItem('Reports', 'circReports'))
  .addToUi();
}

function onInstall() {
  onOpen();
}

function getFiscalYears() {
  var selectedFiscalYear = PropertiesService.getUserProperties().getProperty('selectedFiscalYear');
  var tenant = PropertiesService.getUserProperties().getProperty('tenant');
  var okapi = PropertiesService.getUserProperties().getProperty('okapi');
  var userid = PropertiesService.getUserProperties().getProperty('userid');
  var password = PropertiesService.getUserProperties().getProperty('password');
  var response = auth(userid,password,tenant,okapi);
  if (response.getResponseCode() > 399) {
      Logger.log('failed authn for get fiscal years');
  }
  else {
      var token = response.getAllHeaders()["x-okapi-token"];
      var fiscalYearQuery = okapi + "/finance/fiscal-years?limit=30&offset=0&query=(cql.allRecords=1) sortby name/sort.ascending";
      var getHeaders = {
          "Accept" : "application/json",
         "x-okapi-tenant" : tenant,
         "x-okapi-token" : token
      };
      var getOptions = {
         'headers':getHeaders
      }
      var fiscalYearResponse = UrlFetchApp.fetch(fiscalYearQuery,getOptions);
      var fiscalYears = JSON.parse(fiscalYearResponse.getContentText()).fiscalYears;
      if (PropertiesService.getUserProperties().getProperty('currentFiscalYear') == null) {
        PropertiesService.getUserProperties().setProperty('currentFiscalYear',fiscalYears[0].id)
      }
      return fiscalYears;
   }

}

//DISPLAYS FOLIO ACQ REPORTS SIDEBAR
function acqReports() {
  var html = HtmlService.createHtmlOutputFromFile('acqReports')
      .setTitle('FOLIO Acquisition Reports');
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);    
}

//DISPLAYS FOLIO CONNECTION SIDEBAR
function showLogin() {
  var html = HtmlService.createHtmlOutputFromFile('login')
      .setTitle('Create FOLIO connection:');
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);    
}

//DISPLAY FOLIO CIRC REPORTS SIDEBAR
function circReports() {
  var html = HtmlService.createHtmlOutputFromFile('circReports')
      .setTitle('FOLIO Circulation Reports');
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);    
}
