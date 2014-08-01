/**
 *@fileOverview
 * FFHTopo :: Topography Map Context
 *
 * Description:
 *	Displays topography information of the mesh network
 * 
 * Depends:
 *	FFHTopo Engine
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtcontext-topography.js 20M 2007-11-04 14:04:29Z (lokal) $
 */
/** 
 * Anpassungen durch Matthias Sch�fer, tox-freifunk gmx de, 19.08.2009 15:00 UTC
 * - die Adresse zum Abrufen der Topologie-Daten kann nun beliebig gew�hlt werden
 * 14.09.2009 16:00 UTC
 * - "Geodaten" ersetzt durch "Knotendaten"
 * 15.09.2009 14:00 UTC
 * - BATMAN-Checkbox entfernt
 */

/**
 * Änderung durch kwm 
 * OLSR-Link Checkbox aktiviert am 23.01.2014
 * Tunnel-Link Checkbox deaktiviert am 28.07.2014
 * Checkbox Knoten (HNA) entfernt am 23.01.2014
 * eigener Punkt auskommentiert, nicht mehr notwendig, da im Meshkit enthalten am 28.07.2014
 */

mtContextTopography.inherits(mtContext);
/**
 * Topography context
 * 
 * @param {Object} map FFHTopo map object
 * @param {String} server server URL
 * @param {mtSidebarManager} widgets sidebar manager
 * @constructor
 * @inherits mtContext
 */
