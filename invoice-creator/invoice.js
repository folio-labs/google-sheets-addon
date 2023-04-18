class Invoice {

  constructor(vendorInvoiceNo) {
    this.vendorInvoiceNo = vendorInvoiceNo
    //this.invoiceDate = invoiceDate
    this.source="API";
    this.status="Open";
    this.currency="USD";
    this.paymentMethod = "Physical check";
    this.invoiceLines = []
  }

  
  addInvoiceLine(line) {
    this.invoiceLines.push(line)
  }
  
}
