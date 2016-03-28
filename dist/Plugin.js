'use strict';

/**
 * @overview An extensible object.
 * @author Daniel R Barnes
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Plugin = undefined;

var _every2 = require('lodash\\every');

var _every3 = _interopRequireDefault(_every2);

var _partialRight2 = require('lodash\\partialRight');

var _partialRight3 = _interopRequireDefault(_partialRight2);

var _defaultsDeep2 = require('lodash\\defaultsDeep');

var _defaultsDeep3 = _interopRequireDefault(_defaultsDeep2);

var _overEvery2 = require('lodash\\overEvery');

var _overEvery3 = _interopRequireDefault(_overEvery2);

var _overSome2 = require('lodash\\overSome');

var _overSome3 = _interopRequireDefault(_overSome2);

var _isSafeInteger2 = require('lodash\\isSafeInteger');

var _isSafeInteger3 = _interopRequireDefault(_isSafeInteger2);

var _isFunction2 = require('lodash\\isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isString2 = require('lodash\\isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isArray2 = require('lodash\\isArray');

var _isArray3 = _interopRequireDefault(_isArray2);

var _isEmpty2 = require('lodash\\isEmpty');

var _isEmpty3 = _interopRequireDefault(_isEmpty2);

var _constant2 = require('lodash\\constant');

var _constant3 = _interopRequireDefault(_constant2);

var _conforms2 = require('lodash\\conforms');

var _conforms3 = _interopRequireDefault(_conforms2);

var _negate2 = require('lodash\\negate');

var _negate3 = _interopRequireDefault(_negate2);

var _assign2 = require('lodash\\assign');

var _assign3 = _interopRequireDefault(_assign2);

var _extend2 = require('lodash\\extend');

var _extend3 = _interopRequireDefault(_extend2);

var _uniq2 = require('lodash\\uniq');

var _uniq3 = _interopRequireDefault(_uniq2);

var _trim2 = require('lodash\\trim');

var _trim3 = _interopRequireDefault(_trim2);

var _flow2 = require('lodash\\flow');

var _flow3 = _interopRequireDefault(_flow2);

var _cond2 = require('lodash\\cond');

var _cond3 = _interopRequireDefault(_cond2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _cycleEvents = require('cycle-events');

var _common = require('./common.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultProps = {
    index: 0,
    after: [],
    enabled: true,
    targetType: Object,
    filter: _common.defaultFilter
};

var validateSchema = (0, _cond3.default)([[(0, _negate3.default)((0, _conforms3.default)({ name: _isString3.default })), (0, _constant3.default)(_common.Errors.NAME_REQUIRED)], [(0, _conforms3.default)({ name: (0, _flow3.default)(_trim3.default, _isEmpty3.default) }), (0, _constant3.default)(_common.Errors.NAME_REQUIRED)], [(0, _negate3.default)((0, _conforms3.default)({ index: _isSafeInteger3.default })), (0, _constant3.default)(_common.Errors.INVALID_INDEX)], [(0, _negate3.default)((0, _conforms3.default)({ after: _isArray3.default })), (0, _constant3.default)(_common.Errors.INVALID_AFTER)], [(0, _negate3.default)((0, _conforms3.default)({
    after: (0, _overSome3.default)(_isEmpty3.default, (0, _partialRight3.default)(_every3.default, (0, _overEvery3.default)(_isString3.default, (0, _negate3.default)((0, _flow3.default)(_trim3.default, _isEmpty3.default)))))
})), (0, _constant3.default)(_common.Errors.INVALID_AFTER)], [(0, _negate3.default)((0, _conforms3.default)({
    targetType: (0, _overSome3.default)(_isFunction3.default, _isString3.default)
})), (0, _constant3.default)(_common.Errors.INVALID_TARGET)], [(0, _negate3.default)((0, _conforms3.default)({
    filter: (0, _conforms3.default)({
        any: _isArray3.default,
        none: _isArray3.default
    })
})), (0, _constant3.default)(_common.Errors.INVALID_FILTER)]]);

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

var Plugin = exports.Plugin = function (_Broker) {
    _inherits(Plugin, _Broker);

    function Plugin(props) {
        _classCallCheck(this, Plugin);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Plugin).call(this));

        (0, _assign3.default)(_this, (0, _defaultsDeep3.default)(props, defaultProps));
        var msg = validateSchema(_this);
        if (!(0, _isEmpty3.default)(msg)) {
            throw new Error(msg);
        }
        _this.after = (0, _uniq3.default)(_this.after);
        _this.filter.any = (0, _uniq3.default)(_this.filter.any);
        _this.filter.none = (0, _uniq3.default)(_this.filter.none);
        return _this;
    }

    /**
     * Events specific to Plugins.
     * @member Plugin.Events
     * @type {Object}
     * @property {String} PLUGIN_CHANGED A property on the plugin has changed.
     *  Emit this event when you wish for any search criteria passed to
     *  Plugins.get to be re-evaluated, with observers notified of any changes.
     */


    _createClass(Plugin, null, [{
        key: 'Events',
        get: function get() {
            return (0, _extend3.default)({
                PLUGIN_CHANGED: 'plugin-changed'
            }, _get(Object.getPrototypeOf(Plugin), 'Events', this));
        }
    }]);

    return Plugin;
}(_cycleEvents.Broker);