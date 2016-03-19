'use strict';

import {
    constant,
    includes,
    isEmpty,
    isEqual,
    isString,
    isFunction,
    isUndefined,
    defaultsDeep
} from 'lodash';

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
export const Errors = {
    ALL_PLUGINS : 'Parameters must all be Plugin instances.',
    NAME_REQUIRED: 'Property `name` must be a non-empty string.',
    INVALID_INDEX: 'Property `index` must be a number.',
    INVALID_AFTER: 'Property `after` must be an array of non-empty strings.',
    INVALID_TARGET: 'Property `targetType` must be a class or string.',
    INVALID_FILTER: 'Property `filter` must be an object with any, all, and none arrays.',
    INVALID_CRITERIA_TARGET: 'Criteria `targetType` cannot be a string.'
};

export const defaultFilter = {
    any: [],
    none: []
};

export const isFilterMatch = (filter, criteria) => {
    if (isUndefined(criteria)) {
        return true;
    }
    let {any, none} = defaultsDeep(filter, defaultFilter);
    if (isEmpty(any) && isEmpty(none)) {
        return false; // filter specified, but nothing set on the plugin
    }
    return  (isEmpty(any)  || includes(any, criteria)) &&
            (isEmpty(none) || !includes(none, criteria));
};

export const is = Type => item => {
    
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
    
    if (/* jshint -W041 */ item == null) {
        return false;
    }
    
    let keyType = isString(Type) ? 'string' : isFunction(Type) ? 'function' : 'object',
        keyItem = isString(item) ? 'string' : isFunction(item) ? 'function' : 'object';
    
    return logicTable [keyItem] [keyType] (item, Type);
    
};

const getType = Name => {
    if (Name in global) {
        return global[Name];
    }
    /* jshint -W061 */
    return eval(Name.replace(/[^a-z\$_]/gi, ''));
};

const logicTable = {
    string: {
        function: (item, Type) => is(Type)(getType(item)),
        object: (item, Type) => is(Type.constructor)(getType(item)),
        string: (item, Type) => is(getType(Type))(getType(item))
    },
    object: {
        function: (item, Type) => item instanceof Type,
        object: (item, Type) => item instanceof Type.constructor,
        string: (item, Type) => {
            if (item.constructor.name === Type) {
                return true;
            }
            let current = Object.getPrototypeOf(item);
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
        function: (item, Type) => item === Type || is(Type)(Object.getPrototypeOf(item)),
        object: (item, Type) => is(Type.constructor)(item),
        string: (item, Type) => is(getType(Type))(item)
    }
};
