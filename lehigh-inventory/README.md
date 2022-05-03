# ShelfListExportFromFOLIO

This project is one Java class that queries the FOLIO LDP (using call number ranges indicated in the file) and normalizes the call numbers so they can be sorted.  It outputs a delimited list which can be used to import into the inventory spreadsheet.

Note - The Java class in the initial commit is hardcoded to look for items in Linderman (library_id).  If you use this to inventory other locations, you will have to change the library id in the query.