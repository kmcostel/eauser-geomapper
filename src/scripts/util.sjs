
var keys = require("../private/keys.sjs");

// Google Maps Geocoder 
var geocoderKey = keys.geocoderKey;

// Marketo 
var endpoint = keys.endpoint;
var userID = keys.userID;
var secretkey = keys.secretkey;


// Calls the Google Maps geocoding api, and returns the lat/long associated with a postal code in a certain country
var getCoord = function(postalCode, country) {

  var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + postalCode + "%20" + country + "&key=" + geocoderKey;
  
  // need to remove spaces from the url
  var noSpacesArray = url.split(" ");

  var noSpaceUrl = "";
  
  for (var i = 0; i < noSpacesArray.length; i++) {
    if (i == 0) {
      noSpaceUrl = noSpacesArray[0];
      continue;
    }
    noSpaceUrl = noSpaceUrl + "%20" + noSpacesArray[i];
  }
  
  var res = xdmp.httpGet(noSpaceUrl);

  try {
    var point = res.toArray()[1].root.results[0].geometry.location;
    var lat = point.lat;
    var long = point.lng;
    return [lat, long];
  }
  catch (err) {
    return null;
  }
};


// takes a leadRecord from Marketo and transforms it into GeoJSON
var convertToJson = function(record) {
  
  var preview = {};
  
  // preview fields
  preview["firstname"] = record.xpath("./leadAttributeList/attribute[attrName = 'FirstName']/attrValue/fn:string()");
  preview["lastname"] = record.xpath("./leadAttributeList/attribute[attrName = 'LastName']/attrValue/fn:string()");
  preview["email"] = record.xpath("./Email/fn:string()");
  preview["city"] = record.xpath("./leadAttributeList/attribute[attrName = 'City']/attrValue/fn:string()");
  preview["state"] = record.xpath("./leadAttributeList/attribute[attrName = 'State']/attrValue/fn:string()");
  preview["industry"] = record.xpath("./leadAttributeList/attribute[attrName = 'Main_Industry__c']/attrValue/fn:string()");
  preview["company"] = record.xpath("./leadAttributeList/attribute[attrName = 'Company']/attrValue/fn:string()");

  // full detail fields
  var properties = {};
  //properties["leadScore"] = record.xpath("./leadAttributeList/attribute[attrName = 'LeadScore']/attrValue/fn:string()");
  //properties["leadSource"] = record.xpath("./leadAttributeList/attribute[attrName = 'LeadSource']/attrValue/fn:string()");
  //properties["markLogicContactEmail"] = record.xpath("./leadAttributeList/attribute[attrName = 'markLogicContactEmail']/attrValue/fn:string()");
  properties["phone"] = record.xpath("./leadAttributeList/attribute[attrName = 'Phone']/attrValue/fn:string()");
  properties["accountType"] = record.xpath("./leadAttributeList/attribute[attrName = 'Account_Type__c_lead']/attrValue/fn:string()");
  properties["address"] = record.xpath("./leadAttributeList/attribute[attrName = 'Address']/attrValue/fn:string()");
  properties["country"] = record.xpath("./leadAttributeList/attribute[attrName = 'Country']/attrValue/fn:string()");
  properties["numEmployees"] = record.xpath("./leadAttributeList/attribute[attrName = 'DC_NoOfEmp__c']/attrValue/fn:number()");
  properties["username"] = record.xpath("./leadAttributeList/attribute[attrName = 'EA_ML9username']/attrValue/fn:string()")
  properties["region"] = record.xpath("./leadAttributeList/attribute[attrName = 'GEO_Region_Sub_Region__c']/attrValue/fn:string()");
  properties["hasAccessToEAML9"] = fn.boolean(record.xpath("./leadAttributeList/attribute[attrName = 'HasAccessToEAML9']/attrValue")); //// test this
  properties["postalCode"] = record.xpath("./leadAttributeList/attribute[attrName = 'PostalCode']/attrValue/fn:string()");
  properties["registeredForEAML8"] = fn.boolean(record.xpath("./leadAttributeList/attribute[attrName = 'registeredforEAML8']/attrValue")); /////
  properties["registeredForNoSQLforDummies"] = fn.boolean(record.xpath("./leadAttributeList/attribute[attrName = 'registeredforNoSQLforDummies']/attrValue")); /////
  properties["registrationDate"] = record.xpath("./leadAttributeList/attribute[attrName = 'Registration_Date__c']/attrValue/fn:string()");
  properties["revenueRange"] = record.xpath("./leadAttributeList/attribute[attrName = 'Revenue_Range__c']/attrValue/fn:string()");
  properties["leadSource"] = record.xpath("./leadAttributeList/attribute[attrName = 'Specific_Lead_Source__c']/attrValue/fn:string()");
  properties["website"] = record.xpath("./leadAttributeList/attribute[attrName = 'Website']/attrValue/fn:string()"); // taken from email address


  var doc = {};

  doc["type"] = "Feature";
  doc["preview"] = preview;
  doc["fullDetails"] = properties;

  //full copy of the leadRecord XML doc
  doc["source"] = record.xpath(".")
  
  var coord = getCoord(properties.postalCode, properties.country);
  
  doc["geometry"] = {
    "type": "Point",
    "coord": coord
  };

  return doc;
};


// Marketo SOAP requests

// getLead -> returns a single lead from Marketo (xml) or null
//  need to search by Email address (for now at least.)
var marketoGetLead = function(email) {

  var timestamp = fn.currentDateTime();
  var message = "" + timestamp + userID;
  var signature = xdmp.hmacSha1(secretkey, message);

  var options = xdmp.quote(
    "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ns1=\"http://www.marketo.com/mktows/\"><SOAP-ENV:Header><ns1:AuthenticationHeader><mktowsUserId>"
    + userID 
    + "</mktowsUserId><requestSignature>"
    + signature 
    + "</requestSignature><requestTimestamp>"
    + timestamp 
    + "</requestTimestamp></ns1:AuthenticationHeader></SOAP-ENV:Header><SOAP-ENV:Body><ns1:paramsGetLead><leadKey><keyType>"
    + "EMAIL" 
    + "</keyType><keyValue>"
    + email
    + "</keyValue></leadKey></ns1:paramsGetLead></SOAP-ENV:Body></SOAP-ENV:Envelope>"
  );

  var result = xdmp.httpPost(endpoint, 
    {
     "data" : options
    }
  );

  var test = result.toArray()[1].xpath("/*:Envelope/*:Body/*:successGetLead/result/leadRecordList/leadRecord");

  var leadRecord = test.toArray()[0];
  leadRecord.xpath(".");

  return leadRecord;

};

// getMultipleLeads
//
//..
//..
//.. Still waiting.. :'(
//

module.exports{
  "convertToJson": convertToJson,

  //getCoord might not be necessary..
  "getCoord": getCoord,

  "marketoGetLead": marketoGetLead
}

