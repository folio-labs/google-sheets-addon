# google-sheets-addon
Google Sheets add-on for FOLIO

The Google Apps Script platform can be used to create add-ons for Google apps (sheets, docs...)

The platform contains libraries that let you interact with APIs (and databases).  I think it could be useful for pulling data from FOLIO into Google Sheets using the FOLIO APIs.  It could supplement the FOLIO user interface (especially in early days of the application) or allow implementers to create custom functionality.

There are a couple of caveats to be aware of:

1. Google apps script code lives and runs on Google servers - so Google IP addresses.  If your FOLIO instance is behind a campus firewall you will have to work around this.  This could be by whitelisting the Google IP addresses (they provide a list) - maybe not ideal since they can change.  Another thought is using a server in the middle that could "proxy" requests from the Google servers to the FOLIO server.  The IP of the proxy could be whitelisted or that proxy could potentially live on a server that allows requests from outside of the campus firewall.

2. Google apps scripts does have a limit for running time.  For long running processes this platform is not ideal.


In this initial example the script retrieves every existing FOLIO permission and then makes additional API calls to determine who has been given each permissions (see screen shots below).  

It is built with two files code.gs (file that contains the logic) and sidebar.html (user interface/form).  As it is now, to use this add-on you have to pull the files into the script editor (from Google Sheets) and execute it.  

Moving forward, this add-on could be published to the "G-Suite Marketplace" which would allow anyone to easily install it directly from Google Sheets.  It could be expanded to include any needed functionality.  I just started with User Management/Permissions as an experiment.  At Lehigh we have published a Google Sheets add-on - MatchMarc - which calls an OCLC search API.  Publishing this add-on was fairly straightforward.

<br><br>
Screenshot:


![Screenshot of permissions add-on example](https://github.com/folio-labs/google-sheets-addon/blob/master/assets/screenShotPermissions.png "Addon Example")

