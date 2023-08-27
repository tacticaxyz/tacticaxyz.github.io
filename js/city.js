$(document).ready(function () {
    
    Initialize();
});

// Global variables.
var isWorking = false;
var citiesList =  [];
var markersList = [];
var linesList = [];
var mymap = {};
var popup = {};
var suggestedCity = {};
var cityFoundByIP = false;

// Global constants.
var MAX_CITIES = 6;

const useNoServer = true;

var baseApiUrl = "https://tactica.xyz"; // "http://f2eadc198999.ngrok.io"; // "https://localhost:4431"

var getCityInfo = useNoServer ?
	/* Example:
	http://api.geonames.org/searchJSON?username=optiklab&maxRows=1&q=Madrid
	{
		"totalResultsCount": 3843,
		"geonames": [
			{
				"adminCode1": "29",
				"lng": "-3.70256",
				"geonameId": 3117735,
				"toponymName": "Madrid",
				"countryId": "2510769",
				"fcl": "P",
				"population": 3255944,
				"countryCode": "ES",
				"name": "Madrid",
				"fclName": "city, village,...",
				"adminCodes1": {
					"ISO3166_2": "MD"
				},
				"countryName": "Spain",
				"fcodeName": "capital of a political entity",
				"adminName1": "Madrid",
				"lat": "40.4165",
				"fcode": "PPLC"
			}
		]
	}
	*/
	"http://api.geonames.org/searchJSON?username=optiklab&maxRows=1&q=" :
	baseApiUrl + "/Cities/GetCityInfo/";
	
var suggestCitiesApi = useNoServer ? 
	/* Example:
	http://api.geonames.org/searchJSON?username=optiklab&maxRows=10&q=Madrid
	{
		"totalResultsCount": 3843,
		"geonames": [
			{
				"adminCode1": "29",
				"lng": "-3.70256",
				"geonameId": 3117735,
				"toponymName": "Madrid",
				"countryId": "2510769",
				"fcl": "P",
				"population": 3255944,
				"countryCode": "ES",
				"name": "Madrid",
				"fclName": "city, village,...",
				"adminCodes1": {
					"ISO3166_2": "MD"
				},
				"countryName": "Spain",
				"fcodeName": "capital of a political entity",
				"adminName1": "Madrid",
				"lat": "40.4165",
				"fcode": "PPLC"
			},
			...
		]
	}
	*/
	"http://api.geonames.org/searchJSON?username=optiklab&maxRows=10&q=" : 
	baseApiUrl + "/Cities/GetCitySuggested/";

var getCityByIp =  useNoServer ? 
	/*
	Examples:
	  https://api.ipinfodb.com/v3/ip-city/?key=debfc7c448e8b9d818084949fa23db2382f2488fbfd52e805a3e059091c65d8b&ip=178.76.194.158&format=json
	  https://api.ipinfodb.com/v3/ip-city/?key=debfc7c448e8b9d818084949fa23db2382f2488fbfd52e805a3e059091c65d8b&ip=172.168.12.78&format=json
	Response:
	  statusCode	"OK"
	  statusMessage	""
	  ipAddress	"172.64.236.93"
	  countryCode	"ES"
	  countryName	"Spain"
	  regionName	"Madrid, Comunidad de"
	  cityName	"Madrid"
	  zipCode	"28013"
	  latitude	"40.4168"
	  longitude	"-3.68473"
	  timeZone	"+02:00"
	*/
	"https://api.ipinfodb.com/v3/ip-city/?key=debfc7c448e8b9d818084949fa23db2382f2488fbfd52e805a3e059091c65d8b&ip=" : 
	baseApiUrl + "/Cities/GetCityByIp/";

/*
http://api.geonames.org/timezoneJSON?username=optiklab&lng=-75.499901&lat=43.000351
{
	"sunrise": "2023-05-21 05:33",
	"lng": -75.499901,
	"countryCode": "US",
	"gmtOffset": -5,
	"rawOffset": -5,
	"sunset": "2023-05-21 20:24",
	"timezoneId": "America/New_York",
	"dstOffset": -4,
	"countryName": "United States",
	"time": "2023-05-21 15:55",
	"lat": 43.000351
}
*/
var timeZonesApi = "http://api.geonames.org/timezoneJSON?username=optiklab&";

var mapBoxApi = "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}";
var mapBoxAccessToken = "pk.eyJ1Ijoib3B0aWtsYWIiLCJhIjoiVVBwQ2RBVSJ9.W5EjzQwd_mg0sozy41Xszw";

