'use strict';

var expect = require('chai').expect,
    DAG = require('../index').DAG,
    Plugin = require('../index').Plugin,
    Plugins = require('../index').Plugins;

describe('DAG', function() {
    
    var a = new Plugin({name: 'a'}),
        b = new Plugin({name: 'b', after: ['a'], index: 20}),
        c = new Plugin({name: 'c', after: ['a'], index: 10}),
        d = new Plugin({name: 'd', after: ['?c']}),
        
        e = new Plugin({name: 'e', after: ['f']}),
        f = new Plugin({name: 'f', after: ['e']});
    
    describe('constructor', function() {
        
        it('accepts multiple parameters', function() {
            expect(new DAG(a, b, c, d).toString())
                .to.equal('root : [a : [b : [], c : [d : []]]]');
        });

        it('accepts array', function() {
            expect(new DAG([a, b, c, d]).toString())
                .to.equal('root : [a : [b : [], c : [d : []]]]');
        });

        it('accepts multiple arrays', function() {
            expect(new DAG([a], [b, c], [d]).toString())
                .to.equal('root : [a : [b : [], c : [d : []]]]');
        });

        it('accepts nested arrays', function() {
            expect(new DAG([[a, b], [[c], d]]).toString())
                .to.equal('root : [a : [b : [], c : [d : []]]]');
        });

        it('ignores non-Plugins', function() {
            expect(new DAG(123, a, {}, b, /rx/, c, new Date(), d, null).toString())
                .to.equal('root : [a : [b : [], c : [d : []]]]');
        });

        it('ignores duplicate parameters', function() {
            expect(new DAG(a, b, a, b).toString())
                .to.equal('root : [a : [b : []]]');
        });

        it('throws error if cycle exists', function() {
            expect(function() {
                new DAG(a, e, b, f);
            }).to.throw('Cycle detected between f and e.');
        });
        
        it('throws error if required dependency not in graph', function() {
            expect(function() {
                new DAG(b, c);
            }).to.throw('b must be after a, which does not exist.');
        });
        
        it('does not throw error if optional dependency not in graph', function() {
            expect(function() {
                new DAG(a, b, d);
            }).not.to.throw();
        });
        
    });
    
    describe('forEach', function() {

        function async(name, ms, after) {
            return new Plugin({name: name, exec: function(cb) {
                setTimeout(cb, ms);
            }, after: after || []});
        }

        it('throws if callback is not a function', function() {
            var dag = new DAG(a, b);
            [
                undefined,
                null,
                NaN,
                /rx/,
                'abc',
                12345,
                {}
            ].forEach(function(arg) {
                expect(function() {
                    dag.forEach(arg);
                }).to.throw('Parameter `callback` must be a function.');
            });
        });
        
        it('throws if concurrency is not positive integer', function() {
            var dag = new DAG(a, b);
            [
                null,
                NaN,
                /rx/,
                'abc',
                0,
                -12345,
                {}
            ].forEach(function(arg) {
                expect(function() {
                    dag.forEach(Function.prototype, null, arg);
                }).to.throw('Parameter `concurrency` must be a positive integer.');
            });
        });
        
        it('callback receives correct arguments', function(done) {
            var plugins = [a, c, b],
                percents = [0, 34, 67];
            new DAG(plugins).forEach(function(plugin, next, percent) {
                expect(plugin).to.equal(plugins.shift());
                expect(percent).to.equal(percents.shift());
                next();
            }, function() {
                expect(plugins.length).to.equal(0);
                expect(percents.length).to.equal(0);
                done();
            }, 1);
        });
        
        it('callback percent is correct', function(done) {
            var percents = [0, 25, 50, 75];
            new DAG(a, b, c, d).forEach(function(plugin, next, percent) {
                expect(percent).to.equal(percents.shift());
                next();
            }, done, 1);
        });
        
        it('invokes nodes in correct index order', function(done) {
            var input = [a, b, c],
                output = [a, c, b];
            new DAG(input).forEach(function(plugin, next, percent) {
                expect(plugin).to.equal(output.shift());
                next();
            }, done, 1);
        });
        
        it('does not quit early when queue is empty but more nodes exist', function() {
            var finishCallCount = 0,
                to10 = async('a', 10, ['b']),
                to20 = async('b', 20),
                to60 = async('c', 10),
                to40 = async('d', 40, ['a']);
            new DAG(to10, to20, to40, to60).forEach(function(plugin, next) {
                next();
            }, function() {
                finishCallCount++;
            }, 2);
            expect(finishCallCount).to.equal(1);
        });

        it('attempts max concurrency', function(done) {
            var to10 = async('to10', 10, ['to20']),
                to20 = async('to20', 20),
                to60 = async('to60', 60),
                to40 = async('to40', 40, ['to10']),
                names = ['to20', 'to60', 'to10', 'to40'];
            new DAG(to10, to20, to40, to60).forEach(function(plugin, next) {
                expect(plugin.name).to.equal(names.shift());
                plugin.exec(next);
            }, done);
        });
        
        it('finishes with error if callback throws', function() {
            new DAG(a, b, c, d).forEach(function(plugin, next) {
                if (plugin.name === 'c') {
                    throw new Error();
                }
            }, function(err) {
                expect(err).to.be.an.instanceof(Error);
            });
        });
        
        it('finishes with error if callback calls next with Error instance', function() {
            var expected = [a, c, b, d];
            new DAG(a, b, c, d).forEach(function(plugin, next) {
                expect(plugin).to.equal(expected.shift());
                if (plugin.name === 'c') {
                    next(new Error());
                }
                next();
            }, function(err) {
                expect(expected.length).to.equal(1);
                expect(err).to.be.an.instanceof(Error);
            });
            expect(expected.length).to.equal(2);
        });

        it('finishes with error if callback calls next with anything', function() {
            var expected = [a, c, b];
            new DAG(a, b, c, d).forEach(function(plugin, next) {
                expect(plugin).to.equal(expected.shift());
                if (plugin.name === 'c') {
                    next(123);
                }
                next();
            }, function(res) {
                expect(expected.length).to.equal(1);
                expect(res).to.equal(123);
            });
            expect(expected.length).to.equal(1);
        });

        it('finishes with no arguments if no error occurs', function() {
            new DAG(a, b, c, d).forEach(function(plugin, next) {
                next();
            }, function(arg) {
                /* jshint -W030 */
                expect(arg).to.be.undefined;
            }, 2);
        });
        
        it('finishes with no arguments if no nodes in DAG', function() {
            new DAG().forEach(function() {
                expect('called').to.equal('not called');
            }, function(arg) {
                /* jshint -W030 */
                expect(arg).to.be.undefined;
            }, 2);
        });
        
        it('does not throw if no finish callback provided', function() {
            new DAG(a, b, c, d).forEach(function(plugin, next) {
                next();
            }, null, 2);
        });
        
    });
    
    describe('toArray', function() {
        
        it('returns correct order', function() {
            var arr = new DAG(d, c, b, a).toArray();
            expect(arr.length).to.equal(4);
            expect(arr[0]).to.equal(a);
            expect(arr[1]).to.equal(c);
            expect(arr[2]).to.equal(d);
            expect(arr[3]).to.equal(b);
        });
        
    });
    
    describe('toJSON', function() {

        it('works as expected', function() {
            expect(JSON.stringify(new DAG(a, b, c, d))).to.equal(
                '{"name":"root","children":[{"name":"a","children":' +
                '[{"name":"b","children":[]},{"name":"c","children":' +
                '[{"name":"d","children":[]}]}]}]}'
            );
        });
        
    });
    
});
