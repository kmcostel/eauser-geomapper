var style = keys.mapboxStyle;
var token = keys.mapboxToken;

//Example GeoJson data, need to automate this with Marketo
var geojsonFeatures = [
  {
    "type": "Feature",
    "properties":
    {
      "name": "Coors Field",
      "amenity": "Baseball Stadium",
      "popupContent": "This is where the Rockies play!",
      "show_on_map": true, //used for filter, not using a filter currently
      "color": "#ff78f0"
    },
    "geometry":
    {
      "type": "Point",
      "coordinates": [-104.99404, 39.75621] //geojson so coordinates in long, lat
    }
  },
  {
    "type": "Feature",
    "properties":
    {
      "name": "Some Name",
      "amenity": "Baseball Stadium",
      "popupContent": "This is where the Rockies play!",
      "show_on_map": true, //used for filter, not using a filter, currently
      "color": "#ff7800"
    },
    "geometry":
    {
      "type": "Point",
      "coordinates": [-100.99404, 19.75621] //geojson so coordinates in long, lat
    }
  }
];


var map = L.map('mapid').setView([35.7, -83], 4);

var url = 'https://api.mapbox.com/styles/v1/liangdanica/' + style + '/tiles/256/{z}/{x}/{y}?access_token=' + token;

L.tileLayer(url,
{
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
  maxZoom: 18,
  id: 'Basic',
  accessToken: token
}).addTo(map);

//Initialize the FeatureGroup to store editable layers (shapes drawn by user)
// ref: http://leafletjs.com/2013/02/20/guest-post-draw.html
var drawnShapes = new L.FeatureGroup();
map.addLayer(drawnShapes);

//Initialize the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw({
  edit: { //allows editing/deleting of drawn shapes on map
    featureGroup: drawnShapes
  }, //https://github.com/Leaflet/Leaflet.draw/wiki/API-Reference#lcontroldraw
  draw: { //all shapes enabled by default
    polyline: false, //disable polylines
    marker: false, // disable markers
    circle: false // disable circles, additional code required to implement, not supported by geojson
  }
});
map.addControl(drawControl);

// Reference: https://github.com/Leaflet/Leaflet.draw
map.on('draw:created', function (e) {
  var type = e.layerType,
    layer = e.layer;

    // Store type of layer to know if it is a circle,
    // type is an unused property, so it will be used for this purpose
    layer.type = type;

  if (type === 'circle') { //Save the radius
    var radius = layer.getRadius();
    layer.radius = radius; //radius is in meters
  }
  else if (type === 'polygon') {
  }
  else if (type === 'rectangle') {
  }

  drawnShapes.addLayer(layer);
  doPost("/search.sjs", "name", processResults, drawnShapes, true, true);
});

map.on('draw:edited', function (e) {
  var layers = e.layers;
  layers.eachLayer(function (layer) {
    // loops over each edited layer
    // do whatever you want, most likely save back to db
  });
  doPost("/search.sjs", "name", processResults, drawnShapes, false, false);
});

map.on('draw:deleted', function (e) {
  // Update db to save latest changes.
  console.log(e);
  //e.removeTile(); //
  drawnShapes.removeLayer(e.layer);

});

function processResults(response) {
  // console.log(response);

  // console.log("Here is the response:");
  // console.log(response);
  // console.log("End of response!");
  displayGeoJSON(response);

  // console.log("ya gurl is hoping!111");
  // console.log(response[1].properties.features.facets);
  // console.log("2:");
  // console.log(response[1].properties.features);
  // console.log("3:");
  // console.log(response[1].features.facets);
  // console.log("work bitch");


  // console.log(response.features.facets);
  // displayFeatures(geojsonFeatures.features.facets);
console.log("wha:");
  displayFeatures(response.features.facets);

  console.log("huh:");
  console.log(features);
  displayFeatures(geojsonFeatures.properties.features);
  displayFeatures(response.properties.features);
  // console.log(response.industries.facets);
  // displayIndustries(response.industries.facets);
}

function displayFeatures(features) {
  console.log(features);
  var array = $.makeArray(features);
  //console.log(array);
  //TODO add features to drop down list on web page, div id = collapse2
  for (var obj in features.Features) {
    $("#collapse2 ul").append('<li class="list-group-item"><input id="id_' + obj.toString() + '" type="checkbox" value=""> '+ obj.toString() + '</li>');
  }

  //<li class="list-group-item"><input type="checkbox" value=""> Feature 1</li>
}

