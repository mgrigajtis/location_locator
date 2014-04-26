/******************************************************\
 | Title: locator.js                                   |
 | Author: Matthew Grigajtis                           |
 | Email: matthew.grigajtis@gmail.com	               |
 | Author Website: http://www.matthewgrigajtis.com     |
 | Description: This script parses the results from    |
 | getStores.php, filters the results into a 25 mile   |
 | radius from the inputted zip code and displays      |
 | each location on a Google Map.  This script utilizes|
 | the Google Maps API version 3.		       |
 | 						       |
 | Modified Fri Sep 2 2011			       |
 | by: modifications by Chad Windnagle		       |
 | Email: chad@s-go.net				       |
 | Descriptions: modifications were to add results     |
 | returned by distance. see function writeResults()   |
 | returns results from Matt's code in a sorted by     |
 | distance array.				       |
 \*****************************************************/


jQuery(document).ready(function () {


    // First we create the map and set the center location
    var geocoder = new google.maps.Geocoder();

    // Some global variables that will be used later
    var addresses = "";
    var originalLatLng;
    var addressesArr = new Array();
    var highestDistance = 0;
    var distancesArr = new Array();


    function getLocations()
    {
        // get the zip field
        var zip = jQuery("#zip").val();

        // select the message container
        var messageContainer = jQuery('.alert');

        // clear any past messages
        messageContainer.html("");

        // if we have a zipcode run in
        if (zip) {
            // clear any messages
            messageContainer.removeClass('in');
            messageContainer.addClass('hidden');

            // clear the results
            jQuery("#results").html("");

            // hide the submit button
            jQuery("#submit").hide();

            // show the loader
            jQuery("#loader").show();

            locateStores();
        }
        else {
            var message = "<p>Zip code required</p>";
            messageContainer.removeClass('hidden');
            messageContainer.addClass('in');
            messageContainer.append(message);
        }
    }


    // We set the map to show the middle of the US, zoomed out quite a bit
    geocoder.geocode({'address': "1200 Market Street St. Louis MO 63103"}, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var myOptions = {
                zoom: 3,
                center: results[0].geometry.location,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        }
    });

    // When the user clicks the submit button, we locate the stores
    jQuery("#submit").click(function () {
        event.preventDefault();
        // call the get locations function which does all the work
        getLocations();
    });

    jQuery('#retailer-lookup').submit(function(event){
        event.preventDefault();
        // call the get locations function which does all the work
        getLocations();
        return false;
    });

    // This is the function that is called when the user clicks on Submit
    function locateStores ()
    {
        var zip = jQuery("#zip").val();

        // The first thing we do is center on the user's zip code and zoom in
        geocoder.geocode({'address': zip}, function (results, status) {
            if (status = google.maps.GeocoderStatus.OK)
            {
                originalLatLng = results[0].geometry.location;
                var myOptions = {
                    zoom: 10,
                    center: results[0].geometry.location,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };


                map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
            }
        });

        // let's get the JSON list of stores

        addresses = "";

        jQuery.get("/index.php?option=com_locateretailers&view=locateretailers&format=json", {'zip': zip}, function (data) {

        //addresses = jQuery.parseJSON(data);
        addresses = data;

            if(addresses != "") {
                // run the recursive function to geocode and place the markers
                runMarkers(0);
                //alert(distanceArr);
                writeResults(); // loop through results and return sorted by distance @chad windnagle

            }
            else {
                writeError();
            }
        });
    }

    function runMarkers(i)
    {
        address = addresses[i].location_address + " " + addresses[i].location_city + " " + addresses[i].location_state + " " + addresses[i].location_zip;
        placeMarker(address, addresses[i].location_name, addresses[i].location_address, addresses[i].location_city, addresses[i].location_state, addresses[i].location_zip, addresses[i].location_phone, addresses[i].lat, addresses[i].long, addresses[i].location_website_url);
        i++;
        if (i<addresses.length)
        {
            // setTimeout(function () {runMarkers(i);}, 1000);
            runMarkers(i);
        }

        if ((i == addresses.length) || (addresses.length == 0))
        {
            // hide the ajax loader
            jQuery("#loader").hide();

            // show the submit button
            jQuery("#submit").show();
        }

    }

    function placeMarker (address, name, street, city, state, zip, phone, lt, lg, url)
    {
        var myLatlng = new google.maps.LatLng(lt, lg);

        rad = function(x) {return x*Math.PI/180;}

        hDistance = (function(p1, p2) {
            var R = 6371; // earth's mean radius in km
            var dLat  = rad(p2.lat() - p1.lat());
            var dLong = rad(p2.lng() - p1.lng());

            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) * Math.sin(dLong/2) * Math.sin(dLong/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            var d = R * c;

            return d.toFixed(3);
        });

        var distance = hDistance(originalLatLng, myLatlng) * .62137119;
        distance = distance.toFixed(3);

        var distanceConfig =  jQuery("#distanceConfig").val();
        var zipConfig = jQuery("#zip").val();


        // make sure distances go array in as numbers
        distance = distance *1;


        if (distance <= distanceConfig || zipConfig == zip )
        {
            // Add the marker
            var marker = new google.maps.Marker({
                position: myLatlng,
                // animation: google.maps.Animation.DROP,
                map: map,
                title: name,
                icon: 'components/com_locateretailers/assets/images/map-icon.png'
            });

            if (url.substring(0,7) != "http://")
            {
                url = "http://" + url;
            }

            var contentString = 'Distance: ' + distance
                + ' miles<br /><strong>' + name + '</strong><br />'
                + street + '<br />' + city + ', ' + state + ' '
                + zip  + '<br /><a href="http://maps.google.com/?daddr=' + street
                + '+' + city + '+' + state + '+' + zip
                + '" target="_blank">Get Directions</a>'
                + '<br /><a href="' + url + '">' + url + '</a>';

            var infowindow = new google.maps.InfoWindow({
                content: contentString
            });

            google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
            });

            // put just distances in distancesArr
            distancesArr.push(distance);

            if (distance <= distanceConfig || zipConfig == zip ) {
                //put address block in addressArr
                addressesArr.push('<div class="retailer-location">'
                    + '<h3>' + name + '</h3>Distance: ' + distance + ' miles<br />'
                    + phone + '<br />' + street + '<br />' + city + ", " + state + " " + zip +
                    '<br /><a href="http://maps.google.com/?daddr=' + street + '+' + city + '+' + state + '+' + zip +
                    '" target="_blank">Get Directions</a><br /><a href="' + url + '">' + url + '</a></div>');

            }
        }
    }

    function writeError() {
        var message = jQuery('.alert');
        message.append("<p>No results found. Please try another zipcode.</p>");
        message.removeClass('hidden');
        message.addClass('in');
        message.addClass('alert-info');
        // hide the submit button
        jQuery("#submit").show();
    }

    //parses through distancesArr and addressesArr and returns results list sorted by distance - @Chad Windnagle
    function writeResults() {
        // set up a few vars for our loops
        var lowest = 1000; // high number which gets reset for distances
        var lowest_id = 0; // records our lowest iterator
        var count = 0; // iterates our while loop
        var length = distancesArr.length; // find the first total number of results

        // while loop iterates through array num of times before we remove anything from it
        while (count < length ) {

            // inner loop iterates through our distances to find lowest distance and lowest distance index
            for (d=0; d < distancesArr.length; d++) {
                if (distancesArr[d] < lowest) {
                    lowest = distancesArr[d]; // get the lowest distance and set var
                    lowest_id = d;	// get lowest distance index
                }
            }

            jQuery("#results").append(addressesArr[lowest_id]); // print from addressesArr our lowest distance using lowest distance index
            distancesArr.splice(lowest_id,1); // remove lowest distance from distancesArr
            addressesArr.splice(lowest_id,1); // remove lowest distance address from addressArr
            lowest = 1000; // rest lowest distance

            count++; // while loop iterator
        } // end while

    }

    function geocodeAndPlaceMarker (address, name, street, city, state, zip, phone)
    {
        // Geocode the address
        geocoder.geocode({'address': address}, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK)
            {
                var myLatlng = results[0].geometry.location;

                rad = function(x) {return x*Math.PI/180;}

                hDistance = (function(p1, p2) {
                    var R = 6371; // earth's mean radius in km
                    var dLat  = rad(p2.lat() - p1.lat());
                    var dLong = rad(p2.lng() - p1.lng());

                    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) * Math.sin(dLong/2) * Math.sin(dLong/2);
                    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    var d = R * c;

                    return d.toFixed(3);
                });

                var distance = hDistance(originalLatLng, myLatlng) * .62137119;
                distance = distance.toFixed(3);

                var distanceConfig =  jQuery("#distanceConfig").val();
                var zipConfig = jQuery("#zip").val();

                if (distance <= distanceConfig || zipConfig == zip )
                {
                    // Add the marker
                    var marker = new google.maps.Marker({
                        position: myLatlng,
                        // animation: google.maps.Animation.DROP,
                        map: map,
                        title: name,
                        icon: 'components/com_locateretailers/assets/images/map-icon.png'
                    });

                    var contentString = '<div style="color: #000000;">Distance: ' + distance + ' miles<br /><strong>' + name + '</strong><br />' + street + '<br />' + city + ', ' + state + ' ' + zip  + '<br /><a href="http://maps.google.com/?daddr=' + street + '+' + city + '+' + state + '+' + zip + '" target="_blank">Get Directions</a></div>';

                    var infowindow = new google.maps.InfoWindow({
                        content: contentString
                    });

                    google.maps.event.addListener(marker, 'click', function() {
                        infowindow.open(map, marker);
                    });


                    // Add to the results division
                    jQuery("#results").append('<div style="background-color: #7f103f; margin-top: 10px; padding: 10px;"><strong>' + name +
                        '</strong><br />Distance: ' + distance + ' miles<br />'
                        + phone + '<br />' + street + '<br />' + city + ", " + state + " " + zip +
                        '<br /><a href="http://maps.google.com/?daddr=' + street + '+' + city + '+' + state + '+' + zip + '" target="_blank">Get Directions</a></div>');
                }
            }
        });
    }
});
