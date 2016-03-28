'use strict';

// for testing purposes only
// this file is not exported publicly

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ChildPlugin = undefined;

var _Plugin2 = require('./Plugin.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ChildPlugin = exports.ChildPlugin = function (_Plugin) {
    _inherits(ChildPlugin, _Plugin);

    function ChildPlugin(data) {
        _classCallCheck(this, ChildPlugin);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ChildPlugin).call(this, data));
    }

    return ChildPlugin;
}(_Plugin2.Plugin);