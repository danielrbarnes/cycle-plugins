'use strict';

/**
 * @overview An extensible object.
 * @author Daniel R Barnes
 */

import {
    cond,
    flow,
    trim,
    uniq,
    extend,
    assign,
    negate,
    conforms,
    constant,
    isEmpty,
    isArray,
    isString,
    isFunction,
    isSafeInteger,
    overSome,
    overEvery,
    defaultsDeep,
    partialRight,
    every
} from 'lodash';

import {Broker} from 'cycle-events';
import {Errors, defaultFilter} from './common.js';

const defaultProps = {
    index: 0,
    after: [],
    enabled: true,
    targetType: Object,
    filter: defaultFilter
};

const validateSchema = cond([
    [negate(conforms({name: isString})), constant(Errors.NAME_REQUIRED)],
    [conforms({name: flow(trim, isEmpty)}), constant(Errors.NAME_REQUIRED)],
    [negate(conforms({index: isSafeInteger})), constant(Errors.INVALID_INDEX)],
    [negate(conforms({after: isArray})), constant(Errors.INVALID_AFTER)],
    [negate(conforms({
        after: overSome(
            isEmpty,
            partialRight(every, overEvery(
                isString,
                negate(flow(trim, isEmpty))
            ))
        )
    })), constant(Errors.INVALID_AFTER)],
    [negate(conforms({
        targetType: overSome(isFunction, isString)
    })), constant(Errors.INVALID_TARGET)],
    [negate(conforms({
        filter: conforms({
            any: isArray,
            none: isArray
        })
    })), constant(Errors.INVALID_FILTER)]
]);

/**
 * An event broker.
 * @external Broker
 */

/**
 * @typedef
 * @name Filter
 * @desc Enables plugin creators to restrict which
 *  consumers will be able to access their plugin.
 * @property {String[]} any A list of filter strings,
 *  at least one of which must match the filter provided
 *  to Plugins.get.
 * @property {String[]} none A list of filter strings,
 *  none of which must match the filter provided to
 *  Plugins.get.
 */

/**
 * An extensible object.
 * @class Plugin
 * @inherits {Broker}
 * @param {Object} props A map of property names and
 *  values to apply to the Plugin instance. The only
 *  required property is `name`.
 * @property {String} name The name of this plugin.
 * @property {Number} [index=0] Provides a way to
 *  order multiple Plugins whenever a sequence is
 *  requested.
 * @property {String[]} [after=[]] Provides a way to
 *  order multiple Plugins based on dependencies.
 *  Ensures that this Plugin will be sequenced after
 *  the specified Plugin names. If you prepend a name
 *  with ?, it will be treated as an optional dependency.
 * @property {Boolean} [enabled=true] Some consumers
 *  may use this property to determine which Plugins
 *  should be consumed or which can be skipped during
 *  iteration.
 * @property {Function} [targetType=Object] Used in
 *  conjunction with Plugins.get to ensure both Plugin
 *  creators and Plugin consumers agree on who can
 *  consume this Plugin instance.
 * @property {Filter} [filter={any:[], none:[]}] A
 *  way to restrict the list of Plugins retrieved by
 *  Plugins.get at runtime.
 * @example
 * import {extend, matches} from 'lodash';
 *
 * const COMMAND_PROPS = { ... };
 *
 * class Command extends Plugin
 *   constructor(props) {
 *     super(extend({}, COMMAND_PROPS, props));
 *     Plugins.register(this);
 *   }
 *   execute() {}
 *   undo() {}
 * }
 *
 * class RecordCommand extends Command {
 *   constructor(props) {
 *     super({
 *       targetType: Record,
 *       enabled: User.hasPrivilege(props.name)
 *     });
 *   }
 * }
 *
 * class SaveRecord extends RecordCommand
 *   constructor() {
 *     super({name: 'save-record');
 *   }
 *   execute() { ... }
 *   undo() { ... }
 * }
 *
 * class DeleteRecord extends RecordCommand
 *   constructor() {
 *     super({name: 'delete-record');
 *   }
 *   execute() { ... }
 *   undo() { ... }
 * }
 *
 * class Record extends Broker {
 *   constructor() {
 *     this.commands$ = Plugins.get({
 *       baseType: RecordCommand,
 *       targetType: Record,
 *       enabled: true
 *     });
 *   }
 *
 *   save() {
 *     return this.commands$
 *       .filter(matches({name: 'save-record'}))
 *       .map(command => command.execute(this))
 *       .tap(() => this.emit('record-saved'))
 *       .toPromise();
 *   }
 *
 * }
 */
export class Plugin extends Broker {

    constructor(props) {
        super();
        assign(this, defaultsDeep(props, defaultProps));
        let msg = validateSchema(this);
        if (!isEmpty(msg)) {
            throw new Error(msg);
        }
        this.after = uniq(this.after);
        this.filter.any = uniq(this.filter.any);
        this.filter.none = uniq(this.filter.none);
    }

    /**
     * Events specific to Plugins.
     * @member Plugin.Events
     * @type {Object}
     * @property {String} PLUGIN_CHANGED A property on the plugin has changed.
     *  Emit this event when you wish for any search criteria passed to
     *  Plugins.get to be re-evaluated, with observers notified of any changes.
     */
    static get Events() {
        return extend({
            PLUGIN_CHANGED: 'plugin-changed'
        }, super.Events);
    }

}