function mtContextTopography(map, server, widgets) {
    var self = this;
    mtContext.call(this, map, widgets);
    //var server = server;
    var url = server;
    var customid = 0;

    var statNodeCount = 0;
    var statLinkCount = 0;
    var statOnlineCount = 0;

    this.init = function() {
        self.lock();

        var pool = new self.map.iconPool();
        this.addType('custom', 'Eigener Punkt', pool.fetch(), 'marker', true);
        this.addType('node', 'Knoten', pool.fetch(), 'marker', true);
	this.addType('nodehna', 'Knoten (HNA)', pool.fetch(), 'marker', true);	//auskommentiert von kwm
        this.addType('nodeinactive', 'Inaktiver Knoten', pool.fetch(), 'marker', true);

        pool = new self.map.colorPool();

        this.addType('linkolsr', 'OLSR-Link', pool.fetch(), 'polyline', false);
//		this.addType('linkbatman', 'B.A.T.M.A.N-Link', pool.fetch(), 'polyline', false);
        this.addType('linktunnel', 'Tunnel-Link', pool.fetch(), 'polyline', false);
        this.addType('customlink', 'Eigener Link', pool.fetch(), 'polyline', false);

        var map = self.map.getMapObject();
        map._mtContext = self;
        self.registerMapEvent(map, "dblclick", _addCustomMarker);

        $a(url, {
            method: 'get',
            onSuccess: _parseData,
            onFailure: _parseError
        });

        return true;
    };

    var _addCustomMarker = function (object) {
        if (object !== null) {
            var point;
            if (map.type === "osm") {
                point = map.map.getLonLatFromPixel(object.xy);
            } else {
                point = object.latLng;
            }
            if (self.getType('custom').status) {
                customid++;
                var mid = customid;
                var m = self.addMarker(point, 'custom', "custom" + mid, "# Punkt " + mid);
                var _mtRetrInfo = function () {
                    if (!this._mtInformation) {
                        var ll = self.map.pointGetLatLng(self.map.markerGetPoint(this));
                        if (self.map.type === "osm") {
                            var tmpPoint = new OpenLayers.LonLat(ll[1], ll[0]).transform(new OpenLayers.Projection('EPSG:3857'), new OpenLayers.Projection("EPSG:4326"));
                            ll = [tmpPoint.lat, tmpPoint.lon];
                        }
                        if (self.map.type === "google" || self.map.type === "osm") {
                            this._mtInformation = [mtPointTab("# Punkt " + mid, ll[0], ll[1]),
                                mtSelectTab("custom" + mid, self)];
                        } else {
                            this._mtInformation = [mtPointTab("# Punkt " + mid, ll[0], ll[1])];
                        }
                    }

                    return this._mtInformation;
                };
                self.map.bindInfoWindow(m, _mtRetrInfo);
                self.registerMapEvent(m, "dblclick", function () {
                    return _dropCustomMarker("custom" + mid);
                });
                self.map.showMarker(m);
                return true;
            }
        }
        return null;
    };

    var _dropCustomMarker = function (id) {
        self.dropMarker(id, 'custom');
        return true;
    };

    var _parseError = function (transport) {
        alert('Achtung! Irgendwas ist leider schief gelaufen: ' + transport.statusText);
        self.unlock();
    };

    var _parseData = function (transport) {
        var modTopo = new Date();
        var mtime = 0;
        var llink = {dist: 0};
        response = eval('(' + transport.responseText + ')');
        var data = response.topo;

        for (var ip in data) {
            _addNodeMarker(data[ip]);
            statNodeCount++;
            if (data[ip].mtime > mtime) {
                mtime = data[ip].mtime;
            }
            var countOnline = false;
            for (var link in data[ip].links) {
                countOnline = true;
                var dest = data[ip].links[link].dest;
                if (data[dest]) {
                    if (data[ip].links[link].type === "olsr" || data[ip].links[link].type === "batman") {
                        statLinkCount++;
                        if (data[ip].llaccuracy > 0 && data[dest].llaccuracy > 0) {
                            data[ip].links[link].distance = self.map.distance(
                                    self.map.createPoint(data[ip].latitude, data[ip].longitude),
                                    self.map.createPoint(data[dest].latitude, data[dest].longitude));
                            if (data[ip].links[link].distance > llink.dist) {
                                llink.src = data[ip];
                                llink.dest = data[dest];
                                llink.dist = data[ip].links[link].distance;
                                llink.type = data[ip].links[link].type;
                                llink.qual = data[ip].links[link].quality;
                            }
                        }
                    }
                    _addLinkLine(data[ip], data[dest], data[ip].links[link].type, data[ip].links[link].quality);
                }
            }
            if (countOnline) {
                statOnlineCount++;
            }
        }

        self.widgets.addWidget(_buildStatsBlock(statNodeCount, statOnlineCount, statLinkCount, modTopo, new Date(mtime * 1000)));
        if (llink.dist > 0) {
            self.widgets.addWidget(mtLinkWidget('L\u00E4ngste Funkstrecke:', llink));
        }
        self.widgets.addWidget(mtWidget('Gehe zu:', self._buildItemSelector()));
        self.widgets.addWidget(mtSearchWidget('Adresssuche:', _search));
        self.widgets.addWidget(self.buildLegendWidget());
        if (map.type === "osm")
            self.widgets.addWidget(self.buildLicenseWidget());

        self.showType('custom');		//auskommentiert von kwm
        self.showType('nodehna');	//auskommentiert von kwm
        self.showType('nodeinactive');
        self.showType('node');
        self.showType('linkolsr');		//eingesetzt von kwm 
//        self.showType('linktunnel');	//auskommentiert von kwm auf bitte von stromer

        self.unlock();
    };

    var _search = function (txtfield) {
        self.map.geocode(txtfield.value, _searchResult);
    };

    var _searchResult = function (result, status) {
        if (map.type === "osm") {
            var format = new OpenLayers.Format.XLS();
            var output = format.read(result.responseXML);
            if (output.responseLists[0]) {
                var geometry = output.responseLists[0].features[0].geometry;
                var foundPosition = new OpenLayers.LonLat(geometry.x, geometry.y).transform(
                        map.fromProjection,
                        map.toProjection
                        );
                _addCustomMarker(foundPosition);
            } else {
                alert("Fehler: Adresse konnte nicht in Koordinaten aufgelöst werden!");
            }
        }
        else if (map.type === "google") {
            if (status === google.maps.GeocoderStatus.OK) {
                var tmpPoint = Object;
                tmpPoint.latLng = result[0].geometry.location;
                _addCustomMarker(tmpPoint);
            } else {
                alert('Fehler: Adresse konnte nicht in Koordinaten aufgelöst werden!');
            }
        } else {
            if (!result) {
                alert('Fehler: Adresse konnte nicht in Koordinaten aufgelöst werden!');
            } else {
                _addCustomMarker(result);
            }
        }
    };


    var _buildStatsBlock = function (cntNode, cntOnline, cntLinks, modTopo, modGeo) {
        var nodes = $n('div', null, cntNode + ' Knoten erfasst');
        var online = $n('div', null, cntOnline + ' Knoten online');
        var links = $n('div', null, cntLinks + ' Funkverbindungen');
        var topomod = $n('div', null, 'Topologie von ' + _parseTime(modTopo));
        var nodemod = $n('div', null, 'Knoteninfos von ' + _parseTime(modGeo));

        return mtWidget('Statistik:').append([nodes, online, links, topomod, nodemod]);
    };

    var _parseTime = function (date) {
        var min = date.getMinutes();
        if (min < 10) {
            min = '0' + min;
        }
        return date.getHours() + ':' + min + ' Uhr';
    };

    var _addNodeMarker = function (node) {
        if (node.llaccuracy === 0) {
            return;
        }
        var type = "nodeinactive";

        for (var i in node.links) {
            if (node.hna === '0.0.0.0') {
                type = "nodehna";
            } else {
                type = "node";
            }
            break;
        }

        var caption = node.ipv4.replace(/^[0-9]+\.[0-9]+\./, "") + ' (' + node.hostname + ')';
        var m = self.addMarker(self.map.createPoint(node.latitude, node.longitude), type, node.ipv4, caption);
        var _infowin = function () {
            if (!this._mtInformation) {
                if (self.map.type === "google" || self.map.type === "osm") {
                    this._mtInformation = [mtInfoTab(node), mtSelectTab(node.ipv4, self),
                        mtLinkTab(node, self)];
                } else {
                    this._mtInformation = [mtInfoTab(node), mtLinkTab(node, self)];
                }
            }

            return this._mtInformation;
        };
        self.map.bindInfoWindow(m, _infowin);
    };
    
    var _addLinkLine = function (src, dest, type, qual) {
        if (src.llaccuracy === 0 || dest.llaccuracy === 0 || (self.getRegistered(dest.ipv4) && typeof dest.links === "object" && dest.links[type + "_" + src])) {
            return;
        }
        var srcp = self.map.createPoint(src.latitude, src.longitude);
        var destp = self.map.createPoint(dest.latitude, dest.longitude);
        if (type === "olsr") {
            if (qual !== 0) {
                var link = self.map.createPolyline([srcp, destp], self.getType("linkolsr").icon, 2, qual);
                self.addOverlay(link, "linkolsr");
            }
        } else if (type === "tunnel" || type === "tunnelgate") {
            var link = self.map.createPolyline([srcp, destp], self.getType("linktunnel").icon, 1, 1);
            self.addOverlay(link, "linktunnel");
        } else if (type === "customlink") {
            var link = self.map.createPolyline([srcp, destp], self.getType("customlink").icon, 1, 1);
            self.addOverlay(link, "customlink");
        } else if (type === "batman") {
            var link = self.map.createPolyline([srcp, destp], self.getType("linkbatman").icon, 2, qual);
            self.addOverlay(link, "linkbatman");
        }
    };
    this.addLinkLine = _addLinkLine;
}
