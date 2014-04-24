/**
 * FFHTopo :: Widget Helper
 *
 * Description:
 *	Several DOM, Sidebar and Infowindow widgets
 * 
 * Depends:
 *	FFHTopo Utils (mtutils.js)
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtwidgets.js 20M 2007-11-04 14:05:55Z (lokal) $
 */

/**
 * Creates a new sidebar manager
 * 
 * @param {HTMLElement} sidebar sidebar layer id
 * @constructor
 */
function mtSidebarManager(sidebar) {
    var widgets = [];

    /**
     * Adds a widget to the sidebar
     * 
     * @param {HTMLElement} widget widget to be added
     */
    this.addWidget = function (widget) {
        widgets.push(widget);
        sidebar.appendChild(widget);
    };

    /**
     * draws stored widgets 
     */
    this.draw = function () {
        var i;
        for (i = 0; i < widgets.length; i++) {
            sidebar.appendChild(widgets[i]);
        }
    };

    /**
     * clears drawn widgets
     */
    this.clear = function () {
        while (sidebar.childNodes.length > 0) {
            sidebar.removeChild(sidebar.firstChild);
        }
    };
}

/**
 * Sidebar widget base function
 * 
 * @param {String} caption title
 * @param {HTMLElement} node content node
 * 
 * @return {HTMLElement} block
 */
function mtWidget(caption, node) {
    var bcapt = $n('div', {className: 'mtLegendCaption'}, caption);
    var block = $n('div', {className: 'mtBlock'}, bcapt);

    if (node) {
        block.appendChild(node);
    }

    return block;
}

/**
 * Sidebar text widget
 * 
 * @param {String} caption title
 * @param {String} text text content
 * 
 * @return {HTMLElement} block
 */
function mtTextWidget(caption, text) {
    var block = mtWidget(caption);
    var i;

    for (i = 0; i < text.length; i++) {
        block.appendChild($n('div', null, text[i]));
    }

    return block;
}

/**
 * Sidebar search widget
 * 
 * @param {String} caption title
 * @param {Function} callback search callback function
 * 
 * @return {HTMLElement} block
 */
function mtSearchWidget(caption, callback) {
    var txtfield = $n('input', {type: 'text', id: 'mtAddressLookup'});
    var button = $n('button', {id: 'mtAddressButton'}, 'Los');
    var w = mtWidget(caption).append([txtfield, ' ', button]);
    button.bind('click', function() {
        return callback(txtfield);
    });
    return w;
}

/**
 * Sidebar link information widget
 * 
 * @param {String} caption title
 * @param {Object} llink link object
 * 
 * @return {HTMLElement} block
 */
function mtLinkWidget(caption, llink) {
    return mtTextWidget(caption,
            [llink.src.hostname + ' <-> ' + llink.dest.hostname,
                Math.round(llink.dist) + 'm - ' +
                        Math.round(llink.qual * 10000) / 100 + '%']);
}

/**
 * Infowindow tab
 * 
 * @param {String} caption title
 * @param {HTMLElement} node content
 * 
 * @return {HTMLElement} block
 */
function mtTab(caption, node) {
    return {title: caption, descr: node};
}

/**
 * Infowindow node information tab
 * 
 * @param {Object} node network node object
 * 
 * @return {HTMLElement} block
 */
function mtInfoTab(node) {
    var descrGeo = $n('div');
    if (node.llaccuracy < 10) {
        descrGeo.style.color = 'orange';
        descrGeo.append('Position: ~ ' + node.latitude + ' ' + node.longitude);
    } else {
        descrGeo.style.color = 'darkgreen';
        descrGeo.append('Position: ' + node.latitude + ' ' + node.longitude);
    }

    var descrHardware = $n('div', null, 'FFF ' + node.version + ' auf ' + mtHardwareLookup(node.board));
    var descrWLAN = $n('div', null, 'Verbindung mit ' + node.rate + ' Mbps auf Kanal ' + node.channel);
    var descrAdmin = $n('div', null, 'Besitzer: ' + node.nick);

    var descrMain = $n('div', null, [descrGeo, descrHardware, descrWLAN, descrAdmin]);

    return mtTab(node.ipv4.replace(/^[0-9]+\.[0-9]+\./, "") + ' (' + node.hostname + ')', descrMain);
}

