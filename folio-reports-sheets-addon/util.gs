  //CONVIENCE METHODS USED TO SET, REMOVE &  RETREIVE PROPERTIES 
  
  function getStoredProperty(key) {
      return PropertiesService.getUserProperties().getProperty(key)      
  }
  
  function removeStoredProperty(key) {
    return PropertiesService.getUserProperties().deleteProperty(key)
  }
  
  function setStoredProperty(key,value) {
    PropertiesService.getUserProperties().setProperty(key, value)
  }