/**
 * @fileOverview
 * FFHTopo :: Map API abstraction library
 *
 * Description:
 *	abstraction of basic functionality of Google Maps API
 * 
 * Depends:
 *	FFHTopo Utils (mtutils.js)
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtmap-google.js 5M 2007-11-04 14:07:05Z (lokal) $
 */
/** 
 * Anpassungen durch Matthias Schäfer, tox-freifunk gmx de, 24.08.2009 20:00 UTC
 * - Scrollen über Mausrad
 */

var mtMapGoogleVersion = 0.10;
var mtMapGoogleVersionString = mtMapGoogleVersion + " $Rev: 5M $";

/**
 * Änderungen kwm 23.01.2014
 * Farben für Knoten und Tunnel geändert
 * Tunnel jetzt grau
 * Knoten grün
 */

/**
 * Map Abstraction for Google Maps API 2.x
 * 
 * This is the base class for Map API calls.
 * All abstraction classes with the same version number should have the same calling conventions.
 * 
 * @version 0.10
 * @param {HTMLElement} layer The layer in which the map will be drawn.
 * @param {Object} mtConfig
 * @param {Object} cmanager
 * @constructor
 */
function mtMapGoogle(layer, mtConfig, cmanager) {
    this.mtConfig = mtConfig;
    var cManager = cmanager;
    var markers = new Array();
    var map = new google.maps.Map(
            layer,
            {scaleControl: true,
                panControl: true,
                zoomControl: true,
                disableDoubleClickZoom: true,
                scrollwheel: true,
                zoom: mtConfig.zoomlevel,
                center: new google.maps.LatLng(mtConfig.latitude, mtConfig.longitude),
                mapTypeId: google.maps.MapTypeId.ROADMAP});
    var geocoder = new google.maps.Geocoder();
    var gclocale = "";
    this.map = map;
    google.maps.event.addListener(this.map, 'bounds_changed', function () {
        var i = 5;
        google.maps.event.clearListeners(map, 'bounds_changed');
        cManager.setContext('topo');

    });

    this.type = "google";

    var openedInfoWindow = null;

    /**
     * Adds a specific overlay to the map
     * @param {GOverlay} obj The overlay to be added
     */
    this.addOverlay = function (obj) {
        markers.push(obj);
        obj.setMap(map);
    };
    this.addClusterOverlay = this.addOverlay;

    /**
     * Adds standard user interface controls to the map
     */
    this.addUiControls = function () {

    };

    /**
     * Calculates the angle for a vector from p1 to p2
     * 
     * @param {GLatLng} p1 source point
     * @param {GLatLng} p2 destination point
     * 
     * @return {float} angle
     */
    this.angle = function (p1, p2) {
        var p3 = this.createPoint(p1.lat(), p2.lng());
        var dang = Math.atan(this.distance(p2, p3) / this.distance(p1, p3)) / (Math.PI / 180.0);

        if (p1.lat() < p2.lat() && p1.lng() < p2.lng()) {
            dang = 90 - dang;
        }

        if (p1.lat() < p2.lat() && p1.lng() > p2.lng()) {
            dang = 270 + dang;
        }

        if (p1.lat() > p2.lat() && p1.lng() < p2.lng()) {
            dang = 90 + dang;
        }

        if (p1.lat() > p2.lat() && p1.lng() > p2.lng()) {
            dang = 270 - dang;
        }

        return dang;
    };

    /**
     * Binds a specific callback function to an event fired by an object
     * 
     * This function is a wrapper for GEvent.addListener
     * 
     * The object will be avaiable as "this" to the callback function.
     * If the object is the map itself, the callback will have two parameters:
     * object and point, where object is the reference to the overlay clicked on (otherwise null)
     * and point is an instance of GLatLng with the coordinates of the event
     * 
     * Currently "click" and "dblclick" are supported events on all Map APIs
     * although others might work for some APIs
     * 
     * @param {google.maps.Overlay} object
     * @param {String} event
     * @param {Function} callback
     * 
     * @return {google.maps.EventHandler} Event handle for unbindEventHandler() 
     */
    this.bindEventHandler = function (object, event, callback) {
        return google.maps.event.addListener(object, event, callback);
    };

    /**
     * Binds a specific callback function that offers data for map information windows to a marker 
     * 
     * The callback function should return an Array with one or more information objects like
     * [{title: "Title #1", descr: "Some information"}, {title: "Title #2", descr: "Some more information"}]  
     * 
     * @param {GMarker} marker The marker to which the function will be bound
     * @param {Function} callback The callback function that offers the information data
     */
    this.bindInfoWindow = function (marker, callback) {
        marker._mtRetrInfo = callback;
        google.maps.event.addListener(marker, 'click', this._openInfoWindow);
    };

    /**
     * Removes all overlays from the map
     */
    this.clearOverlays = function () {
        while (markers[0]) {
            markers.pop().setMap(null);
        }
    };

    /**
     * Creates a color pool which offers 10 distinguishable color references in maptype specific format
     * 
     * It will return the colors:
     * '#FF0000', '#008000', '#0000FF', '#000000', '#FFFF00',	'#A52A2A', '#808080', '#FFA500', '#800080', '#FFFFFF'
     * in this order
     * 
     * @constructor
     */
    this.colorPool = function () {
        var ccol = 0;
        var colr = ['#FF0000', '#808080', '#0000FF', '#000000', '#FFFF00',
            '#A52A2A', '#808080', '#FFA500', '#800080', '#FFFFFF'];

        /**
         * Fetches the next color reference
         * 
         * @return {String} color
         */
        this.fetch = function() {
            if (ccol < colr.length) {
                ccol++;
            }
            return colr[ccol - 1];
        };
    };

    /**
     * Converts a maptype specific color reference fetched from colorPool() to an
     * hexadecimal color code
     * 
     * @param {String} color color reference
     * @return {String} hexadecimal color code
     */
    this.colorToHex = function (color) {
        return color;
    };

    /**
     * Creates and returns a group object which can handler multiple overlays at once
     * 
     * This is an emulation of a part of the VEShapeLayer class from Virtual Earth
     * 
     * @return {_GMapOverlayGroup} Group Object
     */
    this.createGroup = function () {
        return new this._GMapOverlayGroup(this);
    };

    /**
     * Creates a new map type specific marker object
     * 
     * This is a wrapper for the GMarker constructor
     * 
     * @param {GLatLng} point maptype specific point returned by createPoint()
     * @param {GIcon} icon maptype specific icon format returned by iconPool()
     *
     * @return {GMarker} marker 
     */
    this.createMarker = function (point, icon) {
        return new google.maps.Marker({position: point, icon: icon, clickable: true});
    };

    /**
     * Creates a new maptype specific point from geo coordinates
     * 
     * This is a wrapper for the GLatLng constructor
     * 
     * @param {float} lat Latitude
     * @param {float} lng Longitude
     * 
     * @return {GLatLng} point
     */
    this.createPoint = function (lat, lng) {
        return new google.maps.LatLng(lat, lng);
    };

    /**
     * Creates a new maptype specific polyline object
     * 
     * This is a wrapper for the GPolyline constructor
     * 
     * @param {Array} points array of points, see: createPoint()
     * @param {Object} color color object, see: colorPool()
     * @param {integer} width line width in pixels
     * @param {float} opac opacity as floating point number between 0 and 1
     * 
     * @return {GPolyline} polyline
     */
    this.createPolyline = function (points, color, width, opac) {
        return new google.maps.Polyline({path: points, strokeColor: color, strokeWeight: width, strokeOpacity: opac});
    };

    /**
     * Calculates the distance between points a and b in meters
     * 
     * @param {GLatLng} a
     * @param {GLatLng} b
     * 
     * @return {float} distance (m)
     */
    this.distance = function (a, b) {
        var alpha = (90 - a.lat()) * (Math.PI / 180.0);
        var beta = (90 - b.lat()) * (Math.PI / 180.0);
        var gamma = (b.lng() - a.lng()) * (Math.PI / 180.0);
        var c = Math.acos(Math.sin(alpha) * Math.sin(beta) * Math.cos(gamma) + Math.cos(alpha) * Math.cos(beta));
        return c * 6367000;
    };

    /**
     * Starts an asynchronous address resolving attempt for a given address
     * If this succeeds the callback function will be called with a point object as only parameter
     * otherwise the parameter will be null
     * 
     * @param {String} adr the address to be resolved
     * @param {Function} callback the callback function
     */
    this.geocode = function (adr, callback) {
        geocoder.geocode({address: adr + gclocale}, callback);
    };

    /**
     * Returns an object that describes the current mapstate
     * 
     * @return {object}
     */
    this.getMapState = function () {
        return {
            lat: this.map.getCenter().lat(),
            lng: this.map.getCenter().lng(),
            zoom: this.map.getZoom(),
            type: this.map.getCurrentMapType().getUrlArg()
        };
    };

    /**
     * Returns the maptype specific map object
     * Be aware of the API differences 
     * 
     * @return {GMap2} native map object
     */
    this.getMapObject = function () {
        return map;
    };

    /**
     * Extracts the URL from the maptype specific icon object
     * 
     * @param {GIcon} icon icon
     * @return {String} URL
     */
    this.iconToUrl = function (icon) {
        return icon.url;
    };

    /**
     * Creates a color pool which offers 10 distinguishable color references in maptype specific format.
     * 
     * It will return icons of the following colors:
     * 'black', 'green', 'blue', 'yellow', 'red', 'brown', 'gray', 'orange', 'purple', 'white'
     * in this order
     * 
     * @constructor
     */
    this.iconPool = function () {
        var cico = 0;
        var colr = ['black', 'green', 'yellow', 'red', 'black',
            'brown', 'gray', 'orange', 'purple', 'white'];

        /**
         * Fetches the next icon reference
         * 
         * @return {GIcon} icon
         */
        this.fetch = function () {
            if (cico < colr.length) {
                cico++;
            }
            var icon = new google.maps.MarkerImage();
            icon.url = "http://labs.google.com/ridefinder/images/mm_20_" + colr[cico - 1] + ".png";
            icon.size = new google.maps.Size(12, 20);

            return icon;
        };
    };

    /**
     * Extracts the point from a given marker
     * 
     * @param {GMarker} marker marker
     * @return {GLatLng} point
     */
    this.markerGetPoint = function (marker) {
        return marker.getPosition();
    };

    /**
     * Extracts the latitude and longitude information from a given point into an array
     * 
     * @param {GLatLng} point point
     * @return {Array} [latitude, longitude]
     */
    this.pointGetLatLng = function (point) {
        return [point.lat(), point.lng()];
    };

    /**
     * Removes given overlay from the map
     * 
     * @param {GOverlay} obj overlay
     */
    this.removeOverlay = function (obj) {
        obj.setMap(null);
    };
    this.removeClusterOverlay = this.removeOverlay;

    /**
     * Sets the map center to a specific point and zooms to the given zoomlevel
     * 
     * @param {GLatLng} point point
     * @param {integer} zoom zoomlevel
     */
    this.setCenter = function (point, zoom) {
        map.setCenter(point);
    };

    /**
     * Sets locale information of the geocoder
     * These will be automatically appended to any given address lookup request
     * 
     * @param {String} locale
     */
    this.setGeocoderLocale = function (locale) {
        gclocale = locale;
    };

    /**
     * Sets the map center to the given marker and opens the information window for it
     * 
     * @param {GMarker} marker marker
     */
    this.showMarker = function (marker) {
        map.panTo(marker.getPosition());
        this._openInfoWindow(marker);
    };

    /**
     * Unbinds given event handler
     * 
     * @param {GEventHandler} handler handler
     */
    this.unbindEventHandler = function (handler) {
        google.maps.event.removeListener(handler);
    };

    /**
     * @ignore
     */
    this._openInfoWindow = function (marker) {
        if (this._mtRetrInfo) {
            marker = this;
        }
        if (marker._mtRetrInfo) {
            if (openedInfoWindow !== null) {
                openedInfoWindow.close();
                openedInfoWindow = null;
            }
            var info = marker._mtRetrInfo();
            var infowin = $n('div').applyStyle({fontSize: '0.8em'});

            for (var i = 0; i < info.length; i++) {
                var heading = $n('div', null, info[i].title);
                heading.style.fontWeight = 'bold';
                infowin.append([heading, info[i].descr, $n('br')]);
            }
            infowin2 = new google.maps.InfoWindow({content: infowin});
            infowin2.open(map, marker);
            openedInfoWindow = infowin2;
        }
    };

    /**
     * VEShapeLayer emulation class
     * 
     * Stores a group of map overlays
     * 
     * You should not instantiate this class manually, use mtMapGoogle.createGroup() instead
     * 
     * @constructor
     * @param {GMap2} gmap map abstraction object
     */
    this._GMapOverlayGroup = function (gmap) {
        var a = [];
        var shown = false;

        /**
         * Adds an overlay to the group
         * 
         * @param {GOverlay} shape overlay
         */
        this.AddShape = function (shape) {
            a.push(shape);
            if (shown) {
                gmap.addOverlay(shape);
            }
        };

        /**
         * Deletes an overlay from the group
         * 
         * @param {GOverlay} shape overlay
         */
        this.DeleteShape = function (shape) {
            if (shown) {
                gmap.removeOverlay(shape);
            }
            a.remove(shape);
        };

        /**
         * Deletes all overlays from the group
         */
        this.DeleteAllShapes = function () {
            a.clear();
        };

        /**
         * Shows all overlays of the group on the map
         */
        this.Show = function () {
            a.iterate(gmap.addOverlay);
            shown = true;
        };

        /**
         * Hides all overlay of the group from the map 
         */
        this.Hide = function () {
            a.iterate(gmap.removeOverlay);
            shown = false;
        };

        /**
         * @ignore
         */
        this._each = function (callback) {
            a.iterate(callback);
        };
    };
}
