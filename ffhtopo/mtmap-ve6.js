/**
 * @fileOverview
 * FFHTopo :: Map API abstraction library
 *
 * Description:
 *	abstraction of basic functionality of Virtual Earth 5 API
 * 
 * Depends:
 *	FFHTopo Utils (mtutils.js)
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtmap-ve5.js 25M 2007-11-04 14:07:05Z (lokal) $
 */

/**
 * Änderungen von kwm am 23.01.2014
 * Farbe VPN-Tunnel-Link geändert in grau
 * Farbe Inaktive Knoten geändert in grün
 */
var mtMapVe6Version = 0.10;
var mtMapVe6VersionString = mtMapVe6Version + " $Rev: 25M $";

/**
 * Map Abstraction for Virtual Earth API 6
 * 
 * This is the base class for Map API calls.
 * All abstraction classes with the same version number should have the same calling conventions.
 * 
 * @version 0.10
 * @param {String} layer The id of the layer in which the map will be drawn.
 * @constructor
 */
function mtMapVirtualEarth(layer) {
    mtMapVirtualEarthInstance = this;
    var map = new VEMap(layer);
    var boundMapInfo = false;
    var events = {};
    var gclocale = "";
    var self = this;

    this.type = "ve6";

    map.LoadMap();
    map.SetScaleBarDistanceUnit(VEDistanceUnit.Kilometers);
    map.AttachEvent('ondoubleclick', function (e) {
        return self._handleEvent(e);
    });
    map.AttachEvent('onclick', function (e) {
        return self._handleEvent(e);
    });

    /**
     * Adds a specific overlay to the map
     * 
     * @param {VEShape} obj The overlay to be added
     */
    this.addOverlay = function (obj) {
        obj.Show();
    };
    this.addClusterOverlay = this.addOverlay;

    /**
     * Adds standard user interface controls to the map
     */
    this.addUiControls = function () {
        map.SetDashboardSize(VEDashboardSize.Normal);
    };

    /**
     * Calculates the angle for a vector from p1 to p2
     * 
     * @param {VELatLong} p1 source point
     * @param {VELatLong} p2 destination point
     * 
     * @return {Float} angle
     */
    this.angle = function (p1, p2) {
        var p3 = this.createPoint(p1.Latitude, p2.Longitude);
        var dang = Math.atan(this.distance(p2, p3) / this.distance(p1, p3)) / (Math.PI / 180.0);

        if (p1.Latitude < p2.Latitude && p1.Longitude < p2.Longitude) {
            dang = 90 - dang;
        }

        if (p1.Latitude < p2.Latitude && p1.Longitude > p2.Longitude) {
            dang = 270 + dang;
        }

        if (p1.Latitude > p2.Latitude && p1.Longitude < p2.Longitude) {
            dang = 90 + dang;
        }

        if (p1.Latitude > p2.Latitude && p1.Longitude > p2.Longitude) {
            dang = 270 - dang;
        }

        return dang;
    };

    /**
     * Binds a specific callback function to an event fired by an object
     * 
     * This function is an emulation of google.maps.Event.addListener
     * 
     * The object will be avaiable as "this" to the callback function.
     * If the object is the map itself, the callback will have two parameters:
     * object and point, where object is the reference to the overlay clicked on (otherwise null)
     * and point is an instance of VEShape with the coordinates of the event
     * 
     * Currently "click" and "dblclick" are supported events on all Map APIs
     * although others might work for some APIs
     * 
     * @param {VEShape} object
     * @param {String} event
     * @param {Function} callback
     * 
     * @return {Integer} Event handle for unbindEventHandler() 
     */
    this.bindEventHandler = function (object, event, callback) {
        events[event + callback] = {event: event, object: object, callback: callback};
        return event + callback;
    };

    /**
     * Binds a specific callback function that offers data for map information windows to a marker 
     * 
     * The callback function should return an Array with one or more information objects like
     * [{title: "Title #1", descr: "Some information"}, {title: "Title #2", descr: "Some more information"}]  
     * 
     * @param {VEShape} marker The marker to which the function will be bound
     * @param {Function} callback The callback function that offers the information data
     */
    this.bindInfoWindow = function (marker, callback) {
        marker._mtRetrInfo = callback;
        if (!boundMapInfo) {
            var self = this;
            map.AttachEvent('onmouseover', function (e) {
                self._prepareInfoWindow(e.elementID);
                return false;
            });
            boundMapInfo = true;
        }
    };

    /**
     * Removes all overlays from the map
     */
    this.clearOverlays = function () {
        map.HideAllShapeLayers();
        map.Clear();
    };

    /**
     * Creates a color pool which offers 10 distinguishable color references in maptype specific format
     * 
     * It will return the colors:
     * '#FF0000', '#008000', '#0000FF', '#000000', '#FFFF00', '#A52A2A', '#808080', '#FFA500', '#800080', '#FFFFFF'
     * in this order
     * 
     * @constructor
     */
    this.colorPool = function () {
        var ccol = 0;
        var colr = [255, 128, 0, 0, 128, 165, 128, 128, 128, 255];
        var colg = [0, 128, 0, 0, 255, 42, 128, 165, 0, 255];
        var colb = [0, 128, 255, 0, 0, 42, 128, 0, 128, 255];

        /**
         * Returns the next color reference
         * 
         * @return {VEColor} color object
         */
        this.fetch = function () {
            if (ccol < colr.length) {
                ccol++;
            }
            return new VEColor(colr[ccol - 1], colg[ccol - 1], colb[ccol - 1], 1);
        };
    };

    /**
     * Converts a maptype specific color reference fetched from {@link #colorPool} to an
     * hexadecimal color code
     * 
     * @param color color reference
     * @return {String} hexadecimal color code
     */
    this.colorToHex = function (color) {
        var hexChars = "0123456789ABCDEF";

        var dec2hex = function (dec) {
            var a = dec % 16;
            var b = (dec - a) / 16;
            hex = "" + hexChars.charAt(b) + hexChars.charAt(a);
            return hex;
        };

        return "#" + dec2hex(color.R) + dec2hex(color.G) + dec2hex(color.B);
    };

    /**
     * Creates and returns a group object which can handler multiple overlays at once
     * 
     * This is a wrapper for the VEShapeLayer constructor
     * 
     * @return {VEShapeLayer} group
     */
    this.createGroup = function () {
        var layer = new VEShapeLayer();
        map.AddShapeLayer(layer);
        layer.Hide();
        return layer;
    };

    /**
     * Creates a new map type specific marker object
     * 
     * This is an emulation of the google.maps.Marker constructor
     * 
     * @param {VELatLong} point maptype specific point returned by {@link #createPoint}
     * @param {String} icon maptype specific icon format returned by {@link #iconPool}
     *
     * @return {VEShape} marker 
     */
    this.createMarker = function (point, icon) {
        var shape = new VEShape(VEShapeType.Pushpin, point);
        shape.SetCustomIcon("<img style='position: relative; top: -6px; left: 7px' src='" + icon + "' alt='' />");
        return shape;
    };

    /**
     * Creates a new maptype specific point from geo coordinates
     * 
     * This is a wrapper for the VELatLong constructor
     * 
     * @param {float} lat Latitude
     * @param {float} lng Longitude
     * 
     * @return {VELatLong} point
     */
    this.createPoint = function (lat, lng) {
        return new VELatLong(lat, lng);
    };

    /**
     * Creates a new maptype specific polyline object
     * 
     * This is an emulation of the google.maps.Polyline constructor
     * 
     * @param {Array} points array of points, see: {@link #cratePoint}
     * @param {Object} color color object, see: {@link #colorPool}
     * @param {integer} width line width in pixels
     * @param {float} opac opacity as floating point number between 0 and 1
     * 
     * @return {VEShape} polyline
     */
    this.createPolyline = function (points, color, width, opac) {
        var shape = new VEShape(VEShapeType.Polyline, points);
        color.A = opac;
        shape.SetLineColor(color);
        shape.SetLineWidth(width);
        shape.HideIcon();
        return shape;
    };

    /**
     * Calculates the distance between points a and b in meters
     * 
     * @param {VELatLong} a
     * @param {VELatLong} b
     * 
     * @return {Float} distance (m)
     */
    this.distance = function (a, b) {
        var alpha = (90 - a.Latitude) * (Math.PI / 180.0);
        var beta = (90 - b.Latitude) * (Math.PI / 180.0);
        var gamma = (b.Longitude - a.Longitude) * (Math.PI / 180.0);
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
        var cb = function (a, b, c, d, e, f) {
            if (c) {
                callback(c[0].LatLong);
            } else {
                callback(null);
            }
        };
        map.Find(null, adr + gclocale, null, null, null, null, null, null, null, null, cb);
    };

    /**
     * Returns the maptype specific map object
     * Be aware of the API differences 
     * 
     * @return {VEMap} native map object
     */
    this.getMapObject = function () {
        return map;
    };

    /**
     * Creates an icon pool which offers 10 distinguishable icon references in maptype specific format
     * 
     * It will return icons that are colored:
     * 'black', 'green', 'blue', 'yellow', 'red', 'brown', 'gray', 'orange', 'purple', 'white'
     * in this order
     * 
     * @constructor
     */
    this.iconPool = function () {
        var cico = 0;
        var colr = ['black', 'green', 'blue', 'yellow', 'blue', 'red', 'black',
            'brown', 'gray', 'orange', 'purple', 'white'];

        /**
         * Fetches the next color reference
         * 
         * @return {String} icon
         */
        this.fetch = function () {
            if (cico < colr.length) {
                cico++;
            }
            return "http://labs.google.com/ridefinder/images/mm_20_" + colr[cico - 1] + ".png";
        };
    };

    /**
     * Extracts the URL from the maptype specific icon object
     * 
     * @param {String} icon icon
     * @return {String} URL
     */
    this.iconToUrl = function (icon) {
        return icon;
    };

    /**
     * Extracts the point from a given marker
     * 
     * @param {VEShape} marker marker
     * @return {VELatLong} point
     */
    this.markerGetPoint = function (marker) {
        return marker.GetPoints()[0];
    };

    /**
     * Extracts the latitude and longitude information from a given point into an array
     * 
     * @param {VELatLong} point point
     * @return {Array} [latitude, longitude]
     */
    this.pointGetLatLng = function (point) {
        return [point.Latitude, point.Longitude];
    };

    /**
     * Removes given overlay from the map
     * 
     * @param {VEShape} obj overlay
     */
    this.removeOverlay = function (obj) {
        obj.Hide();
    };
    
    this.removeClusterOverlay = this.removeOverlay;

    /**
     * Sets the map center to a specific point and zooms to the given zoomlevel
     * 
     * @param {VELatLong} point point {@link #createPoint}
     * @param {Integer} zoom zoomlevel
     */
    this.setCenter = function (point, zoom) {
        map.SetCenterAndZoom(point, zoom);
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
     * @param {VEShape} marker marker
     */
    this.showMarker = function (marker) {
        map.SetCenter(this.createPoint(0, 0));
        map.SetCenter(marker.GetPoints()[0]);
        this._prepareInfoWindow(marker.GetID());
        map.ShowInfoBox(marker);
    };

    /**
     * Unbinds given event handler
     * 
     * @param {integer} handler event handler
     */
    this.unbindEventHandler = function (handler) {
        events[handler] = null;
    };

    /**
     * @ignore
     */
    this._handleEvent = function (e) {
        var key = "";
        var res = false;
        if (e.eventName === "onclick") {
            key = "click";
        } else if (e.eventName === "ondoubleclick") {
            key = "dblclick";
        }
        var i;
        for (i in events) {
            if (events[i].event === key) {
                if (events[i].object === map) {
                    map._mtEventHandler = events[i].callback;
                    var point = map.PixelToLatLong(new VEPixel(e.mapX, e.mapY));
                    if (point.Latitude === null && point.Longitude === null) {
                        alert("Leider ist die Koordinatenbestimmung hier nicht m\u00f6glich!\nBeschwert euch bei Microsoft!");
                        continue;
                    }
                    var object;
                    if (e.elementID) {
                        object = map.GetShapeByID(e.elementID);
                    } else {
                        object = null;
                    }
                    res = map._mtEventHandler(object, point);
                    map._mtEventHandler = null;
                } else if (e.elementID) {
                    var obj = map.GetShapeByID(e.elementID);
                    if (obj === events[i].object) {
                        obj._mtEventHandler = events[i].callback;
                        res = obj._mtEventHandler();
                        obj._mtEventHandler = null;
                    }
                }
            }
        }

        return res;
    };

    /**
     * @ignore
     */
    this._prepareInfoWindow = function (mid) {
        var marker = map.GetShapeByID(mid);
        if (marker && marker._mtRetrInfo && marker.GetDescription() === "") {
            var info = marker._mtRetrInfo();
            var descr = info[0].descr.innerHTML;
            var i;
            for (i = 1; i < info.length; i++) {
                descr += "<br /><strong>" + info[i].title + "</strong><br />" + info[i].descr.innerHTML;
            }

            marker.SetTitle(info[0].title);
            marker.SetDescription(descr);
        }
    };
}

