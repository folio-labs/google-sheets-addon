class InvoiceLine {

  constructor(poLine) {
    this.invoiceLineStatus = "Open"
    this.quantity = 1;
    this.adjustments = []
    this.comment = poLine.poLineDescription
    this.description = poLine.titleOrPackage
    this.fundDistributions = poLine.fundDistribution;
    this.total = poLine.cost.poLineEstimatedPrice;
    this.tags = poLine.tags;
    this.poLineId = poLine.id;
  
  }

  
  addAdjustment(adj) {
    this.adjustments.push(adj)
  }
  
  
}