/**
 * Infowindow point information tab
 * 
 * @param {String} caption
 * @param {Float} lat latitude
 * @param {Float} lng longitude
 * 
 * @return {HTMLElement} block
 */
function mtPointTab(caption, lat, lng) {
    return mtTab(caption, $n('div', null, 'Position: ' + lat + ' ' + lng));
}

/**
 * Infowindow HNA information tab
 * 
 * @param {string} caption
 * @param {mtContext} context
 * @param {array} nodes
 * 
 * @return {HTMLElement} block
 */
function mtHnaTab(caption, context, nodes) {
    var nodelist = [];
    var i,q;
    for ( i = 0; i < nodes.length; i++) {
        if (typeof nodes[i].target === "undefined") {
            continue;
        }
        if (nodes[i].q !== 0) {
            q = Math.round(10000 / nodes[i].q) / 100 + '%';
        } else {
            q = 'n/a';
        }
        var nodeentry = $n('div', null, [nodes[i].target.ipv4, ' (' +
                    nodes[i].c + '; ' + q + ')']);
        nodeentry.style.cursor = 'pointer';
        nodeentry.bind('click', function (e) {
            context.selectMenuEntry(e.target.firstChild.nodeValue);
        });
        nodelist.push(nodeentry);
    }
    return mtTab(caption, $n('div', null, nodelist));
}

/**
 * Infowindow node information tab
 * 
 * @param {Object} node network node object
 * @param {mtContext} context map context object
 * 
 * @return {HTMLElement} block
 */
function mtLinkTab(node, context) {
    var _sort = function(a, b) {
        if (a.type === b.type) {
            if (a.quality === b.quality) {
                return natcompare(a.ip, b.ip);
            } else {
                return (a.quality < b.quality) ? -1 : 1;
            }
        } else {
            return natcompare(a.type, b.type);
        }
    };

    var descrLinks = $n('div');
    var i;
    var linksa = [];
    for (i in node.links) {
        var c = node.links[i];
        c.ip = node.links[i].dest;
        linksa.push(c);
    }

    linksa.sort(_sort);

    for (var i = 0; i < linksa.length; i++) {
        var link = linksa[i];
        var linkLine = $n('div');
        if (link.quality >= 0.5) {
            linkLine.style.color = 'darkgreen';
        } else if (link.quality >= 0.25) {
            linkLine.style.color = 'orange';
        } else if (link.quality < 0.25 && link.quality > 0) {
            linkLine.style.color = 'darkred';
        } else {
            linkLine.style.color = 'black';
        }

        linkLine.append(link.type + ' zu ');

        var tspan = $n('span', {}, link.ip);
        tspan.style.cursor = 'pointer';
        linkLine.appendChild(tspan);

        tspan.bind('click', function(e) {
            context.selectMenuEntry(e.target.firstChild.nodeValue);
        });

        if (link.quality !== 0) {
            linkLine.append(' (' + Math.round(link.quality * 10000) / 100 + '%)');
        }

        descrLinks.appendChild(linkLine);
    }

    return mtTab('Verbindungen', descrLinks);
}

/**
 * Infowindow object selection tab
 * 
 * @param {String} id unique tab id
 * @param {mtContext} context map context object
 * 
 * @return {HTMLElement} block
 */
function mtSelectTab(id, context) {
    var did = 'mtSelectTab_' + id;
    var node = node;

    var calculate = function(e) {
        var a = context.map.markerGetPoint(context.getRegistered(id));
        var b = context.map.markerGetPoint(context.getRegistered(e.target.value));
        $(did).replaceChild(document.createTextNode(Math.round(context.map.distance(a, b))), $(did).childNodes[1]);
        $(did).replaceChild(document.createTextNode(Math.round(context.map.angle(a, b))), $(did).childNodes[5]);
    };

    var dist = $n('span', null, 'Entfernung: ');
    var out = $n('div', {id: did}, [dist, '-', 'm']);

    var direct = $n('span', null, 'Ausrichtung: ');
    out.append([$n('br'), direct, '-', '\u00b0']);

    var dom = $n('div', null, [context._buildItemSelector(calculate), out]);

    return mtTab('Vektorberechnung zu ', dom);
}
