/**
 * FFHTopo :: Client Map Building Engine
 *
 * Description:
 *  Map building and data output
 * 
 * Depends:
 *  FFHTopo Utils
 *  FFHTopo Map API abstraction library
 *  FFHTopo Widget Helper
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtengine.js 24M 2007-11-04 14:05:17Z (lokal) $
 */
/** 
 * Anpassungen durch Matthias Schäfer, tox-freifunk gmx de, 26.08.2009 0:00 UTC
 * - Boardtyp "WHR-108G"
 * - Boardtyp "Buffalo WHR-G54" -> "Buffalo WHR(-HP)-G54"
 * 14.09.2009 18:00 UTC
 * - Boardtyp "atheros,00"
 * 9.10.2009 19:00 UTC
 * - Boardtyp "0x0446,1024"
 */

/**
 * Änderungen von kwm am 23.01.2014
 * Ansicht Internetzugang auskommentiert
 */

var mtEngineVersion = 0.97;
var mtEngineVersionString = mtEngineVersion;


/**
 * Loads and initialises FFHTopo engine
 * 
 * @param {Object} mtConfig configuration
 * @config {String} maplayer Map layer id
 * @config {String} mapapi Map api name
 * @config {Float} latitude Initial map latitude
 * @config {Float} longitude Initial map longitude
 * @config {Integer} zoomlevel Initial map zoomlevel
 * @config {String} gclocale Geocoder locale
 */
function mtLoad(mtConfig) {
    var cManager = new mtContextManager($(mtConfig.menulayer));
    var map;
    if (mtConfig.mapapi === 'gmap3') {
        map = new mtMapGoogle($(mtConfig.maplayer), $(mtConfig), cManager);
    } else if (mtConfig.mapapi === 've6') {
        map = new mtMapVirtualEarth(mtConfig.maplayer);
    } else if (mtConfig.mapapi === 'osm') {
        map = new mtMapOSM($(mtConfig.maplayer), $(mtConfig), cManager);
    }

    map.addUiControls();
    map.setCenter(map.createPoint(mtConfig.latitude, mtConfig.longitude), mtConfig.zoomlevel);
    map.setGeocoderLocale(mtConfig.gclocale);

    var cTopo = new mtContextTopography(map, mtConfig.server, new mtSidebarManager($(mtConfig.sidebar)));
    var cHNA = new mtContextHNAMap(map, mtConfig.server, new mtSidebarManager($(mtConfig.sidebar)));

    cManager.putContext('topo', 'Topographie', cTopo);
//    cManager.putContext('hna', 'Internetzugang', cHNA);		//auskommentiert von kwm
    if (mtConfig.mapapi === 'gmap3' || mtConfig.mapapi === 've6' || mtConfig.mapapi === 'osm') {
        cManager.setContext('topo');
    }

    $(mtConfig.helplayer).appendChild($n('a', {href: 'https://www.freifunk-halle.net/mediawiki/wiki/FFHTopo'},
        'Über FFHTopo ' + mtEngineVersionString));
}

/**
 * Returns the hardware name to the given board id
 * 
 * @param {String} id board-id
 * @return {String} hardware name
 */
function mtHardwareLookup(id) {
    if (id == "0x467,00") {
        return "Buffalo WHR(-HP)-G54";
    } else if (id == "0x0467,42" || id == "0x467,42") {
        return "Linksys WRT54G v4/GL";
    } else if (id == "0x0708,42" || id == "0x0101,42") {
        return "Linksys WRT54G v2/v3";
    } else if (id == "bcm94710dev,42") {
        return "Linksys WRT54G v1";
    } else if (id == "WHR-108G") {
        return "Buffalo WHR-HP-G108";
    } else if (id == "atheros,00") {
        return "D-Link DIR-300, Ubiquiti NanoStation2";
    } else if (id == "0x0446,1024") {
        return "Linksys WAP54G v2";
    } else {
        return id;
    }
}

/**
 * Map context baseclass
 * 
 * @param {Object} gmap FFHTopo map object
 * @param {mtSidebarManager} widgets sidebar manager
 * @constructor
 */