// Constants with errors descriptions.
var MIN_CITIES_LIMIT = "Leave at least one city!";
var DUPLICATE_CITY = "Already in the list!";
var NOT_ALLOWED_MORE_CITIES = "Sorry! You can add up to " + MAX_CITIES + " cities!";
var JS_ERROR = "Something bad happened! Data corrupted! Please, reload the page (or clear cookies if dones't help)!";
var PLEASE_WAIT = "Another operation is in progress!";
var OBJECT_NOT_FOUND = "Object not found!";
var DATA_NOT_AVAILABLE = "Critical data required for plugin is not available!";


function Initialize() {    

    // Init map controls.
    mymap = L.map('mapid').setView([51.505, -0.09], 13);
    popup = L.popup();
    mymap.on('click', onMapClick);
    
    L.tileLayer(mapBoxApi, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 3,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: mapBoxAccessToken
    }).addTo(mymap);
    
    // Load cities.
    $(".suggested-city").on('click', addSuggestedCity);

    loadInitialCities();
    assignCityControls();
    
    //var shareDescription = 'It looks like today you are at ' + $('.activeLocation > .selectedContent').text();
}

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(mymap);
}

function addSuggestedCity() {
    
    if (suggestedCity && cityFoundByIP) {
        
        addCityToList(suggestedCity);
    }
}

function addCityToList(city) {

    if (isWorking) {
        isWorking = false;
        ShowError(PLEASE_WAIT);
        return;
    }
    
    if (citiesList.length >= MAX_CITIES) {

        ShowError(NOT_ALLOWED_MORE_CITIES);
        return;
    }
    
    if (!city.woeid) {
        $.getJSON(getCityInfo + city.city,
            function(json) {

                if (!json) {
                
                    LogError(DATA_NOT_AVAILABLE);
                    return;
                }

                city.woeid = json.woeid;
                city.lat = json.lat;
                city.long = json.long;
                city.country = json.country;
				
				$.ajax({
				  dataType: "json",
				  url: timeZonesApi + 'lng=' + city.long + '&lat=' + city.lat,
				  async: false, 
				  success: function(json) {
					if (!json) {
					
						LogError(DATA_NOT_AVAILABLE);
						return;
					}

					city.gmtOffset = json.gmtOffset;
					city.rawOffset = json.rawOffset;
					city.timezoneId = json.timezoneId;
					city.dstOffset = json.dstOffset;
					city.time = json.time;
					console.log("Timezone received: " + json.timezoneId);
				  }
				});
                console.log("TacTicA: Successfully retrieved full city info: " + city.woeid + ", " + city.city + ", " + city.country);
                
                // Check if no duplicates.
                for (var i = 0; i < citiesList.length; i++) {

                    if (city.woeid == citiesList[i].woeid) {
                        
                        ShowError(DUPLICATE_CITY);
                        return;
                    }
                }
                
                addCityToListNoChecks(city);
            });
    }
    
    if (!city.woeid) {
        return;
    }
    
    // Check if no duplicates.
    for (var i = 0; i < citiesList.length; i++) {

        if (city.woeid == citiesList[i].woeid) {
            
            ShowError(DUPLICATE_CITY);
            return;
        }
    }
    
    addCityToListNoChecks(city);
}

function addCityToListNoChecks(city) {

    isWorking = true;

    try {

        citiesList.push(city);
        window.localStorage.setItem('tacticaState', JSON.stringify(citiesList));
        
        // Add to the map.
        var marker = L.marker([city.lat, city.long]).addTo(mymap);
        marker.bindPopup(city.city + ', ' + city.country + '; ' + city.gmtOffset + ' GMT; Current time: ' + city.time).openPopup();
        markersList.push(marker);
        
        // Add lines between all points.
        var latlngs = [];
        for (var i = 0; i < citiesList.length; i++) {

            latlngs.push([citiesList[i].lat,citiesList[i].long]);
        }
        var polyline = L.polyline(latlngs, {color: 'red'}).addTo(mymap);
        mymap.fitBounds(polyline.getBounds()); // zoom the map to the polyline
        linesList.push(polyline);
        
        addCityToUIList(city, true);
    } catch (e) {

            
        isWorking = false;
        LogError(e);
    }
    
    isWorking = false;
}

// Loads city on document ready.
function loadInitialCities() {
    
    tacticaState =  JSON.parse(window.localStorage.getItem('tacticaState'));
    
    if (tacticaState) {
    
        try {

            for (var i = 0; i < tacticaState.length; i++) {

                addCityToList(tacticaState[i]);
            }
        } catch (e) {

            LogError(e);
        }
    }

    findCityByIPAddress();
}

