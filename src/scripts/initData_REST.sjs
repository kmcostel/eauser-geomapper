"use strict";

declareUpdate();

var keys = require("../private/keys.sjs");
var util = require("util.sjs");

var endpoint = keys.endpoint_REST;
var clientID = keys.clientID_REST;
var clientSecret = keys.clientSecret_REST;
var EA1programID = keys.EA1programID;
var EA2programID = keys.EA2programID;
var EA3programID = keys.EA3programID;
var EA4programID = keys.EA4programID;
var emailRecipient = keys.emailRecipient;

//switch out the values depending on what you want :)
var EA = {
  "programID": EA4programID,
  "version": "EA4"
};

// get access token (valid for 1 hour)

var auth = xdmp.httpGet(endpoint + "/identity/oauth/token?grant_type=client_credentials&client_id=" + clientID + "&client_secret=" + clientSecret);
var token = auth.toArray()[1].root.access_token;

// fields to be displayed (there are ~700 fields to choose from)
var listOfFields = "firstName,lastName,email,city,state,country,postalCode,company,Main_Industry__c,phone,Account_Type__c,address,DC_Employees__c,EA_ML9username,GEO_Region_Sub_Region__c,registeredforEAML8,HasAccessToEAML9,registeredforNoSQLforDummies,Registration_Date__c,Revenue_Range__c,Specific_Lead_Source__c,website,createdAt,updatedAt";

var completed = true;

var numUsers;

var duplicates = [];

try {
  var nextPageToken = "";

  numUsers = 0;

  // watch out for multiple users from Marketo that have the same email address
  var emailsProcessed = {};

  do {

    // returns a json response
    var res = xdmp.httpGet(endpoint + "/rest/v1/leads/programs/" + EA.programID + ".json?access_token=" + token + "&nextPageToken=" + nextPageToken + "&fields=" + listOfFields);

    nextPageToken = res.toArray()[1].root.nextPageToken;


    // process the data and insert it into MarkLogic
    var users = res.toArray()[1].root.result;

    xdmp.log("about to insert " + users.length + " documents");

    for (var i in users) {
      var json = util.convertToJson_REST(users[i], EA.version);

      json.geometry = util.addCoordinates(json);

      var email = json.fullDetails.email;

      // if we have reached the end of the list of users
      // and have started to go through things like length, xpath, toString...
      if (email === undefined) {
        break;
      }

      if (emailsProcessed[email]) {
        xdmp.log('Duplicate email: ' + email);
        duplicates.push(email);
      } else {

        numUsers++;

        // just in case... highly unlikely this will change anything though..
        email = util.removeSpaces("" + email, "+");

        // uri template for EA users
        var uri = "/users/" + email + ".json";

        var update = util.mergeRecords(json, uri);

        xdmp.documentInsert(uri, json);
        xdmp.log("  inserted " + email);

        emailsProcessed[email] = true;
      }

    }

  } while (nextPageToken && nextPageToken !== "")

  // create /config/systemInfo.json
    // numUsers, dateCreated, dateUpdated

  var systemInfo = {};
  systemInfo["appStartDate"] = fn.currentDateTime().add(xdmp.elapsedTime());;
  systemInfo["lastUpdated"] = fn.currentDateTime().add(xdmp.elapsedTime());;
  systemInfo["numDocuments"] = numUsers;

  xdmp.documentInsert("/config/systemInfo.json", systemInfo);
  xdmp.log("  inserted systemInfo.json");

  var features = {
    "MarkLogicFeatures": {
      "Data Integration": [
        "Entity Services",
        "Data Movement SDK",
        "Template Driven Extraction",
        "SQL Enhancements",
        "Optic API"
      ],
      "Security": [
        "Encryption",
        "Redaction",
        "Element-level Security"
      ],
      "Manageability": [
        "Ops Director",
        "New Relic Plugin"
      ],
      "Additional Enhancements": [
        "Geospatial",
        "Search",
        "Enhanced Tiered Storage",
        "JavaScript",
        "Query Console"
      ]
    }
  };

  xdmp.documentInsert("/config/features/MLFeatures.json", features);
  xdmp.log("  inserted MLFeatures.json");
}
catch(err) {
  xdmp.log("failed to ingest data");
  xdmp.log(err);
  completed = false;
}

// email status report

try {
  if (completed) {
    var timestamp = fn.formatDateTime(fn.currentDateTime().add(xdmp.elapsedTime()), "[M01]/[D01]/[Y0001] [H01]:[m01]:[s01] ");
    var content = "Completed data ingestion at " + timestamp + "\n\n";
    content += "Number of users: " + numUsers + "\n";
    if (duplicates.length > 0) {
      content += '\nDuplicate users: ' + fn.stringJoin(duplicates, ', ') + '\n\n';
    }
    content += util.getEmailSource();

    var message = {
      "from":{"name": "eauser-geomapper", "address": "eauser.geomapper@marklogic.com"},
      "to":{"name": emailRecipient.name, "address": emailRecipient.address},
      "subject": "EA tracker - success - initial data ingestion",
      "content": content
    };
    xdmp.email(message);
  }
  else {
    var timestamp = fn.formatDateTime(fn.currentDateTime().add(xdmp.elapsedTime()), "[M01]/[D01]/[Y0001] [H01]:[m01]:[s01] ");
    var content = "Failed data ingestion at " + timestamp + "\n\n";
    content += util.getEmailSource();

    var message = {
      "from":{"name":"eauser-geomapper", "address":"eauser.geomapper@marklogic.com"},
      "to":{"name": emailRecipient.name, "address": emailRecipient.address},
      "subject":"EA tracker - fail - initial data ingestion",
      "content": content
    };
    xdmp.email(message);
  }
}
catch (err) {
  xdmp.log("email status report failed to send");
}

xdmp.log("DONE");