function mtContext(gmap, widgets) {
    var self = this;
    this.map = gmap;
    var type = {};
    var initialized = false;
    var cManager = null;
    var menureg = {};
    var eventHandler = [];

    this.widgets = widgets;
    this.icons = {};
    this.colors = {};

    /**
     * Adds an entry to the menu
     * 
     * @param {String} typeid
     * @param {String} id
     * @param {String} name
     * @param {Object} marker
     */
    var _addMenu = function (typeid, id, name, marker) {
        type[typeid].menu.push({id: id, name: name});
        menureg[id] = marker;
    };

    /**
     * Handler for legend click events
     * 
     * @param {Object} e
     */
    var _handleLegendClick = function (e) {
        var id = e.target.id.substr(13);
        if (type[id] && type[id].status === 1) {
            self.hideType(id);
        } else if (type[id] && type[id].status === 0) {
            self.showType(id);
        }
    };

    /**
     * Standard handler for selector click events
     * 
     * @param {Object} e
     */
    var _handleSelectorClick = function (e) {
        self.selectMenuEntry(e.target.value);
    };

    /**
     * Rebuild all available item selectors
     */
    var _rebuildItemSelector = function () {
        var x = document.getElementsByName('mtItemSelector');

        for (var i = 0; i < x.length; i++) {
            var selector = $(x[i]);
            selector.removeChildren();

            if ((typeof newSelector) === "undefined") {
                var newSelector = $(self._buildItemSelector());
            }

            newSelector.cloneChildren(selector);
        }
    };

    /**
     * Compare function for selector sorting
     * 
     *  @param {Object} a
     *  @param {Object} b
     */
    var _sortSelector = function (a, b) {
        return natcompare(a.name, b.name);
    };

    /**
     * Builds an item selector of active overlays
     * 
     * @param {Function} callback
     * @return {HTMLElement} block
     */
    this._buildItemSelector = function (callback) {
        var selector = $n('select', {className: 'mtItemSelector', 'name': 'mtItemSelector'});
        if (!callback) {
            selector.bind('change', _handleSelectorClick);
        } else {
            selector.bind('change', callback);
        }

        selector.appendChild($n('option', null, 'Bitte Punkt ausw\u00E4hlen...'));

        var menu = [];

        for (var i in type) {
            if (type[i].status) {
                menu = menu.concat(type[i].menu);
            }
        }

        menu.sort(_sortSelector);
        for (var m = 0; m < menu.length; m++) {
            selector.appendChild($n('option', {value: menu[m].id}, menu[m].name));
        }
        return selector;
    };

    /**
     * Adds a marker to the map application and registers menu entries for it
     * 
     * @param {Object} point map point object
     * @param {String} typeid overlay type to which the marker will be added
     * @param {String} id uniquie id of the marker
     * @param {String} caption caption of the marker
     * 
     * @return {Object} marker
     */
    this.addMarker = function (point, typeid, id, caption) {
        var marker = this.map.createMarker(point, type[typeid].icon);
        this.addOverlay(marker, typeid);
        _addMenu(typeid, id, caption, marker);
        _rebuildItemSelector();
        return marker;
    };

    /**
     * Assign an overlay to an overlay type
     * 
     * @param {Object} overlay
     * @param {String} typeid
     */
    this.addOverlay = function (overlay, typeid) {
        if (!type[typeid]) {
            throw mtError;
        }
        type[typeid].mobj.AddShape(overlay);
    };

    /**
     * Adds a new overlay type
     * 
     * @param {String} id
     * @param {String} name
     * @param {Object} icon
     * @param {String} ttype
     * @param {Boolean} cluster
     */
    this.addType = function (id, name, icon, ttype, cluster) {
        type[id] = {id: id, name: name, icon: icon, mobj: this.map.createGroup(cluster), menu: [], status: 0, type: ttype};
    };

    /**
     * Builds the legend widget for the current context
     * 
     * @return {HTMLElement} block
     */
    this.buildLegendWidget = function () {
        var legend = mtWidget('Legende:');
        for (var i in type) {
            var lcheck = $n('input', {type: 'checkbox', name: 'mtLegendCheck' + i, id: 'mtLegendCheck' + i});
            lcheck.checked = (type[i].status);

            if (type[i].type === 'marker') {
                var licon = $n('img', {src: this.map.iconToUrl(type[i].icon), alt: type[i].name});
            } else {
                var licon = $n('span', null, '---');
                licon.style.color = this.map.colorToHex(type[i].icon);
                licon.style.fontWeight = 'bolder';
            }
            lcheck.bind('click', _handleLegendClick);

            var lentry = $n('div', {id: 'mtLegendEntry' + i, className: 'mtLegendEntry'});
            legend.appendChild(lentry.append([lcheck, licon, ' ' + type[i].name]));
        }
        return legend;
    };

    this.buildLicenseWidget = function () {
        var license = mtWidget('Lizenz:');
        var lentry = $n('div', {id: 'mtLicenseEntry', className: 'mtLicenseEntry'});
        var la1 = $n('a', {href: "http://www.openstreetmap.org/"});
        la1.append(["OpenStreetMap"]);
        var la2 = $n('a', {href: "http://opendatacommons.org/licenses/odbl/"});
        la2.append(["ODbL"]);
        lentry.append(['Daten von ', la1, ' - Veröffentlicht unter ', la2]);
        license.appendChild(lentry);
        return license;
    };

    /**
     * Cleans up map and sidebar
     * 
     * This is usually called by disable() before context switching 
     */
    this.cleanup = function () {
        this.widgets.clear();
        this.map.clearOverlays();
        for (var i = 0; i < eventHandler.length; i++) {
            this.map.unbindEventHandler(eventHandler[i].handler);
        }
    };

    /**
     * This function is invoked by the context manager whenever a context switch
     * was requested from this context to another. It should clean up map and sidebar.
     */
    this.disable = function () {
        this.cleanup();
    };

    /**
     * Redraws context objects
     * 
     * This is usually called by enable() after context switching
     */
    this.display = function () {
        for (var i = 0; i < eventHandler.length; i++) {
            this.map.bindEventHandler(eventHandler[i].object, eventHandler[i].type, eventHandler[i].callback);
        }
        if (!initialized) {
            initialized = this.init();
        }
        for (var i in type) {
            if (type[i].status === 1) {
                type[i].status = 0;
                this.showType(i);
            }
        }
        this.widgets.draw();
    };

    /**
     * Removes the marker and is references from the context and the map
     * 
     * @param {String} id marker unique id
     * @param {String} typeid type to which the marker belongs
     */
    this.dropMarker = function (id, typeid) {
        var marker = menureg[id];
        menureg[id] = null;
        this.dropOverlay(marker, typeid);
        for (var i = 0; i < type[typeid].menu.length; i++) {
            if (type[typeid].menu[i].id === id) {
                type[typeid].menu.splice(i, 1);
            }
        }
        _rebuildItemSelector();
    };

    /**
     * Removes an overlay from the map
     * 
     * @param {Object} overlay
     * @param {String} typeid type to which the overlay belongs
     */
    this.dropOverlay = function (overlay, typeid) {
        type[typeid].mobj.DeleteShape(overlay);
    };

    /**
     * This function is invoked by the context manager whenever a context switch
     * was requested from another context to the current. It should initialize the context and redraw overlays and sidebars.
     */
    this.enable = function () {
        this.display();
    };

    /**
     * Returns a registered overlay
     * 
     * @param {String} id
     * @return {Object} overlay
     */
    this.getRegistered = function (id) {
        return menureg[id];
    };

    /**
     * Returns a specific type object
     * 
     * @param {String} id
     * @return {Object} type
     */
    this.getType = function (id) {
        return type[id];
    };

    /**
     * Hides all overlays of a specific type
     * 
     * @param {String} typeid
     */
    this.hideType = function (typeid) {
        var oldstat = type[typeid].status;
        type[typeid].status = 0;

        if ($('mtLegendCheck' + typeid)) {
            $('mtLegendCheck' + typeid).checked = false;
        }

        if (oldstat !== 0) {
            type[typeid].mobj.Hide();
        }

        _rebuildItemSelector();
    };

    /**
     * Initialises the context
     * 
     * This is usually called by enable() once after the first activation of a context
     */
    this.init = function () {
        return true;
    };

    /**
     * Locks the context manager to prevent context switching
     */
    this.lock = function () {
        cManager.lock();
    };

    /**
     * Assign a specific context manager to this context
     * 
     * @param {mtContextManager} manager
     */
    this.setContextManager = function (manager) {
        cManager = manager;
    };

    /**
     * Registers a special event on the map
     * 
     * See bindEventHandler() on any FFHTopo map object for further details
     * 
     * @param {Object} object
     * @param {String} type
     * @param {Function} callback
     */
    this.registerMapEvent = function (object, type, callback) {
        eventHandler.push({type: type, object: object, callback: callback,
            handler: this.map.bindEventHandler(object, type, callback)});
    };

    /**
     * Shows a registered overlay object on the map
     * 
     * @param {String} id overlay id
     */
    this.selectMenuEntry = function (id) {
        if (menureg[id]) {
            this.map.showMarker(menureg[id]);
        }
    };

    /**
     * Shows all overlays of a specific type on the map
     * 
     * @param {String} typeid
     */
    this.showType = function (typeid) {
        if (!type[typeid]) {
            throw mtError;
        }

        var oldstat = type[typeid].status;
        type[typeid].status = 1;

        if ($('mtLegendCheck' + typeid)) {
            $('mtLegendCheck' + typeid).checked = true;
        }

        if (oldstat !== 1) {
            type[typeid].mobj.Show();
        }

        _rebuildItemSelector();
    };

    /**
     * Unlocks the context manager to allow context switching
     */
    this.unlock = function () {
        cManager.unlock();
    };
}