function findCityByIPAddress() {
    
    // Try to find out user IP and get his location.
    $.getJSON('https://api.hostip.info/get_json.php')
        .done(
            function (data) {
            if (data && data.ip) {
                $('.suggested-city').text("You IP: " + data.ip);
                
                var searchIp = useNoServer ? 
                  data.ip : 
                  data.ip.replace('.','_').replace('.','_').replace('.','_');
                var urlToRequest = useNoServer ? 
                  getCityByIp + searchIp + '&format=json' : 
                  getCityByIp + searchIp;
                
                $.ajax({
                    method: 'get',
                    url: urlToRequest,
                    contentType: "application/javascript; charset=utf-8",
                    dataType: "jsonp",
                    success: function (location) {
						  
                        if (location && location.countryName && location.cityName) {
                            
                            $('.suggested-city').text("..." + location.cityName + ', ' + location.countryName + '...');
                            
                            $.ajax({
                                method: 'get',
                                url: getCityInfo + location.cityName,
                                contentType: "application/json; charset=utf-8",
                                success: function (json) {
                                    
                                    if (!json || 
                                        (useNoServer && !json.geonames) ||
                                        (!useNoServer && !json.woeid)) {
                                    
                                        LogError(DATA_NOT_AVAILABLE);
                                        
                                        initializeIfEmpty();
                                        return;
                                    }

                                    if (useNoServer) { 
                                      suggestedCity.woeid = json.geonames[0].geonameId;
                                      suggestedCity.city = json.geonames[0].name; // We requested city
                                      suggestedCity.country = json.geonames[0].countryId;

                                    } else {
                                      suggestedCity.woeid = json.woeid;
                                      suggestedCity.city = json.city;
                                      suggestedCity.country = json.country;
                                    }
                                    
                                    if (!initializeIfEmpty(suggestedCity)) {
                                    
                                        $('.suggested-city').text("add " + suggestedCity.city + ', ' + suggestedCity.country + '?');
                                    }
                                    
                                    cityFoundByIP = true;
                                },
                                error: function (error) {
                                    $('.suggested-city').text("");
                                    initializeIfEmpty();
                                }
                            });
                        } else {
                            $('.suggested-city').text("");
                            console.log("Error! Location by IP was not detected, sorry!");
                            initializeIfEmpty();
                        }
                    },
                    error: function (error) {
                        $('.suggested-city').text("");
                        console.log("Error! Location by IP was not detected, sorry!");
                        initializeIfEmpty();
                    }
                });
            } else {
                $('.suggested-city').text("");
                console.log("Can't detect your IP, sorry!");
                initializeIfEmpty();
            }
        })
        .fail(function () {
            $('.suggested-city').text("");
            console.log("Can't detect your IP, sorry!");
            initializeIfEmpty();
        });
}

// Assign events handlers for city/location controls.
function assignCityControls() {
    
    $('#city-location').autocomplete({
        source: function (request, response) {

            var cityName = request.term;
            if (cityName && cityName.length > 0) {
                
                $.getJSON(suggestCitiesApi + cityName,
                    function(json) {
                        if (!json) {
                        
                            LogError(DATA_NOT_AVAILABLE);
                            return;
                        }

                        var cities = [];
                        if (useNoServer) {
                          for (var index = 0; index < json.geonames.length; index++) {

                            var geoObject = json.geonames[index];
                            var city = new Object();
                            city.city = geoObject.name;
                            city.country = geoObject.countryCode;
                            city.woeid = geoObject.geonameId;
                            city.lat = geoObject.lat;
                            city.long = geoObject.lng;
							
							$.ajax({
							  dataType: "json",
							  url: timeZonesApi + 'lng=' + city.long + '&lat=' + city.lat,
							  async: false, 
							  success: function(json) {
								if (!json) {
								
									LogError(DATA_NOT_AVAILABLE);
									return;
								}

								city.gmtOffset = json.gmtOffset;
								city.rawOffset = json.rawOffset;
								city.timezoneId = json.timezoneId;
								city.dstOffset = json.dstOffset;
								city.time = json.time;
								console.log("Timezone received: " + json.timezoneId);
							  }
							});

                            cities.push(city);
                          }
                          response(cities);
                        } else {
                          for (var index = 0; index < json.cities.length; index++) {

                            var geoObject = json.cities[index];
                            cities.push(geoObject);
                          }
                          response(cities);
                        }
                });
            }
        },
        select: function (event, ui) {

            var geoObject = ui.item;
            
            addCityToList(geoObject);

            return false;
        }
    })
    // Creates autocomplete list items presentation.
    .autocomplete('instance')._renderItem = function (ul, geoObject) {
        return $('<li>')
          .append('<a>' + geoObject.country + '&nbsp' + geoObject.city + '</a>')
          .appendTo(ul);
    };
}