function displayIndustries(industries) {
  console.log(industries);
  var array = $.makeArray(industries);
  for (var obj in industries.Industries) {
    $("#collapse1 ul").append('<li class="list-group-item"><input id="id_' + obj.toString() + '" type="checkbox" value=""> '+ obj.toString() + '</li>');
  }

}

// function checkIfCheck() {
//   var array = $.makeArray(features);
//   for (var obj in features.Feature) {
//     if ($("#id_" + obj.toString()))
//   }
// }

// ****** Copied from Jen and Jake's geoapp ********
function doPost(url, str, success, drawnLayer, industries, features) {
  //clearResults();
  var payload = {
    searchString: str,
    //mapWindow is used for search if there are no drawn shapes on map
    mapWindow: [
      map.getBounds().getSouth(),
      map.getBounds().getWest(),
      map.getBounds().getNorth(),
      map.getBounds().getEast()
    ],
    searchRegions: drawnLayer.toGeoJSON(),
    industries: industries,
    features: features
  };

  
  $.ajax({
    type: "POST",
    url: url,
    data: JSON.stringify(payload),
    contentType: "application/json",
    dataType: "json",
    success: success,
    error: fail
  });
}

function fail(jqXHR, status, errorThrown) {
  console.log(status);
}

// Draw geojson data on map, data will originate from Marketo
function displayGeoJSON(geojsonFeatures) {
  //console.log("geojson success");
  console.log("below is geojsonFeatures:");
  console.log(geojsonFeatures);
  console.log("above here");
//  console.log(geojsonFeatures.features.facets);

  var layers = [];
  var geojsonLayer = L.geoJson(geojsonFeatures, {
    pointToLayer: function (feature, latlng) {
      return new L.CircleMarker(latlng, {radius: 6, fillOpacity: 0.85});
    },
    onEachFeature: function (feature, layer) {
      console.log("what is dis:");

      console.log(layer);

      console.log("AY0");
      console.log(feature);
      console.log("asdfghfd");
      // console.log(layer);

      layer.bindPopup(formatPopup(feature.properties));
/*      layer.on({
        remove: function(e) {
          console.log("removed");
        }
      });

*/    console.log("what is here:");
      layers.push(layer);
    },
    style: function(feature) {


          console.log("I DON'T THINK THIS BITCH BE WORKING");

      return {color: getColor(feature)};
    }
  });

  console.log("i don't even know man");
  map.addLayer(geojsonLayer);

}

// The brighter the red, the more ML features the EA user uses.
// 0 features is black circle marker
// 3+ creates a bright red circle marker
var getColor = function(f) {
  var numFeatures = 0;
  if (f.properties.features && f.properties.features.length) {
    numFeatures = f.properties.features.length;
  } // 57 + 66(3) = 255
  var red = 57 + 66 * numFeatures;
  // Color doesn't display correctly if > 255
  red = red > 255 ? 255 : red;
  //toString(16) converts number to base 16 string ex. 10 -> a
  var c = "#"+red.toString(16)+(50).toString(16)+(50).toString(16);

  return c;
}

function formatPopup(properties) {
  var str = "";
  if (!properties) return str;

  // EA User's name
  if (properties.name) {
    str += "<b>EA User:</b> " + properties.name;
    str += "<br>";
  }
  // EA User's company
  if (properties.company && properties.company !== "") {
    str += "<b>Company:</b> " + properties.company;
    str += "<br>";
  }
  // EA User's postal code
  if (properties.postalCode && properties.postalCode !== "") {
    str += "<b>Postal Code:</b> " + properties.postalCode;
    str += "<br>";
  }

  // Refer below for lists in HTML help
  // http://www.htmlgoodies.com/tutorials/getting_started/article.php/3479461
  // Features of ML9 the EA user listed they use when signing up for EA
  if (properties.features && properties.features.length >= 1) {
    console.log(properties.features);
    // Features used in ML9
    // ** Assuming properties.features will be string array of ML9 Features **
    str += "<b>Features:</b><UL>";
    for (var ndx in properties.features) {
      str += "<LI>" + properties.features[ndx];
    }
    str += "</UL>";
    str += "<br>";
  } else if (properties.features.length === 0) {
    str += "<b>Features:</b> None specified";
    str += "<br>";
  }

  return str;
}


// L.geoJson(foodIndustries).addTo(map);