'use strict';

var lib = require('../index'),
    DAG = lib.DAG,
    Plugin = lib.Plugin,
    Plugins = lib.Plugins,
    Errors = require('../build/common.js').Errors,
    ChildPlugin = require('../build/ChildPlugin.js').ChildPlugin,
    Observable = require('rxjs').Observable,
    expect = require('chai').expect,
    _ = require('lodash');

describe('Plugins', function() {
    
    afterEach(function clearPlugins() {
        Plugins.clear();
    });
    
    it('has expected static methods', function() {
        ['get', 'register', 'unregister', 'add', 'remove', 'clear']
            .forEach(function(method) {
                expect(Plugins[method]).to.be.a('function');
            });
    });
    
    describe('register', function() {
        
        it('is alias of add', function() {
            expect(Plugins.register).to.equal(Plugins.add);
        });

        it('accepts array of Plugins', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add([a, b]);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });
        
        it('flattens Plugin arguments', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add([[a], [b]]);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });
        
        it('accepts multiple Plugin arguments', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add(a, b);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });
        
        it('ignores non-Plugin arguments', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add(new Date(), a, /rx/, b, 123);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });
        
        it('ignores duplicate Plugins', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add(a, a, b, a, b, b);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });

        it('ignores previously registered Plugins', function() {
            var a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'});
            Plugins.add(a, b);
            Plugins.add(a);
            Plugins.add(b);
            Plugins.get().subscribe(function onNext(plugins) {
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
            }).unsubscribe();
        });

    });
    
    describe('unregister', function() {
        
        it('is alias of remove', function() {
            expect(Plugins.unregister).to.equal(Plugins.remove);
        });
        
        it('updates subscribers if plugin registered', function() {
            var index = 0,
                counts = [2, 1],
                a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'}),
                token = Plugins.get().subscribe(function onNext(plugins) {
                    expect(counts[index++]).to.equal(plugins.length);
                });
            Plugins.add(a, b);
            Plugins.remove(a);
            expect(index).to.equal(counts.length);
            token.unsubscribe();
        });
        
        it('does nothing if plugin was not registered', function() {
            var index = 0,
                counts = [1],
                a = new Plugin({name: 'a'}),
                b = new Plugin({name: 'b'}),
                token = Plugins.get().subscribe(function onNext(plugins) {
                    expect(counts[index++]).to.equal(plugins.length);
                });
            Plugins.add(a);
            Plugins.remove(b);
            expect(index).to.equal(counts.length);
            token.unsubscribe();
        });
    
    });
    
    describe('get', function() {
        
        beforeEach(function setUpSubs() {
            this.subs = [];
        });

        afterEach(function disposeAndCleanUp() {
            var sub = this.subs.shift();
            while(!!sub) {
                sub.unsubscribe();
                sub = this.subs.shift();
            }
        });
        
        function setUpCallback(context, criteria, callback) {
            context.subs.push(Plugins.get(criteria).subscribe(_.bind(callback, context)));
        }
        
        it('returns Observable', function() {
            expect(Plugins.get()).to.respondTo('subscribe');
        });
        
        it('result is array', function() {
            Plugins.add(
                new Plugin({name: 'a'}),
                new Plugin({name: 'b'})
            );
            setUpCallback(this, undefined, function onNext(plugins) {
                expect(plugins).to.be.an('array');
                expect(plugins.length).to.equal(2);
            });
        });

        it('result array is sorted by index', function() {
            Plugins.add(
                new Plugin({name: 'a', index: 2}),
                new Plugin({name: 'b', index: 1}),
                new Plugin({name: 'c', index: 5}),
                new Plugin({name: 'd', index: 3})
            );
            setUpCallback(this, undefined, function onNext(plugins) {
                expect(_.map(plugins, 'name')).to.eql(['b', 'a', 'd', 'c']);
            });
        });
        
        it('result array has toDAG method', function() {
            setUpCallback(this, undefined, function onNext(plugins) {
                expect(plugins).to.respondTo('toDAG');
            });
            Plugins.add(new Plugin({name: 'test'}));
        });
        
        it('result.toDAG returns DAG instance', function() {
            setUpCallback(this, undefined, function onNext(plugins) {
                expect(plugins.toDAG()).to.be.an.instanceof(DAG);
            });
            Plugins.add(new Plugin({name: 'test'}));
        });
        
        it('filters by name', function() {
            Plugins.add(
                new Plugin({name: 'a'}),
                new Plugin({name: 'b'}),
                new Plugin({name: 'c'})
            );
            setUpCallback(this, {name: 'b'}, function onNext(plugins) {
                expect(plugins.length).to.equal(1);
                expect(plugins[0].name).to.equal('b');
            });
        });
        
        it('filters by enabled', function() {
            Plugins.add(
                new Plugin({name: 'a', enabled: true}),
                new Plugin({name: 'b', enabled: false})
            );
            setUpCallback(this, {enabled: false}, function onNext(plugins) {
                expect(plugins.length).to.equal(1);
                expect(plugins[0].name).to.equal('b');
            });
        });
        
        it('default filter returns enabled or disabled', function() {
            Plugins.add(
                new Plugin({name: 'a', enabled: true}),
                new Plugin({name: 'b', enabled: false})
            );
            setUpCallback(this, {}, function onNext(plugins) {
                expect(plugins.length).to.equal(2);
                expect(plugins[0].name).to.equal('a');
                expect(plugins[1].name).to.equal('b');
            });
        });

        it('filters by baseType', function() {
            Plugins.add(
                new Plugin({name: 'a'}),
                new ChildPlugin({name: 'b'})
            );
            setUpCallback(this, {baseType: ChildPlugin}, function onNext(plugins) {
                expect(plugins.length).to.equal(1);
                expect(plugins[0]).to.be.an.instanceof(ChildPlugin);
            });
        });
        
        it('filters by baseType string', function() {
            Plugins.add(
                new Plugin({name: 'a'}),
                new ChildPlugin({name: 'b'})
            );
            setUpCallback(this, {baseType: 'ChildPlugin'}, function onNext(plugins) {
                expect(plugins.length).to.equal(1);
                expect(plugins[0]).to.be.an.instanceof(ChildPlugin);
            });
        });
        
        it('filters by targetType', function() {
            var a = new Plugin({name: 'a', targetType: Error}),
                b = new Plugin({name: 'b', targetType: SyntaxError}),
                c = new Plugin({name: 'c', targetType: TypeError});
            Plugins.add(a, b, c);
            setUpCallback(this, {targetType: Error}, function(plugins) {
                expect(plugins.length).to.equal(1);
                expect(plugins[0]).to.equal(a);
                setUpCallback(this, {targetType: SyntaxError}, function(plugins) {
                    expect(plugins.length).to.equal(2);
                    expect(plugins[0]).to.equal(a);
                    expect(plugins[1]).to.equal(b);
                });
            });
        });
        
        it('throws if targeType is a string', function() {
            expect(function() {
                Plugins.get({targetType: 'Plugin'});
            }).to.throw(Errors.INVALID_CRITERIA_TARGET);
        });
        
        it('filters by filter.any', function() {
            var a = new Plugin({name: 'a', filter: {any: ['a', 'b']}}),
                b = new Plugin({name: 'b', filter: {any: ['b', 123]}}),
                c = new Plugin({name: 'c', filter: {any: ['c', 'a']}});
            Plugins.add(a, b, c);
            setUpCallback(this, {filter: 'b'}, function(plugins) {
                expect(plugins.length).to.equal(2);
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
                setUpCallback(this, {filter: 123}, function(plugins) {
                    expect(plugins.length).to.equal(1);
                    expect(plugins[0]).to.equal(b);
                });
            });
        });
                
        it('filters by filter.none', function() {
            var a = new Plugin({name: 'a', filter: {none: ['a', 'b']}}),
                b = new Plugin({name: 'b', filter: {none: ['b', 123]}}),
                c = new Plugin({name: 'c', filter: {none: ['c', 'a']}});
            Plugins.add(a, b, c);
            setUpCallback(this, {filter: 'c'}, function(plugins) {
                expect(plugins.length).to.equal(2);
                expect(plugins[0]).to.equal(a);
                expect(plugins[1]).to.equal(b);
                setUpCallback(this, {filter: 123}, function(plugins) {
                    expect(plugins.length).to.equal(2);
                    expect(plugins[0]).to.equal(a);
                    expect(plugins[1]).to.equal(c);
                    setUpCallback(this, {filter: 'e'}, function(plugins) {
                        expect(plugins.length).to.equal(3);
                        expect(plugins[0]).to.equal(a);
                        expect(plugins[1]).to.equal(b);
                        expect(plugins[2]).to.equal(c);
                    });
                });
            });
        });
        
        it('updates subscribers only when new matching plugins registered', function() {
            var pluginsSeen = [];
            setUpCallback(this, {filter: 1}, function(plugins) {
                pluginsSeen = plugins;
            });
            expect(pluginsSeen.length).to.equal(0);
            Plugins.add(new Plugin({name: 'a'}));
            expect(pluginsSeen.length).to.equal(0);
            Plugins.add(new Plugin({name: 'b', filter: {any: [1]}}));
            expect(pluginsSeen.length).to.equal(1);
            Plugins.add(new Plugin({name: 'c', filter: {any: [2]}}));
            expect(pluginsSeen.length).to.equal(1);
            Plugins.add(new Plugin({name: 'd', filter: {any: [2], none: [1]}}));
            expect(pluginsSeen.length).to.equal(1);
            Plugins.add(new Plugin({name: 'e', filter: {any: [1]}}));
            expect(pluginsSeen.length).to.equal(2);
        });
        
        it('updates subscribers when plugin changed', function() {
            var index = 0,
                lengths = [1, 0],
                a = new Plugin({name: 'a'});
            setUpCallback(this, {enabled: true}, function(plugins) {
                expect(plugins.length).to.equal(lengths[index++]);
            });
            Plugins.add(a);
            a.enabled = false;
            a.emit(Plugin.CHANGED, 'enabled', true, false);
        });

    });
    
});