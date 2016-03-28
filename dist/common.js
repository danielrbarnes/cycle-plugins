'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.is = exports.isFilterMatch = exports.defaultFilter = exports.Errors = undefined;

var _defaultsDeep3 = require('lodash\\defaultsDeep');

var _defaultsDeep4 = _interopRequireDefault(_defaultsDeep3);

var _isUndefined2 = require('lodash\\isUndefined');

var _isUndefined3 = _interopRequireDefault(_isUndefined2);

var _isFunction2 = require('lodash\\isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isString2 = require('lodash\\isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isEqual2 = require('lodash\\isEqual');

var _isEqual3 = _interopRequireDefault(_isEqual2);

var _isEmpty2 = require('lodash\\isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _includes2 = require('lodash\\includes');

var _includes3 = _interopRequireDefault(_includes2);

var _constant2 = require('lodash\\constant');

var _constant3 = _interopRequireDefault(_constant2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
  * @private
  * @desc Errors
  * @type {Object}
  * @property {String} ALL_PLUGINS
  * @property {String} NAME_REQUIRED
  * @property {String} INVALID_INDEX
  * @property {String} INVALID_AFTER
  * @property {String} INVALID_TARGET
  * @property {String} INVALID_FILTER
  * @property {String} INVALID_CRITERIA_TARGET
  */
var Errors = exports.Errors = {
    ALL_PLUGINS: 'Parameters must all be Plugin instances.',
    NAME_REQUIRED: 'Property `name` must be a non-empty string.',
    INVALID_INDEX: 'Property `index` must be a number.',
    INVALID_AFTER: 'Property `after` must be an array of non-empty strings.',
    INVALID_TARGET: 'Property `targetType` must be a class or string.',
    INVALID_FILTER: 'Property `filter` must be an object with any and none arrays.',
    INVALID_CRITERIA_TARGET: 'Criteria `targetType` cannot be a string.'
};

var defaultFilter = exports.defaultFilter = {
    any: [],
    none: []
};

var isFilterMatch = exports.isFilterMatch = function isFilterMatch(filter, criteria) {
    if ((0, _isUndefined3.default)(criteria)) {
        return true;
    }

    var _defaultsDeep2 = (0, _defaultsDeep4.default)(filter, defaultFilter);

    var any = _defaultsDeep2.any;
    var none = _defaultsDeep2.none;

    if ((0, _isEmpty3.default)(any) && (0, _isEmpty3.default)(none)) {
        return false; // filter specified, but nothing set on the plugin
    }
    return ((0, _isEmpty3.default)(any) || (0, _includes3.default)(any, criteria)) && ((0, _isEmpty3.default)(none) || !(0, _includes3.default)(none, criteria));
};

var is = exports.is = function is(Type) {
    return function (item) {

        /*
         * item     Type        result
         * ======== =========== =======
         * null                 false
         * TypeName Type        is(Type)(global[item])
         * TypeName instance    is(Type.constructor)(global[item])
         * TypeName TypeName    is(global[Type])(global[item])
         * instance Type        item instanceof Type
         * instance instance    item instanceof Type.constructor
         * instance TypeName    item.constructor === Type || loop: proto.constructor === Type
         * Type     Type        item === Type || is(Type)(item.prototype)
         * Type     instance    is(Type.constructor)(item)
         * Type     TypeName    is(global[Type])(item)
         */

        if ( /* jshint -W041 */item == null) {
            return false;
        }

        var keyType = (0, _isString3.default)(Type) ? 'string' : (0, _isFunction3.default)(Type) ? 'function' : 'object',
            keyItem = (0, _isString3.default)(item) ? 'string' : (0, _isFunction3.default)(item) ? 'function' : 'object';

        return logicTable[keyItem][keyType](item, Type);
    };
};

var getType = function getType(Name) {
    if (Name in global) {
        return global[Name];
    }
    /* jshint -W061 */
    return eval(Name.replace(/[^a-z\$_]/gi, ''));
};

var logicTable = {
    string: {
        function: function _function(item, Type) {
            return is(Type)(getType(item));
        },
        object: function object(item, Type) {
            return is(Type.constructor)(getType(item));
        },
        string: function string(item, Type) {
            return is(getType(Type))(getType(item));
        }
    },
    object: {
        function: function _function(item, Type) {
            return item instanceof Type;
        },
        object: function object(item, Type) {
            return item instanceof Type.constructor;
        },
        string: function string(item, Type) {
            if (item.constructor.name === Type) {
                return true;
            }
            var current = Object.getPrototypeOf(item);
            while (!!current && current !== Object.prototype) {
                if (current.constructor.name === Type) {
                    return true;
                }
                current = Object.getPrototypeOf(current);
            }
            return false;
        }
    },
    function: {
        function: function _function(item, Type) {
            return item === Type || is(Type)(Object.getPrototypeOf(item));
        },
        object: function object(item, Type) {
            return is(Type.constructor)(item);
        },
        string: function string(item, Type) {
            return is(getType(Type))(item);
        }
    }
};