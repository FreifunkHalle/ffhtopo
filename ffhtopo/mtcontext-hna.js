/**
 *@fileOverview
 * FFHTopo :: HNA Map Context
 *
 * Description:
 * 	Displays internet connectivity routes
 * 
 * Depends:
 * 	FFHTopo Engine
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtcontext-hna.js 21M 2007-11-04 14:04:13Z (lokal) $
 */
/** 
 * Anpassungen durch Matthias Sch�fer, tox-freifunk gmx de, 19.08.2009 15:00 UTC
 * - die Adresse zum Abrufen der Topologie-Daten kann nun beliebig gew�hlt werden
 * - calcRouteQuality sucht den n�chsten Knoten der Route nun anhand der Knotendaten, nicht mehr anhand des Namens
 * 14.09.2009 16:00 UTC
 * - "Topologie" ersetzt durch "Knotendaten"
 */

mtContextHNAMap.inherits(mtContext);
/**
 * HNA Map context
 * 
 * @param {Object} gmap FFHTopo map object
 * @param {String} server server URL
 * @param {mtSidebarManager} widgets sidebar manager
 * @constructor
 * @inherits mtContext
 */
function mtContextHNAMap(map, server, widgets) {
    var self = this;
    mtContext.call(this, map, widgets);
    //var server = server;
    var url = server;

    var statNodeCount = 0;
    var statLinkCount = 0;

    var topo = null;
    var mid = null;
    var hnas = {};

    this.init = function() {
        self.lock();

        var pool = new this.map.iconPool();
        pool.fetch();

        this.addType('node', 'Knoten', pool.fetch(), 'marker', true);
        this.addType('nodehna', 'Knoten (Netzzugang)', pool.fetch(), 'marker', false);

        var pool = new this.map.colorPool();

        this.addType('link', 'Link', pool.fetch(), 'polyline', false);

        //var url = server + "/mapDataTopology";
        $a(url, {
            method: 'get',
            onSuccess: _parseData,
            onFailure: _parseError
        });

        return true;
    }

    var _parseError = function(transport) {
        alert('Achtung! Irgendwas ist leider schief gelaufen: ' + transport.statusText);
        self.unlock()
    }

    var _parseData = function(transport) {
        var mtime = 0;
        var statHnaCount = 0;
        response = eval('(' + transport.responseText + ')');
        topo = response.topo;
        mid = response.mid;
        data = response.topo;

        for (var ip in data) {
            var node = data[ip];

            if (node.hna == '0.0.0.0') {
                statHnaCount++;
                hnas[ip] = data[ip];
            }
        }

        for (var ip in data) {
            var node = data[ip];

            if (typeof node.links != "undefined") {
                statNodeCount++;
            }
            if (!(ip in hnas)) {
                _addNodeMarker(data[ip]);
            }

            if (node.mtime > mtime) {
                mtime = node.mtime;
            }
        }

        var masterservant = {serves: []};
        var scnt = 0;
        var hopsum = 0;

        for (var ip in hnas) {
            _addNodeMarker(hnas[ip]);
            if (typeof hnas[ip].serves != "undefined") {
                hnas[ip].serves.iterate(function(i) {
                    hopsum += i.c;
                    scnt++;
                });
                if (masterservant.serves.length < hnas[ip].serves.length) {
                    masterservant = hnas[ip];
                }
            }
        }

        self.widgets.addWidget(mtTextWidget('Statistik:',
                [statNodeCount + ' Knoten erfasst',
                    statHnaCount + ' HNAs',
                    'Knoteninfos von ' + _parseTime(new Date(mtime * 1000))]));

        if (typeof masterservant.ipv4 != "undefined") {
            self.widgets.addWidget(mtTextWidget('Meistbelasteter HNA:',
                    [masterservant.hostname,
                        'versorgt ' + masterservant.serves.length + ' Knoten']));
        }

        if (scnt > 0) {
            var rnd2 = function(val) {
                return Math.round(val * 100) / 100;
            }
            self.widgets.addWidget(mtTextWidget('Netzversorgung:',
                    ['\u2300 Knoten / HNA: ' + rnd2(scnt / statHnaCount),
                        '\u2300 Routenl\u00e4nge: ' + rnd2(hopsum / (scnt + statHnaCount))]));
        }

        self.widgets.addWidget(mtWidget('Gehe zu:', self._buildItemSelector()));
        self.widgets.addWidget(self.buildLegendWidget());
        if (map.type == "osm")
            self.widgets.addWidget(self.buildLicenseWidget());

        self.showType('node');
        self.showType('nodehna');
        self.showType('link');

        self.unlock();
    }

    var _parseTime = function(date) {
        var min = date.getMinutes();
        if (min < 10) {
            min = '0' + min;
        }
        return date.getHours() + ':' + min + ' Uhr';
    }

    var _addNodeMarker = function(node) {
        if (node.llaccuracy == 0) {
            return;
        }
        if (node.hna == '0.0.0.0') {
            var hna = '0.0.0.0';
            var type = "nodehna";
            if (typeof node.serves != "undefined") {
                var hnainfo = node.serves;
            } else {
                var hnainfo = [];
            }
        } else {
            var type = "node";
            var hnar = _resolveHNA([node.ipv4]);
            var hnarl = hnar.length - 1;
            if (hnarl > 0) {
                var hna = hnar[0];
                var hnaqo = _calcRouteQuality(hnar, "olsr");
                var hnaqb = _calcRouteQuality(hnar, "batman");
                if (hnaqo == 0 && hnaqb != 0) {
                    var hnaq = hnaqb;
                } else {
                    var hnaq = hnaqo;
                }

                if (hnas[hna]) {
                    if (typeof hnas[hna].serves == "undefined") {
                        hnas[hna].serves = [{target: node, c: hnarl, q: hnaq}];
                    } else {
                        hnas[hna].serves.push({target: node, c: hnarl, q: hnaq});
                    }
                    var hnainfo = [{target: hnas[hna], c: hnarl, q: hnaq}];
                }
            } else {
                var hna = false
                var hnainfo = [];
            }
        }


        var nodePoint = self.map.createPoint(node.latitude, node.longitude);
        var caption = node.ipv4.replace(/^[0-9]+\.[0-9]+\./, "") + ' (' + node.hostname + ')';
        var m = self.addMarker(nodePoint, type, node.ipv4, caption);
        _infowin = function() {
            if (!this._mtInformation) {
                if (self.map.type == "google" || self.map.type == "osm") {
                    this._mtInformation = [mtInfoTab(node), mtSelectTab(node.ipv4, self),
                        mtHnaTab('HNA-Info', self, hnainfo)];
                } else {
                    this._mtInformation = [mtInfoTab(node), mtHnaTab('HNA-Info', self, hnainfo)];
                }
            }

            return this._mtInformation;
        }
        self.map.bindInfoWindow(m, _infowin);

        if (hnas[hna] && hnas[hna].llaccuracy != 0 && hnaq > 0) {
            var hnaPoint = self.map.createPoint(hnas[hna].latitude, hnas[hna].longitude);
            var link = self.map.createPolyline([nodePoint, hnaPoint], self.getType("link").icon, 2, 1 / hnaq);
            self.addOverlay(link, "link");
        }
    }

    var _resolveHNA = function(ip, count) {
        if (!count) {
            count = 1;
        } else if (count > 100) {
            return [];
        }
        var cip = ip[0];
        if (topo[cip]) {
            ip.unshift(topo[cip].hna);
            var res = _resolveHNA(ip, count + 1);
            if (res.length > 0) {
                return res;
            } else {
                ip.shift();
                return ip;
            }
        } else {
            return [];
        }
    }

    var _calcRouteQuality = function(route, type) {
        var q = 0;
        var c = route.shift();
        while (route.length > 0) {
            var links = topo[c].links;
            if (typeof links == "object")
            {
                for (var linkname in links)
                {
                    var link = links[linkname];
                    if (link.dest == route[0] && link.type == type && link.quality != 0)
                    {
                        q += 1 / link.quality;
                        break;
                    }
                }
            }
            c = route.shift();
        }
        return q;
    }
}
