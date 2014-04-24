/**
 * FFHTopo :: Utilities
 *
 * Description:
 *	OOP, DOM & Ajax utilities
 *
 * @author Steven Barth steven-at-midlink-dot-org
 * @license <a href="http://www.gnu.org/licenses/gpl.html">GNU General Public License v3 or later</a>
 * @revision $Id: mtutils.js 7M 2007-11-04 14:05:45Z (lokal) $
 */

var mtUtilsVersion = 0.9;
var mtUtilsVersionString = mtUtilsVersion + " $Rev: 7M $";
//Hacking the Internet Explorer
/*@cc_on @if (@_win32 && @_jscript_version >= 5) if (!window.XMLHttpRequest)
 window.XMLHttpRequest = function() { return new ActiveXObject('Microsoft.XMLHTTP') }
 @end @*/

/**
 * Basic inheritance functionality
 * 
 * @param {Class} parent parent class
 */
Function.prototype.inherits = function(parent) {
    this.prototype = new parent();
    this.prototype.constructor = this;
};

/**
 * Deletes all array entries
 */
Array.prototype.clear = function() {
    this.splice(0, this.length);
};

/**
 * Iterates through the array and invokes the callback function for every entry
 * 
 * @param {function} callback
 */
Array.prototype.iterate = function(callback) {
    var i;
    for (i = 0; i < this.length; i++) {
        callback(this[i]);
    }
};

/**
 * Removes all copies of a certain object from the array
 * 
 * @param object
 */
Array.prototype.remove = function(object) {
    var i;
    for (i = 0; i < this.length; i++) {
        if (this[i] === object) {
            this.splice(i, 1);
        }
    }
};

/**
 * Iterates through the object as if it was a hashtable
 * and calls the callback function for every entry
 * 
 * @param {object} object object to be iterated
 * @param {function} callback
 * @param {boolean} includeKeys provide key to the callback
 */
Object.foreach = function(object, callback, includeKeys) {
    var i;
    for (i in object) {
        if (includeKeys) {
            callback(i, object[i]);
        } else {
            callback(object[i]);
        }
    }
};

/**
 * Simple replacement for document.getElementById which automatically
 * extends the returned DOM-Node with several utility functions
 * 
 * @param {string|HTMLElement} element
 * @return {HTMLElement} element
 */
function $(element) {
    if (typeof element === "string") {
        element = document.getElementById(element);
    }

    if (typeof element !== "object" || element === null) {
        return null;
    } else {
        return DOM.extend(element);
    }
}

/**
 * Creates a new DOM-Node with specified attributes and childnodes
 * The node will automatically extended with the DOM utility functions
 * 
 * @param {string} tagname xhtml-tag of the new node
 * @param {object} attribs object which keys and values will be the attributes of the new node
 * @param {HTMLElement|string|array} children either a string (textnode) a dom node or an array containing several of them
 * @return {HTMLElement} node
 */
function $n(tagname, attribs, children) {
    var node = document.createElement(tagname);
    var i;
    if (typeof attribs === "object") {
        for (i in attribs) {
            node[i] = attribs[i];
        }
    }

    node = DOM.extend(node);

    if (typeof children !== "undefined") {
        node.append(children);
    }

    return node;
}

/**
 * Create a new XMLHttpRequest (AJAX-Request)
 * 
 * @param {string} url
 * @param {object} config
 * @config {string} method HTTP-Method (GET, POST, ...) [GET]
 * @config {boolean} async Asynchronous request? [true]
 * @config {string} contentType content-type of content [application/x-www-form-urlencoded]
 * @config {function} onSuccess callback function which wille be invoked when request succeeds [void()]
 * @config {function} onFailure callback function which wille be invoked when request fails [void()]
 * @config {string} content request body [null]
 */
function $a(url, config) {
    var request = new XMLHttpRequest();

    if (typeof config.method === "undefined") {
        config.method = "GET";
    }

    if (typeof config.async === "undefined") {
        config.async = true;
    }

    if (typeof config.contentType === "undefined") {
        config.contentType = "application/x-www-form-urlencoded";
    }

    if (typeof config.onSuccess === "undefined") {
        config.onSuccess = function() {
        };
    }

    if (typeof config.onFailure === "undefined") {
        config.onFailure = function() {
        };
    }

    if (typeof config.content === "undefined") {
        config.content = null;
    }

    request.open(config.method, url, config.async);
    request.setRequestHeader("Content-Type", config.contentType);
    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status === 200) {
            config.onSuccess(request);
        } else if (request.readyState === 4 && request.status !== 200) {
            config.onFailure(request);
        }
    };
    request.send(config.content);
}

/**
 * DOM utility object
 */
var DOM = {
    domHelpers: {
        append: function(obj) {
            var i;
            if (!(obj instanceof Array)) {
                if (typeof obj === "string") {
                    this.appendChild(document.createTextNode(obj));
                } else {
                    this.appendChild(obj);
                }
            } else {
                for (i = 0; i < obj.length; i++) {
                    if (typeof obj[i] === "string") {
                        this.appendChild(document.createTextNode(obj[i]));
                    } else {
                        this.appendChild(obj[i]);
                    }
                }
            }

            return this;
        },
        applyStyle: function(obj) {
            var i;
            for (i in obj) {
                this.style[i] = obj[i];
            }
            return this;
        },
        cloneChildren: function(target) {
            var i;
            for (i = 0; i < this.childNodes.length; i++) {
                target.appendChild(this.childNodes[i].cloneNode(true));
            }
        },
        removeChildren: function() {
            while (this.childNodes.length > 0) {
                this.removeChild(this.firstChild);
            }
        },
        bind: function(type, callback, mode) {
            if (typeof mode === "undefined") {
                mode = false;
            }
            if (!this.addEventListener) {
                var ieCallback = function() {
                    var e = window.event;
                    if (!e.target && e.srcElement) {
                        e.target = e.srcElement;
                    };
                    e.target['_eCB' + type + callback] = callback;
                    e.target['_eCB' + type + callback](e);
                    e.target['_eCB' + type + callback] = null;
                };
                this.attachEvent('on' + type, ieCallback);
            } else {
                this.addEventListener(type, callback, mode);
            }
            return this;
        },
        unbind: function (type, callback) {
            if (!this.removeEventListener) {
                this.detachEvent('on' + type);
            } else {
                this.removeEventListener(type, callback, false);
            }
            return this;
        }

    },
    /**
     * Extends a DOM node with several utility functions
     * Unfortunately we cannot use prototyping (thank the shitty IE)
     * 
     * @param {HTMLElement} elem element to be extend
     * @return {HTMLElement} extended element
     */
    extend: function (elem) {
        var i;
        for (i in DOM.domHelpers) {
            if (!(i in elem)) {
                elem[i] = DOM.domHelpers[i];
            } else {
                break;
            }
        }
        return elem;
    }
};