function initializeIfEmpty(city) {
 
    if (!citiesList || citiesList.length == 0) {
        
        if (city) {
            
            addCityToList(city);
            
        } else {
        
            city = new Object();
            city.city = "San Francisco"; // Default city
            city.country = "US";
            city.woeid = "5391959";
            city.lat = "37.774929";
            city.long = "-122.419418";
			city.gmtOffset = -8;
			city.rawOffset = -8;
			city.timezoneId = "America/Los_Angeles";
			city.dstOffset = -7;
			city.time = "2023-05-21 13:03";
            addCityToList(city);
        }
        
        return true;
    } 
    
    return false;
}

// Adds new location into list of locations.
function addCityToUIList(cityToAdd, selectActive) {    

    isWorking = true;
    try {

        var fullLocationName = cityToAdd.city + ', ' + cityToAdd.country + '; ' + cityToAdd.gmtOffset + ' GMT; Current time: ' + cityToAdd.time
        // Create Location element by copying from Template.
        var selectedLocationElem = document.getElementById('SelectedLocation');
        var newSelectedLocationElem = selectedLocationElem.cloneNode(true);
        newSelectedLocationElem.id = newSelectedLocationElem.id + guid();
        newSelectedLocationElem.style.display = "block";
        newSelectedLocationElem.setAttribute('woeid', cityToAdd.woeid);
        
        $('#SelectedLocationContainer').append(newSelectedLocationElem);
        
        var el = $("#" + newSelectedLocationElem.id + ' > .selectedContent');
        el.text(fullLocationName);
        
        $('#city-location').val('');

        if (selectActive) {            
            
            SetActiveLocation(newSelectedLocationElem);
        }

    } catch (e) {

        isWorking = false;
        LogError(e);
    }
    
    isWorking = false;
}

// Selects specified location to current one: loads all data for it by ajax.
function SetActiveLocation(newElement) {

    if (!newElement) {
        ShowError(OBJECT_NOT_FOUND);
        return;
    }
    
    try {

        $('.selectedLocation').each(function () {

            $(this).removeClass('activeLocation');
        });

        newElement.className += ' activeLocation';
        
    } catch (e) {
        LogError(e);
    }
}


// Removes location from list of selected.
function CloseSelected(element) {
    
    if (!citiesList) {
        return;
    }
    
    if (isWorking == true) {
        isWorking = false;
        ShowError(pleaseWait);
        return;
    }

    isWorking = true;

    if (citiesList.length <= 1) {
        isWorking = false;
        ShowError(MIN_CITIES_LIMIT);
        
    } else {

        try {
            
            var elName = element.getAttribute('id');
            
            // Find city to remove from list.
            var indexToRemove = 0;
            for (var index = 0; index < citiesList.length; index++) {

                if (element.innerHTML.indexOf(citiesList[index].city + ', ' + citiesList[index].country) >=0) {

                    break;
                }
                ++indexToRemove;
            }
            
            // First, find marker and remove from map.
            var markerLat = citiesList[indexToRemove].lat;
            var markerLong = citiesList[indexToRemove].long;
            
            indexToRemove = 0;
            for (var index = 0; index < markersList.length; index++) {

                if (markersList[index]._latlng.lat == markerLat && markersList[index]._latlng.lng == markerLong) {

                    break;
                }
                ++indexToRemove;
            }
            var markerToRemove = markersList[indexToRemove];
            markerToRemove.remove();

            // Second, find lines and remove them all from map.
            for (var index = 0; index < linesList.length; index++) {

               linesList[index].remove();
            }
            
            // Now clear all lists.
            linesList.splice(0);
            
            markersList.splice(indexToRemove, 1);            
            
            citiesList.splice(indexToRemove, 1);
            
            // Update storage.
            window.localStorage.setItem('tacticaState', JSON.stringify(citiesList));
            
            var isActive = element.getAttribute('class').indexOf('activeLocation') >= 0;
            var container = document.getElementById('SelectedLocationContainer');
            container.removeChild(element);

            if (isActive)
            {
                // Set last location as Active.
                $('.selectedLocation').each(function () {

                    $(this).removeClass('activeLocation');
                });

                var last = $('.selectedLocation').last();

                if (last) {
                    last.addClass('activeLocation');
                    // Update suggestions and weather.
                    // GetSuggestionsForToday(last.attr('woeid'));
                } else {
                    LogError(JS_ERROR); // Nothing to select
                }
            }
        } catch (e) {

            LogError(e);
            isWorking = false;
        }
    }

    window.event.cancelBubble = true;
    window.event.stopPropagation();
    
    isWorking = false;
    return false;
}



