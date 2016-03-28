'use strict';

/**
 * @overview Provides a directed acyclic graph to manage Plugin dependencies.
 * @author Daniel R Barnes
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DAG = undefined;

var _flattenDeep2 = require('lodash\\flattenDeep');

var _flattenDeep3 = _interopRequireDefault(_flattenDeep2);

var _isUndefined2 = require('lodash\\isUndefined');

var _isUndefined3 = _interopRequireDefault(_isUndefined2);

var _isFunction2 = require('lodash\\isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isInteger2 = require('lodash\\isInteger');

var _isInteger3 = _interopRequireDefault(_isInteger2);

var _isError2 = require('lodash\\isError');

var _isError3 = _interopRequireDefault(_isError2);

var _isEqual2 = require('lodash\\isEqual');

var _isEqual3 = _interopRequireDefault(_isEqual2);

var _attempt2 = require('lodash\\attempt');

var _attempt3 = _interopRequireDefault(_attempt2);

var _concat2 = require('lodash\\concat');

var _concat3 = _interopRequireDefault(_concat2);

var _uniq2 = require('lodash\\uniq');

var _uniq3 = _interopRequireDefault(_uniq2);

var _gt2 = require('lodash\\gt');

var _gt3 = _interopRequireDefault(_gt2);

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rxjs = require('rxjs');

var _common = require('./common.js');

var _Plugin = require('./Plugin.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Errors = {
    EXPECTED_FUNCTION_CALLBACK: 'Parameter `callback` must be a function.',
    EXPECTED_POSITIVE_CONCURRENCY: 'Parameter `concurrency` must be a positive integer.'
},
    data = new WeakMap();

var Node = function () {
    function Node(value) {
        _classCallCheck(this, Node);

        this.value = value;
        this.children = [];
        this.parent = undefined;
    }

    _createClass(Node, [{
        key: 'size',
        value: function size() {
            return this.children.length + this.children.reduce(function (res, child) {
                return res + child.size();
            }, 0);
        }
    }, {
        key: 'addChild',
        value: function addChild(node) {
            if (!(0, _isUndefined3.default)(node.find(this))) {
                throw new Error('Cycle detected between ' + node.value.name + ' and ' + this.value.name + '.');
            }
            if (!(0, _isUndefined3.default)(node.parent)) {
                node.parent.children.splice(node.parent.children.indexOf(node), 1);
            }
            this.children = (0, _uniq3.default)((0, _concat3.default)(this.children, node));
            node.parent = this;
        }
    }, {
        key: 'findByName',
        value: function findByName(name) {
            if (this.value && (0, _isEqual3.default)(this.value.name, name)) {
                return this;
            }
            return this.children.reduce(function (result, child) {
                return result || child.findByName(name);
            }, undefined);
        }
    }, {
        key: 'find',
        value: function find(node) {
            if ((0, _isEqual3.default)(node, this)) {
                return this;
            }
            return this.children.reduce(function (result, child) {
                return result || child.find(node);
            }, undefined);
        }
    }, {
        key: 'toString',
        value: function toString() {
            var name = this.value && this.value.name || 'root';
            return name + ' : [' + this.children.join(', ') + ']';
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
            return {
                name: this.value && this.value.name || 'root',
                children: this.children.map(function (child) {
                    return child.toJSON();
                })
            };
        }
    }]);

    return Node;
}();

var DAG = exports.DAG = function () {

    /**
      * Provides a dependency-safe way to iterate through plugins.
      * @class DAG
      * @param {Plugin | Plugin[]} plugins One or more Plugin instances the DAG should manage.
      * @throws {Error} If a dependent Plugin is not optional and not in the set of Plugins
      *  provided to the constructor, an error will be thrown. You can mark a dependency as
      *  optional by prepending it with a question mark. See the documentation for Plugin
      *  for more information.
      * @example
      * var dag = new DAG(pluginA, pluginB, pluginC);
      * dag.forEach(function iterate(plugin, next) {
      *   // do something with plugin
      *   next(); // invoke this callback with the next plugin
      *   // if you wish to stop iteration immediately, invoke
      *   // next with an argument: next(0) or next('stop') or
      *   // next(new Error()) -- the argument will be passed
      *   // to your success handler function
      * }, function finished(err) {
      *   if (err) {
      *     console.log('An error occurred:', err);
      *   }
      * });
      */

    function DAG() {
        _classCallCheck(this, DAG);

        var root = new Node();
        data.set(this, root);

        for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
            plugins[_key] = arguments[_key];
        }

        (0, _uniq3.default)((0, _flattenDeep3.default)(plugins)).filter((0, _common.is)(_Plugin.Plugin)).map(function (vertex) {
            return new Node(vertex);
        }).forEach(function (node) {
            return root.addChild(node);
        });

        (0, _concat3.default)(root.children).forEach(function (node) {
            node.value.after.forEach(function (after) {
                var _after$match = after.match(/^(\??)(.+)$/);

                var _after$match2 = _slicedToArray(_after$match, 3);

                var opt = _after$match2[1];
                var name = _after$match2[2];
                var target = root.findByName(name);
                if ((0, _isUndefined3.default)(target)) {
                    if (opt !== '?') {
                        throw new Error(node.value.name + ' must be after ' + after + ', which does not exist.');
                    }
                } else {
                    target.addChild(node);
                    node = target; // may not be optimal
                }
            });
        });
    }

    /**
     * Converts the DAG into a dependency-safe sequence of Plugin instances.
     * @function DAG#toArray
     * @returns {Plugin[]} An array of Plugin instances in dependency-safe order.
     * @example
     * var dag = new DAG(pluginA, pluginB, pluginC);
     * var names = dag.toArray().map(function(plugin) {
     *   return plugin.name;
     * });
     * log(names);
     */


    _createClass(DAG, [{
        key: 'toArray',
        value: function toArray() {
            var result = [],
                append = function append(value, next) {
                result.push(value);
                next();
            };
            this.forEach(append, null, 1);
            return result;
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
            return data.get(this).toJSON();
        }
    }, {
        key: 'toString',
        value: function toString() {
            return data.get(this).toString();
        }

        /**
         * Iterates through the DAG in dependency-safe order using
         * the specified callback function and concurrency settings.
         * @function DAG#forEach
         * @param {Function} callback A method that will be invoked
         *  for each Plugin instance. Arguments will be:
         *   - {Plugin} plugin - the current plugin
         *   - {Function} next - method to invoke to continue iteration
         *   - {Number} percent - a number between 0 and 100 indicating
         *      how much of the DAG has been processed
         * @param {Function} [finish] An optional method to invoke
         *  when the DAG has been completely processed. If an error
         *  has occurred or the iteration ended early, the only argument
         *  will be the exit reason.
         * @param {Number} [concurrency=5] How many Plugins to iterate
         *  concurrently. The number must be a positive integer.
         * @throws {Error} Parameter `callback` must be a function.
         * @throws {Error} Parameter `concurrency` must be a positive
         *  integer.
         * @example
         * new DAG(pluginA, pluginB, pluginC)
         *   .forEach((plugin, next, percent) => {
         *     log(`running ${plugin.name} - ${percent}% complete`);
         *     next('stop'); // stop iterating early
         *   }, err => {
         *     if (err) {
         *       log('stopped early because:', err);
         *     }
         *   });
         */

    }, {
        key: 'forEach',
        value: function forEach(callback, finish) {
            var concurrency = arguments.length <= 2 || arguments[2] === undefined ? 5 : arguments[2];


            if (!(0, _isFunction3.default)(callback)) {
                throw new Error(Errors.EXPECTED_FUNCTION_CALLBACK);
            }

            if (!(0, _isInteger3.default)(concurrency) || !(0, _gt3.default)(concurrency, 0)) {
                throw new Error(Errors.EXPECTED_POSITIVE_CONCURRENCY);
            }

            var root = data.get(this),
                queue = (0, _concat3.default)(root.children),
                total = root.size(),
                finished = false,
                numRun = 0,
                active = 0,
                done = function done(err) {
                if (!finished) {
                    finished = true;
                    if ((0, _isFunction3.default)(finish)) {
                        finish(err);
                    }
                }
            },
                getNext = function getNext(node) {
                return function (err) {
                    numRun++;
                    active--;
                    if (!(0, _isUndefined3.default)(err)) {
                        return done(err);
                    }
                    if (!(0, _gt3.default)(total, numRun)) {
                        return (0, _isEqual3.default)(0, active) && done();
                    }
                    queue = (0, _concat3.default)(queue, node.children);
                    processNext();
                };
            },
                processNext = function processNext() {

                queue.sort(function (a, b) {
                    return a.value.index - b.value.index;
                });
                queue.splice(0, concurrency - active).forEach(function (node) {

                    if (finished) {
                        return;
                    }

                    active++;

                    var plugin = node && node.value,
                        error = (0, _attempt3.default)(callback, plugin, getNext(node), Math.ceil(numRun / total * 100));

                    if ((0, _isError3.default)(error)) {
                        done(error);
                    }
                });
            };

            processNext();
        }
    }]);

    return DAG;
}();