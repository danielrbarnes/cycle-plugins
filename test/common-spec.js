'use strict';

var expect = require('chai').expect,
    _ = require('lodash');

describe('common', function() {
    
    describe('is', function() {

        var is = require('../build/common.js').is,
            error = new Error(),
            syntaxError = new SyntaxError();
        
        [
            {name: 'null - false', item: null, Type: Error, result: false},
            {name: 'undefined - false', item: undefined, Type: Error, result: false},
            {name: 'instance - true', item: syntaxError, Type: Error, result: true},
            {name: 'instance - false', item: error, Type: SyntaxError, result: false},
            {name: 'type name - true', item: syntaxError, Type: 'Error', result: true},
            {name: 'type name - false', item: error, Type: 'SyntaxError', result: false},
            {name: 'type - true', item: SyntaxError, Type: Error, result: true},
            {name: 'type - false', item: Error, Type: SyntaxError, result: false},
            {name: 'instance - true', item: 'SyntaxError', Type: error, result: true},
            {name: 'instance - false', item: 'Error', Type: syntaxError, result: false},
            {name: 'type name - true', item: 'SyntaxError', Type: 'Error', result: true},
            {name: 'type name - false', item: 'Error', Type: 'SyntaxError', result: false},
            {name: 'type - true', item: 'SyntaxError', Type: Error, result: true},
            {name: 'type - false', item: 'Error', Type: SyntaxError, result: false},
        ].forEach(function(test) {
           
            it(test.name, function() {
                expect(is(test.Type)(test.item)).to.equal(test.result);
            });
            
        });

    });
    
    describe('isFilterMatch', function() {
        
        var isFilterMatch = require('../build/common.js').isFilterMatch,
            any = {any: ['a', 'b', 'c']},
            none = {none: ['a', 'b', 'c']};
        
        it('returns false if all filters are empty', function() {
            expect(isFilterMatch({any: [], none: []}, 'something')).to.equal(false);
        });
        
        it('returns true if criteria is undefined', function() {
            expect(isFilterMatch(any)).to.equal(true);
            expect(isFilterMatch(none)).to.equal(true);
        });
        
        it('returns true if only any match', function() {
            expect(isFilterMatch(any, 'a')).to.equal(true);
            expect(isFilterMatch(any, 'b')).to.equal(true);
            expect(isFilterMatch(any, 'c')).to.equal(true);
        });
                
        it('returns false if no any match', function() {
            expect(isFilterMatch(any, 'd')).to.equal(false);
            expect(isFilterMatch(any, 'e')).to.equal(false);
        });
        
        it('returns false if some any match but some none also match', function() {
            expect(isFilterMatch(_.merge({}, any, none), 'b')).to.equal(false);
        });
        
        it('works with non-string values', function() {
            expect(isFilterMatch({any: [1, 2, 3]}, 3)).to.equal(true);
        });
        
    });

});
