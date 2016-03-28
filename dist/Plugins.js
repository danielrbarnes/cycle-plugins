'use strict';

/**
 * @overview Provides observable-based plugins to cycle.js applications.
 * @author Daniel R Barnes
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Plugins = undefined;

var _flattenDeep2 = require('lodash\\flattenDeep');

var _flattenDeep3 = _interopRequireDefault(_flattenDeep2);

var _overSome2 = require('lodash\\overSome');

var _overSome3 = _interopRequireDefault(_overSome2);

var _partial2 = require('lodash\\partial');

var _partial3 = _interopRequireDefault(_partial2);

var _isUndefined2 = require('lodash\\isUndefined');

var _isUndefined3 = _interopRequireDefault(_isUndefined2);

var _isEqualWith2 = require('lodash\\isEqualWith');

var _isEqualWith3 = _interopRequireDefault(_isEqualWith2);

var _isString2 = require('lodash\\isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isEmpty2 = require('lodash\\isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _isEqual2 = require('lodash\\isEqual');

var _isEqual3 = _interopRequireDefault(_isEqual2);

var _identity2 = require('lodash\\identity');

var _identity3 = _interopRequireDefault(_identity2);

var _defaults2 = require('lodash\\defaults');

var _defaults3 = _interopRequireDefault(_defaults2);

var _negate2 = require('lodash\\negate');

var _negate3 = _interopRequireDefault(_negate2);

var _bind2 = require('lodash\\bind');

var _bind3 = _interopRequireDefault(_bind2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _DAG = require('./DAG.js');

var _Plugin = require('./Plugin.js');

var _rxjs = require('rxjs');

var _common = require('./common.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var items = new Set(),
    subject = new _rxjs.BehaviorSubject([]),
    update = function update() {
    return subject.next(Array.from(items));
},
    defaultCriteria = {
    baseType: _Plugin.Plugin,
    targetType: Object,
    enabled: undefined,
    filter: undefined
};

/**
 * Static class for registering and consuming Plugin
 * instances dynamically.
 * @namespace Plugins
 */

var Plugins = exports.Plugins = function () {
    function Plugins() {
        _classCallCheck(this, Plugins);
    }

    _createClass(Plugins, null, [{
        key: 'register',


        /**
         * Makes one or more Plugins available to consumers.
         * @function Plugins#register
         * @alias Plugins#add
         * @param {Plugin | Plugin[]} plugins One or more
         *  Plugin instances to make available to consumers.
         * @example
         * Plugins.register(new Plugin({
         *   name: 'console',
         *   log: function log(msg) { ... }
         * }));
         *
         * Plugins.get({name: 'console'}).first()
         *   .tap(console => console.log('hello'));
         */
        value: function register() {
            var anyAdded = false;

            for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
                plugins[_key] = arguments[_key];
            }

            (0, _flattenDeep3.default)(plugins).filter((0, _common.is)(_Plugin.Plugin)).filter((0, _negate3.default)((0, _bind3.default)(items.has, items))).forEach(function (plugin) {
                anyAdded = true;
                items.add(plugin);
                plugin.on(_Plugin.Plugin.Events.PLUGIN_CHANGED, update);
            });
            if (anyAdded) {
                update();
            }
        }

        /**
         * Makes a Plugin unavailable to consumers.
         * @function Plugins#unregister
         * @alias Plugins.remove
         * @param {Plugin | Plugin[]} plugins One or more Plugin
         *  instances to unregister.
         * @example
         * var plugin = new Plugin({name: 'temp'});
         * Plugins.register(plugin); // available to consumers
         * Plugins.unregister(plugin); // unavailable to consumers
         */

    }, {
        key: 'unregister',
        value: function unregister() {
            var anyRemoved = false;

            for (var _len2 = arguments.length, plugins = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                plugins[_key2] = arguments[_key2];
            }

            (0, _flattenDeep3.default)(plugins).filter(function (plugin) {
                return items.has(plugin);
            }).forEach(function (plugin) {
                anyRemoved = true;
                items.delete(plugin);
            });
            if (anyRemoved) {
                update();
            }
        }

        /**
         * Returns an Observable populated with an array of
         * Plugin instances matching the specified criteria.
         * The array contains a utility method called `toDAG`
         * that will return a DAG instance you can use to
         * iterate safely over the returned Plugin instances
         * in a way that respects the `index` and `after`
         * properties of each Plugin.
         * @function Plugins#get
         * @param {Object} criteria A map of criteria to apply
         *  against each registered Plugin. Only Plugin instances
         *  matching the specified criteria will be included in
         *  the resulting Observable.
         * @throws {Error} Invalid criteria was specified.
         * @example
         * // retrieve a single Plugin by name
         * var single$ = Plugins.get({name: 'my-one-plugin'}).first();
         * @example
         * // retrieve all registered Plugin instances
         * var allPlugins$ = Plugins.get(); // or Plugins.get({})
         * @example
         * // retrieve all Plugin instances targeting a specific type
         * var targeted$ = Plugins.get({targetType: MyClass});
         * @example
         * // retrieve Plugin instances matching a specific filter;
         * // the Plugin would need 'my-criteria' in its `filter.any`
         * // string array and NOT in its `filter.none` string array.
         * var filtered$ = Plugins.get({filter: 'my-criteria'});
         * @example
         * // iterating through Plugins concurrently and in a
         * // dependency-safe order:
         * let savePlugins$ = Plugins.get({
         *   targetType: MyClass, filter: 'save'
         * });
         *
         * function save() {
         *   return savePlugins$.map(plugins =>
         *     new Observable(observer =>
         *       plugins.toDAG().forEach(
         *         (plugin, next) => plugin.doSomething(), next(),
         *         (err) => err ? observer.error(err) : observer.next()
         *       );
         *     ));
         * }
         */

    }, {
        key: 'get',
        value: function get() {
            var criteria = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

            (0, _defaults3.default)(criteria, defaultCriteria);
            if ((0, _isString3.default)(criteria.targetType)) {
                throw new Error(_common.Errors.INVALID_CRITERIA_TARGET);
            }
            return new _rxjs.Observable(function PluginObservable(observer) {
                var firstTime = true;
                return subject.subscribe(function (plugins) {
                    var result = plugins.filter(function (plugin) {
                        var name = plugin.name;
                        var filter = plugin.filter;
                        var enabled = plugin.enabled;
                        var targetType = plugin.targetType;
                        var matchesName = (0, _overSome3.default)(_isUndefined3.default, (0, _partial3.default)(_isEqual3.default, name));
                        var matchesEnabled = (0, _overSome3.default)(_isUndefined3.default, (0, _partial3.default)(_isEqual3.default, enabled));
                        return matchesName(criteria.name) && matchesEnabled(criteria.enabled) && (0, _common.is)(criteria.baseType)(plugin) && (0, _common.is)(targetType)(criteria.targetType) && (0, _common.isFilterMatch)(filter, criteria.filter);
                    });
                    if (firstTime && (0, _isEmpty3.default)(result)) {
                        return; // don't publish the initial empty array
                    }
                    firstTime = false;
                    result.sort(function (a, b) {
                        return a.index - b.index;
                    });
                    result.toDAG = function () {
                        return new (Function.prototype.bind.apply(_DAG.DAG, [null].concat(_toConsumableArray(plugins))))();
                    };
                    observer.next(result);
                });
            }).distinctUntilChanged(_identity3.default, _isEqualWith3.default);
        }
    }, {
        key: 'clear',
        value: function clear() {
            items.clear();
            update();
        }
    }]);

    return Plugins;
}();

Plugins.add = Plugins.register;
Plugins.remove = Plugins.unregister;