var tacticaContext = {
    issueKey : null,
    assigneeAccountId : null,
    assigneeDisplayName : null,
    assigneeTz : null,
    assigneeDstOffset : null,
    myTz : null,
    myDstOffset : null,
    tzDiff : null,
    statuses : {},
    overload : false,
    underload : false,
    noload : true
};
function createContext()
{
    // Find assignee for the current issue.
    if (!tacticaContext.assigneeAccountId || !tacticaContext.assigneeTz || !tacticaContext.assigneeDstOffset) {
        AP.request({
            url: '/rest/api/2/issue/' + tacticaContext.issueKey,
            type: 'GET',
            success: function(responseText){
                var item =  JSON.parse(responseText);

                if (item.fields.assignee == null) {
                    console.log("TacTicA WARNING: skip unassigned item");
                    return;
                }
    
                tacticaContext.assigneeAccountId = item.fields.assignee.accountId;
                tacticaContext.assigneeDisplayName = item.fields.assignee.displayName;
                tacticaContext.assigneeTz = parseCityFromJiraTz(item.fields.assignee.timeZone);
                
                $("#assigneetz").text(tacticaContext.assigneeTz);

                // Find assignee timezone offset
                AP.request({
                    url: getCityInfo + tacticaContext.assigneeTz,
                    type: 'GET',
                    success:  function (json) {
                        if (!json) {
                            console.error("TacTicAddon WARNING: City not found in response!");
                            return;
                        }
                        var cityData = JSON.parse(json);
                        tacticaContext.assigneeDstOffset = cityData.gmtOffset;
                        $('#assigneeDstOffset').text(tacticaContext.assigneeDstOffset);
                        tryCalcDiff();
                    }
                });
            },
            error:  function(responseText){
                console.log("TacTicAddon ERROR: ", responseText);
            }
        });
    }
    
    if (!tacticaContext.myDstOffset) {
        AP.user.getTimeZone(function(timezone){
            tacticaContext.myTz = parseCityFromJiraTz(timezone);
            $("#mytz").text(tacticaContext.myTz);

            AP.request({
                url: getCityInfo + tacticaContext.myTz,
                type: 'GET',
                success:  function (json) {
                    if (!json) {
                        console.error("TacTicAddon WARNING: City not found in response!");
                        return;
                    }
                    
                    var cityData = JSON.parse(json);
                    tacticaContext.myDstOffset = cityData.gmtOffset;
                    $('#myDstOffset').text(tacticaContext.myDstOffset);
                    tryCalcDiff();
                }
            });
        });
    } else {
        tryCalcDiff();
    }
    
    var tryCalcDiff = function() {

        if (tacticaContext == null || tacticaContext.myDstOffset  == null || tacticaContext.assigneeDstOffset  == null) {
        
            return;
        }
        tacticaContext.tzDiff = parseInt(tacticaContext.myDstOffset) - parseInt(tacticaContext.assigneeDstOffset);
        if (tacticaContext.tzDiff < 0) {
            tacticaContext.tzDiff = -1 * tacticaContext.tzDiff;
        }
        $("#tzdiff").text(tacticaContext.tzDiff);

        setRiskStatus();

       // Update cities list for the map.
        var citiesList = [];
        var tacticaState =  JSON.parse(window.localStorage.getItem('tacticaState'));
    
        if (!tacticaState) {
            tacticaState = citiesList;
        }
        
        if (tacticaState) {

            var found = false;
            var updateStorage = false;
            for (var i = 0; i < tacticaState.length; i++) {
                if (tacticaContext.myTz === tacticaState[i].city) {
                    found = true;
                    console.log("TacTicAddon: no need to add city: " + tacticaContext.myTz);
                    break;
                }
            }
            
            if (!found) {
                updateStorage = true;
                var city = {};
                city.city = tacticaContext.myTz;
                tacticaState.push(city);
            }
            
            var found = false;
            for (var i = 0; i < tacticaState.length; i++) {
                if (tacticaContext.assigneeTz === tacticaState[i].city) {
                    found = true;
                    console.log("TacTicAddon: no need to add city: " + tacticaContext.assigneeTz);
                    break;
                }
            }
            
            if (!found) {
                updateStorage = true;
                var city = {};
                city.city = tacticaContext.assigneeTz;
                tacticaState.push(city);
            }            
            
            if (updateStorage == true) {
                window.localStorage.setItem('tacticaState', JSON.stringify(tacticaState));
                console.log("TacTicA: updated state in localstorage");
            }
        }
    };
}