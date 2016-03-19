'use strict';

var expect  = require('chai').expect,
    index   = require('../index'),

    DAG     = index.DAG,
    Plugin  = index.Plugin,
    Errors  = index.Errors;

describe('Plugin', function() {
    
    describe('throws if', function() {
    
        [   {name: 'no name (1)', props: undefined, err: Errors.NAME_REQUIRED},
            {name: 'no name (2)', props: {}, err: Errors.NAME_REQUIRED},
            {name: 'non-string name (1)', props: {name: []}, err: Errors.NAME_REQUIRED},
            {name: 'non-string name (2)', props: {name: /rx/}, err: Errors.NAME_REQUIRED},
            {name: 'non-string name (3)', props: {name: Date.now()}, err: Errors.NAME_REQUIRED},
            {name: 'non-string name (4)', props: {name: 123}, err: Errors.NAME_REQUIRED},
            {name: 'empty name', props: {name: ''}, err: Errors.NAME_REQUIRED},
            {name: 'whitespace name', props: {name: '    '}, err: Errors.NAME_REQUIRED},
            {name: 'index not safe integer (1)', props: {name: 'test', index: /rx/}, err: Errors.INVALID_INDEX},
            {name: 'index not safe integer (2)', props: {name: 'test', index: Number.MAX_SAFE_INTEGER + 1}, err: Errors.INVALID_INDEX},
            {name: 'index not safe integer (3)', props: {name: 'test', index: NaN}, err: Errors.INVALID_INDEX},
            {name: 'index not safe integer (4)', props: {name: 'test', index: Infinity}, err: Errors.INVALID_INDEX},
            {name: 'after not an array (1)', props: {name: 'test', after: {}}, err: Errors.INVALID_AFTER},
            {name: 'after not an array (2)', props: {name: 'test', after: /rx/}, err: Errors.INVALID_AFTER},
            {name: 'after not an array (3)', props: {name: 'test', after: 1234}, err: Errors.INVALID_AFTER},
            {name: 'after has an empty string', props: {name: 'test', after: ['a', '']}, err: Errors.INVALID_AFTER},
            {name: 'after has a non-string', props: {name: 'test', after: ['a', 123]}, err: Errors.INVALID_AFTER},
            {name: 'after has a string with only whitespace', props: {name: 'test', after: ['a', '  ']}, err: Errors.INVALID_AFTER},
            {name: 'targetType not a function (1)', props: {name: 'test', targetType: /rx/}, err: Errors.INVALID_TARGET},
            {name: 'targetType not a function (2)', props: {name: 'test', targetType: {}}, err: Errors.INVALID_TARGET},
            {name: 'targetType not a function (3)', props: {name: 'test', targetType: 123}, err: Errors.INVALID_TARGET},
            {name: 'targetType not a function (4)', props: {name: 'test', targetType: null}, err: Errors.INVALID_TARGET},
            {name: 'filter not object literal (1)', props: {name: 'test', filter: 123}, err: Errors.INVALID_FILTER},
            {name: 'filter not object literal (2)', props: {name: 'test', filter: null}, err: Errors.INVALID_FILTER},
            {name: 'filter.any not an array (1)', props: {name: 'test', filter: {any: 123}}, err: Errors.INVALID_FILTER},
            {name: 'filter.any not an array (2)', props: {name: 'test', filter: {any: /rx/}}, err: Errors.INVALID_FILTER},
            {name: 'filter.any not an array (3)', props: {name: 'test', filter: {any: null}}, err: Errors.INVALID_FILTER},
            {name: 'filter.some not an array (1)', props: {name: 'test', filter: {none: 123}}, err: Errors.INVALID_FILTER},
            {name: 'filter.some not an array (2)', props: {name: 'test', filter: {none: /rx/}}, err: Errors.INVALID_FILTER},
            {name: 'filter.some not an array (3)', props: {name: 'test', filter: {none: null}}, err: Errors.INVALID_FILTER}
        ].forEach(function(test) {
            it(test.name, function() {
                expect(function() {
                    new Plugin(test.props);
                }).to.throw(test.err);
            });
        });
        
    });

    it('does not throw if after is empty array', function() {
        expect(function() {
            new Plugin({name: 'test', after: []});
        }).not.to.throw();
    });

    it('does not throw if after has valid strings', function() {
        expect(function() {
            new Plugin({name: 'test', after: ['a', 'b', 'c']});
        }).not.to.throw();
    });

    it('does not throw if filter has empty arrays', function() {
        expect(function() {
            new Plugin({name: 'test', filter: {any: [], some: []}});
        }).not.to.throw();
    });

    it('sets index to 0 if none defined', function() {
        expect(new Plugin({name: 'test'}).index).to.equal(0);
    });
    
    it('sets after to empty array if none defined', function() {
        expect(new Plugin({name: 'test'}).after).to.eql([]);
    });
    
    it('sets enabled to true if none defined', function() {
        expect(new Plugin({name: 'test'}).enabled).to.equal(true);
    });

    it('sets targetType to Object if none defined', function() {
        expect(new Plugin({name: 'test'}).targetType).to.equal(Object);
    });
    
    it('sets filter to default values if none defined', function() {
        expect(new Plugin({name: 'test'}).filter).to.eql({any: [], none: []});
    });
    
    it('uses property values provided', function() {
        var props = {
            name: 'test',
            index: 123,
            after: ['a', 'b', 'c'],
            enabled: false,
            targetType: Error,
            custom: {
                stillExists: true
            },
            filter: {
                any: [2, new Date()],
                none: ['def']
            }
        };
        var plugin = new Plugin(props);
        expect(plugin).to.include.keys(props);
        expect(plugin.custom.stillExists).to.equal(true);
    });

    describe('misc', function() {
        
        it('filter property can be dynamic', function() {

            var callCount = 0,
                values = ['abc', 'def'];

            function PluginChild() {
                Object.defineProperty(this, 'filter', {
                    enumerable: true,
                    get: function() {
                        return values[callCount++];
                    }
                });
            }

            PluginChild.prototype = Plugin;
            PluginChild.prototype.constructor = PluginChild;
            
            var child = new PluginChild(),
                filter1 = child.filter,
                filter2 = child.filter;
            
            expect(filter1).not.to.equal(filter2);
            expect(filter1).to.equal('abc');
            expect(filter2).to.equal('def');
            
        });

        it('enabled property can be dynamic', function() {

            var callCount = 0,
                values = [false, true];

            function PluginChild() {
                Object.defineProperty(this, 'enabled', {
                    enumerable: true,
                    get: function() {
                        return values[callCount++];
                    }
                });
            }

            PluginChild.prototype = Plugin;
            PluginChild.prototype.constructor = PluginChild;
            
            var child = new PluginChild(),
                enabled1 = child.enabled,
                enabled2 = child.enabled;
            
            expect(enabled1).not.to.equal(enabled2);
            expect(enabled1).to.equal(false);
            expect(enabled2).to.equal(true);
            
        });
        
    });

});