/**
 * FFHTopo context manager
 * 
 * Manages several map context and handles switching
 * 
 * @param {Object} menu
 * 
 * @constructor
 */
function mtContextManager (menu) {
    var self = this;
    var cont = null;
    var list = {};
    var lcks = false;

    /**
     * Locks the context manager to prevent context switching
     */
    this.lock = function() {
        lcks = true;
    };

    /**
     * Unlocks the context manager
     */
    this.unlock = function() {
        lcks = false;
    };

    /**
     * Adds a context to be managed with the context manager
     * 
     * @param {String} id unique context id
     * @param {String} name context name to be displayed
     * @param {mtContext} context context object itself
     */
    this.putContext = function (id, name, context) {
        list[id] = {id: id, context: context, name: name};
        _menuAppend(id, name);
    };

    /**
     * Selects a new context
     * 
     * @param {String} id
     */
    this.setContext = function (id) {
        if (lcks) {
            return;
        }
        if (cont) {
            cont.context.disable();
        }
        _menuActivate(id);
        cont = list[id];
        cont.context.setContextManager(this);
        cont.context.enable();
    };

    /**
     * Appends a new entry for a context to the menu
     * 
     * @param {String} id
     * @param {String} name
     */
    var _menuAppend = function (id, name) {
        var span = $n('span', {id: 'mtMenuEntry' + id, className: 'mtMenuInactive'}, name);
        span.bind('click', _handleClick);
        menu.appendChild(span);
    };

    /**
     * Event handler for user context switch request
     * 
     * @param {Object} e
     */
    var _handleClick = function (e) {
        id = e.target.id.substr(11);
        if (!cont || id !== cont.id) {
            self.setContext(id);
        }
    };

    /**
     * Menu activation visulaisation
     * 
     * @param {Object} id
     */
    var _menuActivate = function (id) {
        if (cont) {
            $('mtMenuEntry' + cont.id).className = 'mtMenuInactive';
        }
        $('mtMenuEntry' + id).className = 'mtMenuActive';
    };
}
